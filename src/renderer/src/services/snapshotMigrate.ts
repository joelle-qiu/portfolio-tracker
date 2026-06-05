import { db } from './db'
import type { Holding, Snapshot } from '../types'
import { buildHoldingMetrics } from '../utils/parserHelpers'
import { enrichHoldingsWithTier } from '../utils/tierInference'
import { findTierForStock, isConfigStock, parseTopTierHintsFromIntro } from '../utils/topTierMapping'

function stockChanged(before: Holding, after: Holding): boolean {
  return (
    before.metrics !== after.metrics ||
    before.holdingTier !== after.holdingTier ||
    before.poolType !== after.poolType
  )
}

function applyIntroMapping(stock: Holding, introText: string): Holding {
  const { tierByStock, configStocks } = parseTopTierHintsFromIntro(introText)
  const inConfig = isConfigStock(stock.stockName, configStocks)
  const tier = inConfig ? undefined : findTierForStock(stock.stockName, tierByStock)

  return {
    ...stock,
    poolType: inConfig ? 'config' : tier !== undefined ? 'core' : stock.poolType,
    holdingTier: tier,
    status: inConfig || tier !== undefined ? 'holding' : stock.status
  }
}

function cleanupStock(stock: Holding, introText?: string): Holding {
  let next = introText ? applyIntroMapping(stock, introText) : { ...stock }

  if (!next.metrics) {
    next.metrics = buildHoldingMetrics({
      operation: next.operation,
      reasonBrief: next.reasonBrief,
      longTermView: next.longTermView,
      shortTermView: next.shortTermView,
      techSignal: next.techSignal,
      stopLoss: next.stopLoss,
      shortTarget: next.shortTarget,
      support: next.support
    })
  }

  // 配置仓不得出现在 TOP 阶梯
  if (next.poolType === 'config') {
    next.holdingTier = undefined
    return next
  }

  // 非核心仓不应保留 TOP 层级（清理旧版序号兜底脏数据）
  if (next.poolType !== 'core' && next.holdingTier !== undefined) {
    next.holdingTier = undefined
  }

  return next
}

/**
 * 对旧快照补全 metrics / 修正 TOP·配置仓归类并写回 DB。
 */
export async function migrateLegacySnapshots(snapshots: Snapshot[]): Promise<Snapshot[]> {
  const migrated: Snapshot[] = []
  let dirty = false

  for (const snap of snapshots) {
    const cleaned = snap.stocks.map((s) => cleanupStock(s, snap.positionSummary))
    const withTier = enrichHoldingsWithTier(cleaned)
    const changed = withTier.some((h, i) => stockChanged(snap.stocks[i], h))

    if (!changed) {
      migrated.push(snap)
      continue
    }

    const nextSnap: Snapshot = { ...snap, stocks: withTier }
    migrated.push(nextSnap)
    dirty = true

    await db.transaction('rw', db.snapshots, db.holdings, async () => {
      await db.snapshots.put(nextSnap)
      for (const h of withTier) {
        await db.holdings.put(h)
      }
    })
  }

  if (dirty) {
    console.info('[snapshotMigrate] cleaned legacy holdings metadata')
  }

  return migrated
}
