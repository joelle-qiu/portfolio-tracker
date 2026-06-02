import { create } from 'zustand'
import { db, ensureDefaultInfluencer } from '../services/db'
import { parseExcelFile } from '../services/excelParser'
import type { Holding, Influencer, Snapshot } from '../types'

interface AppState {
  influencers: Influencer[]
  currentInfluencerId: string
  currentSnapshot: Snapshot | null
  snapshots: Snapshot[]
  isImporting: boolean
  importError: string
  initialize: () => Promise<void>
  setCurrentInfluencer: (influencerId: string) => Promise<void>
  addInfluencer: (name: string) => Promise<void>
  importExcelFile: (file: File) => Promise<void>
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

async function loadSnapshotsByInfluencer(influencerId: string): Promise<Snapshot[]> {
  return db.snapshots
    .where('influencerId')
    .equals(influencerId)
    .reverse()
    .sortBy('createTime')
}

export const useStore = create<AppState>((set, get) => ({
  influencers: [],
  currentInfluencerId: '',
  currentSnapshot: null,
  snapshots: [],
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
    const currentSnapshot = snapshots.length ? snapshots[snapshots.length - 1] : null
    set({
      influencers,
      currentInfluencerId: selectedId,
      snapshots,
      currentSnapshot
    })
  },

  setCurrentInfluencer: async (influencerId: string) => {
    const snapshots = await loadSnapshotsByInfluencer(influencerId)
    set({
      currentInfluencerId: influencerId,
      snapshots,
      currentSnapshot: snapshots.length ? snapshots[snapshots.length - 1] : null
    })
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
    const snapshots = await loadSnapshotsByInfluencer(influencer.id)
    set({
      influencers,
      currentInfluencerId: influencer.id,
      snapshots,
      currentSnapshot: snapshots.length ? snapshots[snapshots.length - 1] : null
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

      const snapshots = await loadSnapshotsByInfluencer(influencerId)
      set({
        snapshots,
        currentSnapshot: snapshots.length ? snapshots[snapshots.length - 1] : snapshot,
        isImporting: false
      })
    } catch (error) {
      set({
        isImporting: false,
        importError: error instanceof Error ? error.message : 'Excel 导入失败，请检查文件格式。'
      })
    }
  }
}))

