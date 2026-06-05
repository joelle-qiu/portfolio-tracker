import { useEffect, useMemo, useState } from 'react'
import type { Holding, PoolType, Snapshot, SnapshotDiff } from '../types'
import { INDUSTRY_CHART_COLORS, normalizeIndustryFromL1L4 } from '../utils/industry'
import { MockQuoteProvider, quoteProvider, type QuoteView } from '../services/quoteService'
import { matchesTheme, type ThemeKey } from '../utils/themes'
import { getDisplayTier } from './TopHoldingsLadder'
import { matchesDiffFilter } from './DiffSummaryStrip'
import type { DiffFilter } from '../store/useStore'
import { buildHoldingMetrics } from '../utils/parserHelpers'

export type PoolTab = PoolType

interface StockTableProps {
  snapshot: Snapshot | null
  diff?: SnapshotDiff | null
  diffFilter?: DiffFilter
  onSelectStock?: (stock: Holding) => void
  activePool?: PoolTab
  activeTheme?: ThemeKey
}

function matchesPoolTab(stock: Holding, tab: PoolTab): boolean {
  if (tab === 'all') return true
  if (stock.poolType) return stock.poolType === tab
  const text = `${stock.group} ${stock.operation} ${stock.status}`
  switch (tab) {
    case 'core':
      return /(核心|TOP|top)/.test(text)
    case 'config':
      return /(配置|防守|仓位)/.test(text)
    case 'watch':
      return /(关注|观测)/.test(text)
    case 'research':
      return /(研究|储备|researched)/.test(text)
    default:
      return true
  }
}

const OP_LABEL: Record<string, string> = {
  buy: '买',
  add: '加',
  hold: '持',
  reduce: '减',
  sell: '卖',
  watch: '观'
}

const CHANGE_LABEL: Record<string, string> = {
  added: '新',
  removed: '退',
  tier_up: '升',
  tier_down: '降',
  operation: '变',
  pool: '池',
  unchanged: '-'
}

function formatKeyPrices(stock: Holding): string {
  const parts: string[] = []
  if (stock.support !== undefined) parts.push(`支${stock.support}`)
  if (stock.stopLoss !== undefined) parts.push(`损${stock.stopLoss}`)
  if (stock.shortTarget !== undefined) parts.push(`目${stock.shortTarget}`)
  return parts.length ? parts.join(' ') : '-'
}

