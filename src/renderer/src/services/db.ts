import Dexie, { type Table } from 'dexie'
import type { Holding, Influencer, PriceQuote, Snapshot, StockAnalysis } from '../types'

/**
 * Portfolio Tracker 本地数据库。
 */
export class PortfolioDB extends Dexie {
  influencers!: Table<Influencer, string>
  snapshots!: Table<Snapshot, string>
  holdings!: Table<Holding, string>
  stockAnalyses!: Table<StockAnalysis, string>
  priceQuotes!: Table<PriceQuote, string>

  constructor() {
    super('portfolio-tracker-db')

    this.version(1).stores({
      influencers: 'id, name, createdAt',
      snapshots: 'id, influencerId, version, createTime',
      holdings: 'id, snapshotId, stockCode, stockName, group, status',
      stockAnalyses: 'id, influencerId, stockCode, stockName, timestamp, sourceType',
      priceQuotes: '[stockCode+timestamp], stockCode, timestamp'
    })
  }
}

export const db = new PortfolioDB()

function normalizeInfluencerName(name: string): string {
  return name.trim().toLowerCase()
}

/**
 * 初始化默认博主（幂等）。
 */
export async function ensureDefaultInfluencer(): Promise<Influencer> {
  return db.transaction('rw', db.influencers, db.snapshots, db.stockAnalyses, async () => {
    const all = await db.influencers.toArray()
    const defaultLike = all.filter((item) => item.name === '八喜' || item.name === '老陈')

    let canonical: Influencer
    if (defaultLike.length > 0) {
      canonical = {
        ...defaultLike[0],
        name: '八喜',
        styleTags: defaultLike[0].styleTags?.length ? defaultLike[0].styleTags : ['左侧交易', '周期配置'],
        techFeatures: defaultLike[0].techFeatures || '注重仓位控制、均线支撑位埋伏、趋势回踩加仓'
      }
      await db.influencers.put(canonical)

      const duplicateIds = defaultLike
        .filter((item) => item.id !== canonical.id)
        .map((item) => item.id)

      if (duplicateIds.length > 0) {
        const snapshots = await db.snapshots.where('influencerId').anyOf(duplicateIds).toArray()
        for (const snapshot of snapshots) {
          await db.snapshots.put({ ...snapshot, influencerId: canonical.id })
        }

        const analyses = await db.stockAnalyses.where('influencerId').anyOf(duplicateIds).toArray()
        for (const analysis of analyses) {
          await db.stockAnalyses.put({ ...analysis, influencerId: canonical.id })
        }

        await db.influencers.bulkDelete(duplicateIds)
      }
    } else {
      canonical = {
        id: crypto.randomUUID(),
        name: '八喜',
        styleTags: ['左侧交易', '周期配置'],
        techFeatures: '注重仓位控制、均线支撑位埋伏、趋势回踩加仓',
        createdAt: new Date().toISOString()
      }
      await db.influencers.add(canonical)
    }

    // 对其余用户按名称去重（保留最早一条），防止下拉出现重复项。
    const current = await db.influencers.toArray()
    const byName = new Map<string, Influencer>()
    for (const influencer of current) {
      const key = normalizeInfluencerName(influencer.name)
      const existing = byName.get(key)
      if (!existing) {
        byName.set(key, influencer)
        continue
      }
      const keep = new Date(existing.createdAt).getTime() <= new Date(influencer.createdAt).getTime() ? existing : influencer
      const drop = keep.id === existing.id ? influencer : existing
      byName.set(key, keep)

      const snapshots = await db.snapshots.where('influencerId').equals(drop.id).toArray()
      for (const snapshot of snapshots) {
        await db.snapshots.put({ ...snapshot, influencerId: keep.id })
      }

      const analyses = await db.stockAnalyses.where('influencerId').equals(drop.id).toArray()
      for (const analysis of analyses) {
        await db.stockAnalyses.put({ ...analysis, influencerId: keep.id })
      }

      await db.influencers.delete(drop.id)
      if (drop.id === canonical.id) {
        canonical = keep.id === canonical.id ? canonical : { ...canonical, id: keep.id }
      }
    }

    return canonical
  })
}

