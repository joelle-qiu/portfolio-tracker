import { useEffect, useMemo, useState } from 'react'
import { IndustryTag } from './IndustryTag'
import type { Holding, PoolType, Snapshot } from '../types'
import { normalizeIndustryFromL1L4 } from '../utils/industry'
import { MockQuoteProvider, quoteProvider, type QuoteView } from '../services/quoteService'
import { matchesTheme, type ThemeKey } from '../utils/themes'

export type PoolTab = PoolType

interface StockTableProps {
  snapshot: Snapshot | null
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

export function StockTable({
  snapshot,
  onSelectStock,
  activePool = 'all',
  activeTheme
}: StockTableProps): React.JSX.Element {
  const [rowQuotes, setRowQuotes] = useState<Map<string, QuoteView>>(new Map())

  const rows = useMemo(() => {
    if (!snapshot) return []
    return snapshot.stocks.filter((item) => matchesPoolTab(item, activePool) && matchesTheme(item, activeTheme))
  }, [snapshot, activePool, activeTheme])

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

  const getOperationColor = (operation: string): string => {
    if (/(持有|加仓|买入|看好)/.test(operation)) return 'var(--color-red)'
    if (/(减仓|清仓|止损|卖出)/.test(operation)) return 'var(--color-green)'
    if (/(观测|关注)/.test(operation)) return 'var(--color-yellow)'
    return '#555555'
  }

  if (!snapshot) {
    return (
      <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-sm text-[#888888]">
        还没有持仓快照，请先导入 Excel。
      </div>
    )
  }

  return (
    <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-card)]">
      <div className="border-b border-[var(--color-border)] p-3 text-sm text-[#555555]">
        <div>
          版本：{snapshot.version} ｜ 条目：{rows.length}
          {activeTheme ? ` ｜ 主题筛选：${activeTheme}` : ''}
        </div>
      </div>

      <div className="max-h-[520px] overflow-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 bg-[#F9F9F9] text-[#555555]">
            <tr>
              <th className="border-b border-[var(--color-border)] px-3 py-2">证券</th>
              <th className="border-b border-[var(--color-border)] px-3 py-2">行业</th>
              <th className="border-b border-[var(--color-border)] px-3 py-2">操作</th>
              <th className="border-b border-[var(--color-border)] px-3 py-2">当前价</th>
              <th className="border-b border-[var(--color-border)] px-3 py-2">涨跌幅</th>
              <th className="border-b border-[var(--color-border)] px-3 py-2">止损</th>
              <th className="border-b border-[var(--color-border)] px-3 py-2">短期目标</th>
              <th className="border-b border-[var(--color-border)] px-3 py-2">长期目标</th>
              <th className="border-b border-[var(--color-border)] px-3 py-2">支撑</th>
              <th className="border-b border-[var(--color-border)] px-3 py-2">买点判断</th>
              <th className="border-b border-[var(--color-border)] px-3 py-2">技术面</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              (() => {
                const quote = rowQuotes.get(item.id) ?? { currentPrice: 0, changePct: 0 }
                const breached = item.stopLoss !== undefined && quote.currentPrice < item.stopLoss
                const reachedShort = item.shortTarget !== undefined && quote.currentPrice > item.shortTarget
                const nearShort =
                  item.shortTarget !== undefined &&
                  !reachedShort &&
                  quote.currentPrice >= item.shortTarget * 0.95
                const ma5 = quote.currentPrice * (1 - quote.changePct / 100 / 2.5)
                const ma10 = quote.currentPrice * (1 - quote.changePct / 100 / 1.25)
                const aboveMa5 = quote.currentPrice >= ma5
                const belowMa10 = quote.currentPrice < ma10

                return (
                  <tr
                    key={item.id}
                    className={`cursor-pointer hover:bg-[#FAFAFA] ${breached ? 'bg-red-50' : ''}`}
                    onClick={() => onSelectStock?.(item)}
                  >
                <td className="border-b border-[var(--color-border)] px-3 py-2 text-[#333333]">
                  {item.stockName}
                </td>
                <td className="border-b border-[var(--color-border)] px-3 py-2">
                  <IndustryTag industry={normalizeIndustryFromL1L4(item.industryL1, item.industryL4)} />
                </td>
                <td
                  className="border-b border-[var(--color-border)] px-3 py-2"
                  style={{ color: getOperationColor(item.operation) }}
                >
                  {item.operation || '-'}
                </td>
                <td className="border-b border-[var(--color-border)] px-3 py-2 text-[#333333]">
                  {quote.currentPrice.toFixed(2)}
                </td>
                <td
                  className="border-b border-[var(--color-border)] px-3 py-2 font-medium"
                  style={{ color: quote.changePct >= 0 ? 'var(--color-red)' : 'var(--color-green)' }}
                >
                  {quote.changePct >= 0 ? '↑' : '↓'} {Math.abs(quote.changePct).toFixed(2)}%
                </td>
                <td
                  className="border-b border-[var(--color-border)] px-3 py-2"
                  style={{
                    color: breached ? '#dc2626' : item.stopLoss !== undefined ? 'var(--color-yellow)' : '#555555'
                  }}
                >
                  {item.stopLoss ?? '-'} {breached ? '⚠️' : ''}
                </td>
                <td className="border-b border-[var(--color-border)] px-3 py-2">
                  <div className="flex items-center gap-1">
                    <span style={{ color: item.shortTarget !== undefined ? 'var(--color-red)' : '#555555' }}>
                      {item.shortTarget ?? '-'}
                    </span>
                    {reachedShort ? (
                      <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] text-green-700">已达标</span>
                    ) : null}
                    {nearShort ? (
                      <span className="rounded bg-yellow-50 px-1.5 py-0.5 text-[10px] text-yellow-700">
                        接近目标
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="border-b border-[var(--color-border)] px-3 py-2 text-[#555555]">
                  {item.longTarget ?? '-'}
                </td>
                <td
                  className="border-b border-[var(--color-border)] px-3 py-2"
                  style={{ color: item.support !== undefined ? 'var(--color-blue)' : '#555555' }}
                >
                  {item.support ?? '-'}
                </td>
                <td className="border-b border-[var(--color-border)] px-3 py-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] ${
                      breached
                        ? 'bg-red-50 text-red-700'
                        : item.support !== undefined &&
                            Math.abs(quote.currentPrice - item.support) / item.support <= 0.03
                          ? 'bg-blue-50 text-blue-700'
                          : item.shortTarget !== undefined &&
                              quote.currentPrice > item.shortTarget * 0.95 &&
                              quote.currentPrice <= item.shortTarget
                            ? 'bg-yellow-50 text-yellow-700'
                            : belowMa10
                              ? 'bg-yellow-50 text-yellow-700'
                              : 'bg-green-50 text-green-700'
                    }`}
                  >
                    {breached
                      ? '破位谨慎'
                      : item.support !== undefined &&
                          Math.abs(quote.currentPrice - item.support) / item.support <= 0.03
                        ? '接近支撑可埋伏'
                        : item.shortTarget !== undefined &&
                            quote.currentPrice > item.shortTarget * 0.95 &&
                            quote.currentPrice <= item.shortTarget
                          ? '接近目标勿追高'
                          : belowMa10
                            ? '跌破10日线，考虑撤退'
                            : aboveMa5
                              ? '不破5日线偏强'
                              : '等待回踩均线'}
                  </span>
                </td>
                <td className="max-w-[320px] border-b border-[var(--color-border)] px-3 py-2 text-[#888888]">
                  {item.techSignal || '-'}
                </td>
                  </tr>
                )
              })()
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

