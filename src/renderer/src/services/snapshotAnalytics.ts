import type { Holding, HoldingsTrendPoint, Snapshot, SnapshotDiff, SnapshotDiffKind, StockDiffEntry } from '../types'
import { enrichHoldingsWithTier, resolveHoldingTier, stockKey } from '../utils/tierInference'

function sortSnapshots(snapshots: Snapshot[]): Snapshot[] {
  return [...snapshots].sort(
    (a, b) => new Date(a.createTime).getTime() - new Date(b.createTime).getTime()
  )
}

function indexByName(stocks: Holding[]): Map<string, Holding> {
  const map = new Map<string, Holding>()
  for (const s of enrichHoldingsWithTier(stocks)) {
    map.set(stockKey(s), s)
  }
  return map
}

function tierOf(stock: Holding): number | undefined {
  return resolveHoldingTier(stock)
}

/**
 * 对比两个快照的持仓差异。
 */
export function compareSnapshots(prev: Snapshot | null, curr: Snapshot): SnapshotDiff {
  const empty: SnapshotDiff = {
    added: [],
    removed: [],
    tierChanged: [],
    operationChanged: [],
    poolChanged: [],
    byStock: new Map()
  }
  if (!prev) return empty

  const prevMap = indexByName(prev.stocks)
  const currMap = indexByName(curr.stocks)
  const allNames = new Set([...prevMap.keys(), ...currMap.keys()])

  const added: string[] = []
  const removed: string[] = []
  const tierChanged: StockDiffEntry[] = []
  const operationChanged: StockDiffEntry[] = []
  const poolChanged: StockDiffEntry[] = []
  const byStock = new Map<string, SnapshotDiffKind>()

  for (const name of allNames) {
    const p = prevMap.get(name)
    const c = currMap.get(name)

    if (!p && c) {
      added.push(name)
      byStock.set(name, 'added')
      continue
    }
    if (p && !c) {
      removed.push(name)
      byStock.set(name, 'removed')
      continue
    }
    if (!p || !c) continue

    const pt = tierOf(p)
    const ct = tierOf(c)
    if (pt !== ct && (pt !== undefined || ct !== undefined)) {
      const kind: SnapshotDiffKind =
        pt !== undefined && ct !== undefined
          ? ct < pt
            ? 'tier_up'
            : 'tier_down'
          : ct !== undefined
            ? 'tier_up'
            : 'tier_down'
      tierChanged.push({
        stockName: name,
        kind,
        prevTier: pt,
        currTier: ct
      })
      byStock.set(name, kind)
      continue
    }

    if (p.operation !== c.operation) {
      operationChanged.push({
        stockName: name,
        kind: 'operation',
        prevOperation: p.operation,
        currOperation: c.operation
      })
      byStock.set(name, 'operation')
      continue
    }

    if (p.poolType !== c.poolType) {
      poolChanged.push({
        stockName: name,
        kind: 'pool',
        prevOperation: p.poolType,
        currOperation: c.poolType
      })
      byStock.set(name, 'pool')
      continue
    }

    byStock.set(name, 'unchanged')
  }

  return { added, removed, tierChanged, operationChanged, poolChanged, byStock }
}

/**
 * 构建多版本持仓趋势序列。
 */
export function buildHoldingsTrend(snapshots: Snapshot[]): HoldingsTrendPoint[] {
  return sortSnapshots(snapshots).map((snap) => {
    const stocks = enrichHoldingsWithTier(snap.stocks)
    const topCounts: Record<number, number> = {}
    for (const s of stocks) {
      const t = tierOf(s)
      if (t !== undefined) topCounts[t] = (topCounts[t] ?? 0) + 1
    }
    return {
      version: snap.version,
      createTime: snap.createTime,
      total: stocks.filter((s) => s.status === 'holding').length,
      core: stocks.filter((s) => s.poolType === 'core').length,
      config: stocks.filter((s) => s.poolType === 'config').length,
      watch: stocks.filter((s) => s.poolType === 'watch').length,
      research: stocks.filter((s) => s.poolType === 'research').length,
      topCounts
    }
  })
}

export function getPreviousSnapshot(snapshots: Snapshot[], currentId: string): Snapshot | null {
  const sorted = sortSnapshots(snapshots)
  const idx = sorted.findIndex((s) => s.id === currentId)
  if (idx <= 0) return null
  return sorted[idx - 1] ?? null
}

export function getTierLayers(stocks: Holding[]): Array<{ tier: number; items: Holding[] }> {
  const enriched = enrichHoldingsWithTier(stocks)
  const tierMap = new Map<number, Holding[]>()
  for (const stock of enriched) {
    if (stock.poolType === 'config') continue
    const tier = tierOf(stock)
    if (tier === undefined) continue
    const arr = tierMap.get(tier) ?? []
    arr.push(stock)
    tierMap.set(tier, arr)
  }
  return Array.from(tierMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([tier, items]) => ({ tier, items }))
}
