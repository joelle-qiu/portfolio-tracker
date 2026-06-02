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

