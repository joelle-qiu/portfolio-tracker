import type { HoldingMetrics, OperationType, TrendType, MaSignalType, RiskLevel } from '../types'

export interface ExtractedPricePoints {
  stopLoss?: number
  shortTarget?: number
  longTarget?: number
  support?: number
}

export type ParsedPoolType = 'core' | 'config' | 'watch' | 'research'

function parseFirstNumber(input: string): number | undefined {
  const match = input.match(/(\d+(?:\.\d+)?)/)
  if (!match) return undefined
  return Number.parseFloat(match[1])
}

/**
 * 从短期文本中提取关键价位（止损/目标/支撑）。
 */
export function extractPricePoints(text: string): ExtractedPricePoints {
  const normalized = text.replace(/\s+/g, '')

  const stopLossMatch =
    normalized.match(/止损(?:点|位)?(?:在|为)?(\d+(?:\.\d+)?)/) ??
    normalized.match(/跌破(\d+(?:\.\d+)?)需?止损/)
  const supportMatch = normalized.match(/(?:支撑位?|强支撑|支撑点)(?:在|为)?(\d+(?:\.\d+)?)/)

  const shortTargetMatch =
    normalized.match(/短期(?:目标价?|止盈)?(?:在|看|至|到)?(\d+(?:\.\d+)?)/) ??
    normalized.match(/(?:止盈|目标价?)(?:在|看|至|到)?(\d+(?:\.\d+)?)/)

  const longTargetMatch = normalized.match(/长期(?:目标价?|看至|看)(\d+(?:\.\d+)?)/)

  return {
    stopLoss: stopLossMatch ? parseFirstNumber(stopLossMatch[0]) : undefined,
    support: supportMatch ? parseFirstNumber(supportMatch[0]) : undefined,
    shortTarget: shortTargetMatch ? parseFirstNumber(shortTargetMatch[0]) : undefined,
    longTarget: longTargetMatch ? parseFirstNumber(longTargetMatch[0]) : undefined
  }
}

/**
 * 依据分组关键词推断池子名。
 */
export function inferGroupByKeywords(input: string): string {
  const text = input.trim()
  if (!text) return ''

  if (/(核心|top|TOP)/i.test(text)) return '核心持仓'
  if (/(配置|仓位|防守)/.test(text)) return '配置仓'
  if (/(关注|储备|研究|观测)/.test(text)) return '研究池'
  return text
}

/**
 * 依据分组文案和操作状态推断池子类型（用于 Tab 精确过滤）。
 */
export function inferPoolType(
  group: string,
  operation: string,
  status: 'holding' | 'researched'
): ParsedPoolType {
  const text = `${group} ${operation}`.trim()
  if (/(核心|TOP|top)/.test(text)) return 'core'
  if (/(配置|防守|仓位)/.test(text)) return 'config'
  if (/(关注|观测)/.test(text)) return 'watch'
  if (/(研究|储备)/.test(text)) return 'research'
  if (status === 'researched') return 'research'
  return 'core'
}

/**
 * 按操作推断持仓状态。
 */
export function inferHoldingStatus(operation: string): 'holding' | 'researched' {
  const value = operation.trim()
  if (!value || value === '-' || /(清仓|止损出|卖出完)/.test(value)) return 'researched'
  return 'holding'
}

function truncateThesis(text: string, maxLen = 20): string {
  const cleaned = text.replace(/\s+/g, '').trim()
  if (!cleaned) return ''
  const first = cleaned.split(/[。；;，,]/)[0] ?? cleaned
  return first.length > maxLen ? `${first.slice(0, maxLen)}…` : first
}

function inferOperationType(operation: string): OperationType {
  const v = operation.trim()
  if (/(买入|建仓)/.test(v)) return 'buy'
  if (/(加仓)/.test(v)) return 'add'
  if (/(减仓)/.test(v)) return 'reduce'
  if (/(清仓|卖出|止损出)/.test(v)) return 'sell'
  if (/(观测|关注)/.test(v)) return 'watch'
  return 'hold'
}

