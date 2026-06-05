import type { Holding } from '../types'

function tierFromGroup(group: string): number | undefined {
  const m = group.match(/TOPO?([1-6])/i)
  if (m) return Number.parseInt(m[1], 10)
  return undefined
}

/**
 * 解析 TOP 层级（仅使用显式字段，不做序号兜底猜测）。
 */
export function resolveHoldingTier(stock: Holding): number | undefined {
  if (stock.poolType === 'config') return undefined
  if (stock.holdingTier !== undefined) return stock.holdingTier
  return tierFromGroup(stock.group)
}

/**
 * 批量补全 holdingTier（不猜测序号，避免错层）。
 */
export function enrichHoldingsWithTier(stocks: Holding[]): Holding[] {
  return stocks.map((stock) => {
    if (stock.poolType === 'config') {
      return stock.holdingTier === undefined ? stock : { ...stock, holdingTier: undefined }
    }
    if (stock.holdingTier !== undefined) return stock
    const tier = tierFromGroup(stock.group)
    if (tier === undefined) return stock
    return { ...stock, holdingTier: tier }
  })
}

export function stockKey(stock: Pick<Holding, 'stockName' | 'stockCode'>): string {
  return stock.stockName.trim() || stock.stockCode.trim()
}
