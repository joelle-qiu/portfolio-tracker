import * as XLSX from 'xlsx'
import type { Holding, Snapshot } from '../types'
import {
  buildHoldingMetrics,
  extractPricePoints,
  inferGroupByKeywords,
  inferHoldingStatus,
  inferPoolType
} from '../utils/parserHelpers'
import {
  findTierForStock,
  isConfigStock,
  parseTopTierHintsFromIntro
} from '../utils/topTierMapping'

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

function parseTopTierHints(rows: unknown[][], headerRowIndex: number): {
  tierByStock: Map<string, number>
  configStocks: Set<string>
} {
  const introText = rows
    .slice(0, headerRowIndex)
    .map((row) =>
      (row as unknown[])
        .map((cell) => String(cell ?? '').trim())
        .filter(Boolean)
        .join(' ')
    )
    .join('\n')

  return parseTopTierHintsFromIntro(introText)
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
  const positionSummary = rows
    .slice(0, headerRowIndex)
    .map((row) =>
      (row as unknown[])
        .map((cell) => String(cell ?? '').trim())
        .filter(Boolean)
        .join(' ')
    )
    .join('\n')
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
    const inConfig = isConfigStock(stockName, configStocks)
    const holdingTier = inConfig ? undefined : findTierForStock(stockName, tierByStock)
    const hasTopTier = holdingTier !== undefined
    const baseStatus = inferHoldingStatus(operation)
    const status = hasTopTier || inConfig ? 'holding' : baseStatus
    const poolType = inConfig
      ? 'config'
      : hasTopTier
        ? 'core'
        : inferPoolType(currentGroup, operation, status)

    const reasonBrief = String(row[map.reason] ?? '').trim()
    const longTermView = String(row[map.longTerm] ?? '').trim()
    const techSignal = String(row[map.tech] ?? '').trim()
    const fundamentals = String(row[map.fundamentals] ?? '').trim()

    const holdingBase = {
      operation,
      reasonBrief,
      longTermView,
      shortTermView: shortTermText,
      techSignal,
      stopLoss: extracted.stopLoss,
      shortTarget: extracted.shortTarget,
      support: extracted.support
    }

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
      reasonBrief,
      longTermView,
      shortTermView: shortTermText,
      fundamentals,
      techSignal,
      stopLoss: extracted.stopLoss,
      shortTarget: extracted.shortTarget,
      longTarget: extracted.longTarget,
      support: extracted.support,
      holdingTier,
      metrics: buildHoldingMetrics(holdingBase)
    })
  }

  return {
    id: snapshotId,
    influencerId,
    version,
    stocks: holdings,
    summary: `导入 ${firstSheetName}，共解析 ${holdings.length} 条持仓`,
    positionSummary,
    createTime: new Date().toISOString()
  }
}