function inferTrend(shortTerm: string, tech: string): TrendType {
  const text = `${shortTerm} ${tech}`
  if (/(突破|上行|走强|新高|向上)/.test(text)) return 'up'
  if (/(破位|下行|走弱|跌破|回落)/.test(text)) return 'down'
  if (/(震荡|盘整|横盘|区间)/.test(text)) return 'range'
  return 'unknown'
}

function inferMaSignal(shortTerm: string, tech: string): MaSignalType {
  const text = `${shortTerm} ${tech}`
  if (/(跌破10日|破10日|失守10日)/.test(text)) return 'below_ma10'
  if (/(不破5日|站上5日|5日线上|位于5日线上方)/.test(text)) return 'above_ma5'
  if (/(5日线|10日线|均线)/.test(text)) return 'neutral'
  return 'neutral'
}

function extractTechTags(tech: string): string[] {
  const tags: string[] = []
  const patterns: Array<[RegExp, string]> = [
    [/MACD金叉/, 'MACD金叉'],
    [/MACD死叉/, 'MACD死叉'],
    [/RSI底背离/, 'RSI底背离'],
    [/RSI顶背离/, 'RSI顶背离'],
    [/金叉/, '金叉'],
    [/死叉/, '死叉'],
    [/底背离/, '底背离'],
    [/顶背离/, '顶背离'],
    [/放量/, '放量'],
    [/缩量/, '缩量']
  ]
  for (const [re, label] of patterns) {
    if (re.test(tech) && !tags.includes(label)) tags.push(label)
  }
  return tags.slice(0, 3)
}

function inferRisk(shortTerm: string, tech: string, stopLoss?: number): RiskLevel {
  const text = `${shortTerm} ${tech}`
  if (/(高风险|谨慎|破位|止损)/.test(text)) return 'high'
  if (stopLoss !== undefined) return 'medium'
  if (/(稳健|低风险|防守)/.test(text)) return 'low'
  return 'medium'
}

function buildBuyPointHint(
  shortTerm: string,
  tech: string,
  prices: ExtractedPricePoints
): string {
  const text = `${shortTerm} ${tech}`
  if (/(破位|跌破止损)/.test(text)) return '破位谨慎'
  if (prices.support !== undefined && /(支撑|回踩|埋伏)/.test(text)) return '接近支撑可埋伏'
  if (/(不破5日|5日线上)/.test(text)) return '不破5日线偏强'
  if (/(跌破10日|破10日)/.test(text)) return '跌破10日线考虑撤退'
  if (/(止盈|接近目标|勿追高)/.test(text)) return '接近目标勿追高'
  if (/(均线|回踩)/.test(text)) return '等待回踩均线'
  return '趋势观察'
}

export interface MetricsInput {
  operation: string
  reasonBrief: string
  longTermView: string
  shortTermView: string
  techSignal: string
  stopLoss?: number
  shortTarget?: number
  support?: number
}

/**
 * 从持仓原文构建结构化指标。
 */
export function buildHoldingMetrics(input: MetricsInput): HoldingMetrics {
  const prices = extractPricePoints(input.shortTermView)
  const thesisSource = input.reasonBrief || input.longTermView || input.shortTermView

  return {
    operationType: inferOperationType(input.operation),
    trend: inferTrend(input.shortTermView, input.techSignal),
    maSignal: inferMaSignal(input.shortTermView, input.techSignal),
    risk: inferRisk(input.shortTermView, input.techSignal, input.stopLoss ?? prices.stopLoss),
    thesis: truncateThesis(thesisSource),
    techTags: extractTechTags(input.techSignal),
    buyPointHint: buildBuyPointHint(input.shortTermView, input.techSignal, {
      ...prices,
      stopLoss: input.stopLoss ?? prices.stopLoss,
      support: input.support ?? prices.support,
      shortTarget: input.shortTarget ?? prices.shortTarget
    })
  }
}

