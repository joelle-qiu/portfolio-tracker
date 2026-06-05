import { create } from 'zustand'
import { db, ensureDefaultInfluencer } from '../services/db'
import { parseExcelFile } from '../services/excelParser'
import { getPreviousSnapshot } from '../services/snapshotAnalytics'
import { migrateLegacySnapshots } from '../services/snapshotMigrate'
import type { Holding, Influencer, Snapshot, SnapshotDiffKind } from '../types'

export type DiffFilter = SnapshotDiffKind | 'all'

interface AppState {
  influencers: Influencer[]
  currentInfluencerId: string
  currentSnapshot: Snapshot | null
  snapshots: Snapshot[]
  diffFilter: DiffFilter
  isImporting: boolean
  importError: string
  initialize: () => Promise<void>
  setCurrentInfluencer: (influencerId: string) => Promise<void>
  setCurrentSnapshotById: (snapshotId: string) => void
  setDiffFilter: (filter: DiffFilter) => void
  addInfluencer: (name: string) => Promise<void>
  importExcelFile: (file: File) => Promise<void>
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

async function loadSnapshotsByInfluencer(influencerId: string): Promise<Snapshot[]> {
  const raw = await db.snapshots
    .where('influencerId')
    .equals(influencerId)
    .reverse()
    .sortBy('createTime')
  return migrateLegacySnapshots(raw)
}

function sortSnapshotsAsc(snapshots: Snapshot[]): Snapshot[] {
  return [...snapshots].sort(
    (a, b) => new Date(a.createTime).getTime() - new Date(b.createTime).getTime()
  )
}

export const useStore = create<AppState>((set, get) => ({
  influencers: [],
  currentInfluencerId: '',
  currentSnapshot: null,
  snapshots: [],
  diffFilter: 'all',
  isImporting: false,
  importError: '',

  initialize: async () => {
    const defaultInfluencer = await ensureDefaultInfluencer()
    const influencers = await db.influencers.toArray()
    influencers.sort((a, b) => {
      if (a.name === '八喜' && b.name !== '八喜') return -1
      if (b.name === '八喜' && a.name !== '八喜') return 1
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
    const preferred = influencers.find((item) => item.name === '八喜')
    const selectedId = preferred?.id ?? defaultInfluencer.id
    const snapshots = await loadSnapshotsByInfluencer(selectedId)
    const sorted = sortSnapshotsAsc(snapshots)
    const currentSnapshot = sorted.length ? sorted[sorted.length - 1] : null
    set({
      influencers,
      currentInfluencerId: selectedId,
      snapshots: sorted,
      currentSnapshot,
      diffFilter: 'all'
    })
  },

  setCurrentInfluencer: async (influencerId: string) => {
    const snapshots = sortSnapshotsAsc(await loadSnapshotsByInfluencer(influencerId))
    set({
      currentInfluencerId: influencerId,
      snapshots,
      currentSnapshot: snapshots.length ? snapshots[snapshots.length - 1] : null,
      diffFilter: 'all'
    })
  },

  setCurrentSnapshotById: (snapshotId: string) => {
    const snap = get().snapshots.find((s) => s.id === snapshotId) ?? null
    set({ currentSnapshot: snap, diffFilter: 'all' })
  },

  setDiffFilter: (filter: DiffFilter) => {
    set({ diffFilter: filter })
  },

  addInfluencer: async (name: string) => {
    const safeName = name.trim()
    if (!safeName) return

    const allInfluencers = await db.influencers.toArray()
    const duplicate = allInfluencers.find((item) => normalizeName(item.name) === normalizeName(safeName))
    const influencer =
      duplicate ??
      ({
        id: crypto.randomUUID(),
        name: safeName,
        styleTags: [],
        techFeatures: '',
        createdAt: new Date().toISOString()
      } as Influencer)

    if (!duplicate) {
      await db.influencers.add(influencer)
    }

    const influencers = await db.influencers.toArray()
    influencers.sort((a, b) => {
      if (a.name === '八喜' && b.name !== '八喜') return -1
      if (b.name === '八喜' && a.name !== '八喜') return 1
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
    const snapshots = sortSnapshotsAsc(await loadSnapshotsByInfluencer(influencer.id))
    set({
      influencers,
      currentInfluencerId: influencer.id,
      snapshots,
      currentSnapshot: snapshots.length ? snapshots[snapshots.length - 1] : null,
      diffFilter: 'all'
    })
  },

  importExcelFile: async (file: File) => {
    const influencerId = get().currentInfluencerId
    if (!influencerId) {
      set({ importError: '请先选择博主后再导入。' })
      return
    }

    set({ isImporting: true, importError: '' })
    try {
      const arrayBuffer = await file.arrayBuffer()
      const snapshot = parseExcelFile(arrayBuffer, influencerId)

      await db.transaction('rw', db.snapshots, db.holdings, async () => {
        await db.snapshots.add(snapshot)
        await db.holdings.bulkAdd(snapshot.stocks as Holding[])
      })

      const snapshots = sortSnapshotsAsc(await loadSnapshotsByInfluencer(influencerId))
      set({
        snapshots,
        currentSnapshot: snapshots.length ? snapshots[snapshots.length - 1] : snapshot,
        isImporting: false,
        diffFilter: 'all'
      })
    } catch (error) {
      set({
        isImporting: false,
        importError: error instanceof Error ? error.message : 'Excel 导入失败，请检查文件格式。'
      })
    }
  }
}))

export function usePreviousSnapshot(): Snapshot | null {
  const snapshots = useStore((s) => s.snapshots)
  const current = useStore((s) => s.currentSnapshot)
  if (!current) return null
  return getPreviousSnapshot(snapshots, current.id)
}
