import * as XLSX from 'xlsx'
import type { Holding, Snapshot } from '../types'
import {
  extractPricePoints,
  inferGroupByKeywords,
  inferHoldingStatus,
  inferPoolType
} from '../utils/parserHelpers'

interface HeaderMap {
  stockName: number
  operation: number
  industryL4: number
  industryL1: number
  reason: number
  longTerm: number
  shortTerm: number
  fundamentals: number
  tech: number
}

const REQUIRED_HEADERS: Array<{ key: keyof HeaderMap; text: string }> = [
  { key: 'stockName', text: '证券名称' },
  { key: 'operation', text: '近期操作' },
  { key: 'industryL4', text: '行业（四级）' },
  { key: 'industryL1', text: '行业（一级）' },
  { key: 'reason', text: '看好原因' },
  { key: 'longTerm', text: '中长期思考' },
  { key: 'shortTerm', text: '短期思考' },
  { key: 'fundamentals', text: '近期基本面跟踪' },
  { key: 'tech', text: '技术面分析' }
]

function normalizeCell(value: unknown): string {
  return String(value ?? '')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, '')
    .trim()
}

function isLikelyGroupTitle(row: unknown[], header: HeaderMap): boolean {
  const colA = String(row[0] ?? '').trim()
  const stock = String(row[header.stockName] ?? '').trim()
  const operation = String(row[header.operation] ?? '').trim()

  if (!colA || stock || operation) return false
  if (/^\d+$/.test(colA)) return false
  return /(方向|板块|池|进攻|防守|消费|新能源|科技|化工|有色)/.test(colA)
}

function parseVersionFromSheetName(sheetName: string): string {
  const matched = sheetName.match(/(\d{8})/)
  if (!matched) return new Date().toISOString().slice(0, 10)
  const raw = matched[1]
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
}

function detectHeader(rows: unknown[][]): { rowIndex: number; map: HeaderMap } {
  for (let r = 0; r < Math.min(rows.length, 20); r += 1) {
    const row = rows[r] ?? []
    const normalizedRow = row.map((cell) => normalizeCell(cell))
    const map: Partial<HeaderMap> = {}

    for (const item of REQUIRED_HEADERS) {
      const index = normalizedRow.findIndex((value) => value.includes(normalizeCell(item.text)))
      if (index >= 0) map[item.key] = index
    }

    if (REQUIRED_HEADERS.every((item) => map[item.key] !== undefined)) {
      return { rowIndex: r, map: map as HeaderMap }
    }
  }
  throw new Error('未识别到有效表头（请确认包含证券名称、近期操作等列）')
}

function normalizeStockNameForMatch(name: string): string {
  const text = name.replace(/\s+/g, '')
  if (text === '厦钨') return '厦门钨业'
  return text
}

function parseTopTierHints(rows: unknown[][], headerRowIndex: number): {
  tierByStock: Map<string, number>
  configStocks: Set<string>
} {
  const introText = rows
    .slice(0, headerRowIndex)
    .map((row) => String(row[1] ?? row[0] ?? '').trim())
    .join('\n')

  const tierByStock = new Map<string, number>()
  const configStocks = new Set<string>()

  const topRegex = /TOP\s*([1-6])[:：]\s*([\s\S]*?)(?=TOP\s*[1-6][:：]|配置仓|总仓位|$)/gi
  const cnTokenRegex = /[\u4e00-\u9fa5A-Za-z]{2,}/g
  let match: RegExpExecArray | null = topRegex.exec(introText)
  while (match) {
    const tier = Number.parseInt(match[1], 10)
    const block = match[2] ?? ''
    const tokens = block.match(cnTokenRegex) ?? []
    tokens.forEach((token) => {
      const key = normalizeStockNameForMatch(token)
      // 跳过主题词，保留疑似股票名。
      if (/(碳酸锂|仓位|控制|思路|长期|继续|看好)/.test(key)) return
      if (!tierByStock.has(key)) tierByStock.set(key, tier)
    })
    match = topRegex.exec(introText)
  }

  const cfgMatch = introText.match(/配置仓[\s\S]*?[:：]\s*([\s\S]*?)(?=总仓位|此外|Norecomend|$)/i)
  if (cfgMatch?.[1]) {
    const tokens = cfgMatch[1].match(cnTokenRegex) ?? []
    tokens.forEach((token) => {
      const key = normalizeStockNameForMatch(token)
      if (!/(超长期|配置仓|长期|总仓位)/.test(key)) configStocks.add(key)
    })
  }

  return { tierByStock, configStocks }
}

/**
 * 解析 Excel 持仓表，输出 Snapshot（包含 holdings）。
 */
export function parseExcelFile(arrayBuffer: ArrayBuffer, influencerId: string): Snapshot {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) throw new Error('Excel 文件没有可解析的 sheet')

  const sheet = workbook.Sheets[firstSheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' }) as unknown[][]
  const { rowIndex: headerRowIndex, map } = detectHeader(rows)
  const { tierByStock, configStocks } = parseTopTierHints(rows, headerRowIndex)

  const snapshotId = crypto.randomUUID()
  const version = parseVersionFromSheetName(firstSheetName)
  const holdings: Holding[] = []

  let currentGroup = ''
  for (let r = headerRowIndex + 1; r < rows.length; r += 1) {
    const row = rows[r] ?? []
    const stockName = String(row[map.stockName] ?? '').trim()
    const operation = String(row[map.operation] ?? '').trim()

    if (isLikelyGroupTitle(row, map)) {
      currentGroup = inferGroupByKeywords(String(row[0] ?? '').trim())
      continue
    }

    if (!stockName) continue

    const shortTermText = String(row[map.shortTerm] ?? '').trim()
    const extracted = extractPricePoints(shortTermText)
    const normalizedStock = normalizeStockNameForMatch(stockName)
    const hasTopTier = tierByStock.has(normalizedStock)
    const inConfig = configStocks.has(normalizedStock)
    const baseStatus = inferHoldingStatus(operation)
    const status = hasTopTier || inConfig ? 'holding' : baseStatus
    const poolType = inConfig ? 'config' : hasTopTier ? 'core' : inferPoolType(currentGroup, operation, status)
    const holdingTier = tierByStock.get(normalizedStock)

    holdings.push({
      id: crypto.randomUUID(),
      snapshotId,
      stockCode: stockName,
      stockName,
      operation,
      status,
      poolType,
      group: currentGroup,
      industryL4: String(row[map.industryL4] ?? '').trim(),
      industryL1: String(row[map.industryL1] ?? '').trim(),
      reasonBrief: String(row[map.reason] ?? '').trim(),
      longTermView: String(row[map.longTerm] ?? '').trim(),
      shortTermView: shortTermText,
      fundamentals: String(row[map.fundamentals] ?? '').trim(),
      techSignal: String(row[map.tech] ?? '').trim(),
      stopLoss: extracted.stopLoss,
      shortTarget: extracted.shortTarget,
      longTarget: extracted.longTarget,
      support: extracted.support,
      holdingTier
    })
  }

  return {
    id: snapshotId,
    influencerId,
    version,
    stocks: holdings,
    summary: `导入 ${firstSheetName}，共解析 ${holdings.length} 条持仓`,
    createTime: new Date().toISOString()
  }
}

