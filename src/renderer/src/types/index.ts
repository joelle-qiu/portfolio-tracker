/**
 * 博主信息。
 */
export interface Influencer {
  id: string
  name: string
  styleTags: string[]
  techFeatures: string
  createdAt: string
}

/**
 * 持仓状态。
 */
export type HoldingStatus = 'holding' | 'researched'
export type PoolType = 'core' | 'config' | 'watch' | 'research' | 'all'

/**
 * 持仓条目。
 */
export interface Holding {
  id: string
  snapshotId: string
  stockCode: string
  stockName: string
  operation: string
  status: HoldingStatus
  poolType: Exclude<PoolType, 'all'>
  group: string
  industryL4: string
  industryL1: string
  stopLoss?: number
  shortTarget?: number
  longTarget?: number
  support?: number
  holdingTier?: number
  techSignal: string
  reasonBrief: string
  longTermView: string
  shortTermView: string
  fundamentals: string
}

/**
 * 每次导入后的快照。
 */
export interface Snapshot {
  id: string
  influencerId: string
  version: string
  stocks: Holding[]
  summary: string
  createTime: string
}

/**
 * 分析图片信息（形态1：同一分析可挂多图）。
 */
export interface AnalysisImage {
  sheet: string
  imageCell: string
  stockCell: string
  file: string
  mediaInZip?: string
  pictureName?: string
  confidence: number
}

/**
 * 个股分析记录。
 */
export interface StockAnalysis {
  id: string
  influencerId: string
  stockCode: string
  stockName: string
  timestamp: string
  sourceType: 'excel' | 'image' | 'text'
  rawContent: string
  extractedShortTerm: string
  extractedLongTerm: string
  keyPrices: number[]
  techSignal: string
  trendSummary: string
  riskLevel: 'low' | 'medium' | 'high' | 'unknown'
  images: AnalysisImage[]
}

/**
 * 行情数据（预留）。
 */
export interface PriceQuote {
  stockCode: string
  timestamp: string
  price: number
  change: number
  volume: number
  pe?: number
  pb?: number
}