export function StockTable({
  snapshot,
  diff,
  diffFilter = 'all',
  onSelectStock,
  activePool = 'all',
  activeTheme
}: StockTableProps): React.JSX.Element {
  const [rowQuotes, setRowQuotes] = useState<Map<string, QuoteView>>(new Map())

  const rows = useMemo(() => {
    if (!snapshot) return []
    return snapshot.stocks.filter((item) => {
      if (!matchesPoolTab(item, activePool)) return false
      if (!matchesTheme(item, activeTheme)) return false
      if (diff && diffFilter !== 'all' && diffFilter !== 'removed') {
        return matchesDiffFilter(item.stockName, diffFilter, diff)
      }
      return true
    })
  }, [snapshot, activePool, activeTheme, diff, diffFilter])

  useEffect(() => {
    let active = true
    const mock = new MockQuoteProvider()
    const preload = new Map<string, QuoteView>()
    rows.forEach((item) => {
      preload.set(item.id, mock.getQuote(item))
    })
    setRowQuotes(preload)

    void quoteProvider.getQuotes(rows).then((map) => {
      if (!active) return
      setRowQuotes(map)
    })

    return () => {
      active = false
    }
  }, [rows])

  if (!snapshot) {
    return (
      <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-sm text-[#888888]">
        还没有持仓快照，请先导入 Excel。
      </div>
    )
  }

  const showRemoved = diffFilter === 'removed' && diff && diff.removed.length > 0

  return (
    <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-card)]">
      <div className="border-b border-[var(--color-border)] p-3 text-sm text-[#555555]">
        版本：{snapshot.version} ｜ 条目：{showRemoved ? diff!.removed.length : rows.length}
        {activeTheme ? ` ｜ 主题：${activeTheme}` : ''}
      </div>

      <div className="max-h-[480px] overflow-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 bg-[#F9F9F9] text-[#555555]">
            <tr>
              <th className="border-b border-[var(--color-border)] px-2 py-2 w-8">TOP</th>
              <th className="border-b border-[var(--color-border)] px-2 py-2">证券</th>
              <th className="border-b border-[var(--color-border)] px-2 py-2 w-6" />
              <th className="border-b border-[var(--color-border)] px-2 py-2 w-8">操</th>
              <th className="border-b border-[var(--color-border)] px-2 py-2">价/涨跌</th>
              <th className="border-b border-[var(--color-border)] px-2 py-2">关键位</th>
              <th className="border-b border-[var(--color-border)] px-2 py-2">信号</th>
              <th className="border-b border-[var(--color-border)] px-2 py-2">买点</th>
              <th className="border-b border-[var(--color-border)] px-2 py-2 w-8">变</th>
            </tr>
          </thead>
          <tbody>
            {showRemoved
              ? diff!.removed.map((name) => (
                  <tr key={name} className="bg-green-50/50 text-[#666]">
                    <td className="border-b border-[var(--color-border)] px-2 py-2">-</td>
                    <td className="border-b border-[var(--color-border)] px-2 py-2">{name}</td>
                    <td className="border-b border-[var(--color-border)] px-2 py-2" />
                    <td className="border-b border-[var(--color-border)] px-2 py-2">-</td>
                    <td className="border-b border-[var(--color-border)] px-2 py-2">-</td>
                    <td className="border-b border-[var(--color-border)] px-2 py-2">-</td>
                    <td className="border-b border-[var(--color-border)] px-2 py-2">-</td>
                    <td className="border-b border-[var(--color-border)] px-2 py-2">-</td>
                    <td className="border-b border-[var(--color-border)] px-2 py-2 text-green-700">退</td>
                  </tr>
                ))
              : null}
            {!showRemoved
              ? rows.map((item) => {
                  const quote = rowQuotes.get(item.id) ?? { currentPrice: 0, changePct: 0 }
                  const industry = normalizeIndustryFromL1L4(item.industryL1, item.industryL4)
                  const metrics =
                    item.metrics ??
                    buildHoldingMetrics({
                      operation: item.operation,
                      reasonBrief: item.reasonBrief,
                      longTermView: item.longTermView,
                      shortTermView: item.shortTermView,
                      techSignal: item.techSignal,
                      stopLoss: item.stopLoss,
                      shortTarget: item.shortTarget,
                      support: item.support
                    })
                  const tier = getDisplayTier(item)
                  const changeKind = diff?.byStock.get(item.stockName) ?? 'unchanged'
                  const changeLabel = CHANGE_LABEL[changeKind] ?? '-'

                  return (
                    <tr
                      key={item.id}
                      className="cursor-pointer hover:bg-[#FAFAFA]"
                      onClick={() => onSelectStock?.(item)}
                    >
                      <td className="border-b border-[var(--color-border)] px-2 py-2 font-semibold text-[#666]">
                        {tier ?? '-'}
                      </td>
                      <td className="border-b border-[var(--color-border)] px-2 py-2 font-medium text-[#333]">
                        {item.stockName}
                      </td>
                      <td className="border-b border-[var(--color-border)] px-2 py-2">
                        <span
                          className="inline-block h-3 w-3 rounded-sm border border-[var(--color-border)]"
                          style={{ backgroundColor: INDUSTRY_CHART_COLORS[industry] }}
                          title={industry}
                        />
                      </td>
                      <td
                        className="border-b border-[var(--color-border)] px-2 py-2 font-semibold"
                        style={{
                          color:
                            metrics.operationType === 'reduce' || metrics.operationType === 'sell'
                              ? 'var(--color-green)'
                              : metrics.operationType === 'watch'
                                ? 'var(--color-yellow)'
                                : 'var(--color-red)'
                        }}
                      >
                        {OP_LABEL[metrics.operationType] ?? '持'}
                      </td>
                      <td className="border-b border-[var(--color-border)] px-2 py-2">
                        <span className="text-[#333]">{quote.currentPrice.toFixed(2)}</span>
                        <span
                          className="ml-1"
                          style={{ color: quote.changePct >= 0 ? 'var(--color-red)' : 'var(--color-green)' }}
                        >
                          {quote.changePct >= 0 ? '+' : ''}
                          {quote.changePct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="border-b border-[var(--color-border)] px-2 py-2 text-[#666]">
                        {formatKeyPrices(item)}
                      </td>
                      <td className="border-b border-[var(--color-border)] px-2 py-2">
                        <div className="flex flex-wrap gap-0.5">
                          {metrics.techTags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="rounded bg-[#F0F0F0] px-1 py-0.5 text-[10px] text-[#666]"
                            >
                              {tag}
                            </span>
                          ))}
                          {!metrics.techTags.length ? <span className="text-[#bbb]">-</span> : null}
                        </div>
                      </td>
                      <td className="border-b border-[var(--color-border)] px-2 py-2">
                        <span className="rounded bg-blue-50 px-1 py-0.5 text-[10px] text-blue-700">
                          {metrics.buyPointHint}
                        </span>
                      </td>
                      <td
                        className="border-b border-[var(--color-border)] px-2 py-2 font-semibold"
                        style={{
                          color:
                            changeKind === 'added' || changeKind === 'tier_up'
                              ? 'var(--color-red)'
                              : changeKind === 'removed' || changeKind === 'tier_down'
                                ? 'var(--color-green)'
                                : changeKind === 'operation'
                                  ? 'var(--color-yellow)'
                                  : '#bbb'
                        }}
                      >
                        {changeLabel}
                      </td>
                    </tr>
                  )
                })
              : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
