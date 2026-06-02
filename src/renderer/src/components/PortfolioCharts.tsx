import type { Holding, Snapshot } from '../types'
import { INDUSTRY_CHART_COLORS, normalizeIndustryFromL1L4, type IndustryKey } from '../utils/industry'
import { THEME_MATCHERS, type ThemeKey } from '../utils/themes'

interface PortfolioChartsProps {
  snapshot: Snapshot | null
  activeTheme?: ThemeKey
  onThemeSelect?: (theme?: ThemeKey) => void
}

function buildPyramidData(stocks: Holding[]): Array<{ tier: number; items: Holding[] }> {
  const tierMap = new Map<number, Holding[]>()
  for (const stock of stocks) {
    if (!stock.holdingTier) continue
    const arr = tierMap.get(stock.holdingTier) ?? []
    arr.push(stock)
    tierMap.set(stock.holdingTier, arr)
  }
  return Array.from(tierMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([tier, items]) => ({ tier, items }))
}

function buildIndustryStats(stocks: Holding[]): Array<{ industry: IndustryKey; count: number; pct: number }> {
  if (!stocks.length) return []
  const counter = new Map<IndustryKey, number>()
  for (const stock of stocks) {
    const key = normalizeIndustryFromL1L4(stock.industryL1, stock.industryL4)
    counter.set(key, (counter.get(key) ?? 0) + 1)
  }
  const total = stocks.length
  return Array.from(counter.entries())
    .map(([industry, count]) => ({
      industry,
      count,
      pct: (count / total) * 100
    }))
    .sort((a, b) => b.count - a.count)
}

function getOperationTone(operation: string): string {
  if (/(减仓|清仓|止损|卖出)/.test(operation)) return '减仓'
  if (/(加仓|买入|持有|看好)/.test(operation)) return '看多'
  return '观察'
}

function getTierAccent(tier: number): { bg: string; strength: string; strengthClass: string } {
  switch (tier) {
    case 1:
      return { bg: '#FFF3E0', strength: '高', strengthClass: 'bg-red-50 text-red-700' }
    case 2:
      return { bg: '#FFF8E1', strength: '中高', strengthClass: 'bg-orange-50 text-orange-700' }
    case 3:
      return { bg: '#F1F8E9', strength: '中', strengthClass: 'bg-yellow-50 text-yellow-700' }
    case 4:
      return { bg: '#E8F5E9', strength: '中低', strengthClass: 'bg-green-50 text-green-700' }
    default:
      return { bg: '#F5F5F5', strength: '观察', strengthClass: 'bg-gray-100 text-gray-700' }
  }
}

function buildThemeHits(stocks: Holding[]): Array<{ theme: string; hit: number; pct: number }> {
  const total = stocks.length || 1
  return THEME_MATCHERS
    .map((item) => {
      const hit = stocks.filter((stock) =>
        item.matcher.test(
          `${stock.stockName} ${stock.stockCode} ${stock.industryL1} ${stock.industryL4} ${stock.reasonBrief}`
        )
      ).length
      return { theme: item.theme, hit, pct: (hit / total) * 100 }
    })
    .filter((item) => item.hit > 0)
    .sort((a, b) => b.hit - a.hit)
}

export function PortfolioCharts({
  snapshot,
  activeTheme,
  onThemeSelect
}: PortfolioChartsProps): React.JSX.Element {
  if (!snapshot) {
    return (
      <div className="mb-4 rounded-sm border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-sm text-[#888888]">
        暂无持仓数据，请导入Excel
      </div>
    )
  }

  const holdingStocks = snapshot.stocks.filter((item) => item.status === 'holding')
  const watchStocks = snapshot.stocks.filter((item) => item.status !== 'holding')
  const pyramid = buildPyramidData(holdingStocks)
  const configStocks = holdingStocks.filter((item) => item.poolType === 'config')
  const industryStats = buildIndustryStats(holdingStocks)
  const themeHits = buildThemeHits(holdingStocks)

  return (
    <div className="mb-4 rounded-sm border border-[var(--color-border)] bg-[var(--color-card)] p-3">
      <div className="mb-3 flex items-center gap-2 text-xs">
        <span className="rounded border border-[var(--color-border)] bg-[#FFEBEE] px-2 py-1 text-[var(--color-red)]">
          持仓 {holdingStocks.length}
        </span>
        <span className="rounded border border-[var(--color-border)] bg-[#FFFDE7] px-2 py-1 text-[var(--color-yellow)]">
          观察仓 {watchStocks.length}
        </span>
      </div>

      <div className="mb-3 rounded border border-[var(--color-border)] bg-white p-2">
        <div className="mb-2 text-xs font-semibold text-[#555555]">行业分布（持仓内）</div>
        {industryStats.length ? (
          <div className="space-y-1.5">
            {industryStats.map((item) => (
              <div key={item.industry} className="grid grid-cols-[96px_1fr_70px] items-center gap-2 text-[11px]">
                <span className="font-medium text-[#555555]">{item.industry}</span>
                <div className="h-2 rounded bg-[#F1F1F1]">
                  <div
                    className="h-2 rounded"
                    style={{
                      width: `${Math.max(item.pct, 4)}%`,
                      backgroundColor: INDUSTRY_CHART_COLORS[item.industry]
                    }}
                  />
                </div>
                <span className="text-right text-[#777777]">
                  {item.count}支 / {item.pct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-[#888888]">暂无行业分布数据。</div>
        )}
      </div>

      <div className="mb-3 rounded border border-[var(--color-border)] bg-white p-2">
        <div className="mb-2 text-xs font-semibold text-[#555555]">主题命中率（你的关注方向）</div>
        {themeHits.length ? (
          <div className="grid gap-1.5 md:grid-cols-2">
            {themeHits.map((item) => (
              <button
                key={item.theme}
                type="button"
                onClick={() =>
                  onThemeSelect?.(activeTheme === (item.theme as ThemeKey) ? undefined : (item.theme as ThemeKey))
                }
                className={`flex items-center justify-between rounded border px-2 py-1 text-[11px] ${
                  activeTheme === item.theme
                    ? 'border-[var(--color-blue)] bg-[#E3F2FD]'
                    : 'border-[var(--color-border)] bg-[#FAFAFA] hover:bg-[#F3F3F3]'
                }`}
              >
                <span className="font-medium text-[#555]">{item.theme}</span>
                <span className="text-[#777]">
                  {item.hit}支 / {item.pct.toFixed(1)}%
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-xs text-[#888888]">暂无主题命中数据。</div>
        )}
      </div>

      <div className="rounded border border-[var(--color-border)] bg-white p-2">
        <div className="mb-2 text-xs font-semibold text-[#555555]">持仓金字塔（TOP1→TOPN）</div>
        {pyramid.length ? (
          <div className="space-y-2">
            {pyramid.map((layer) => {
              const accent = getTierAccent(layer.tier)
              return (
                <div
                  key={layer.tier}
                  className="rounded border border-[var(--color-border)] p-2"
                  style={{
                    width: `${Math.max(40, 100 - (layer.tier - 1) * 10)}%`,
                    backgroundColor: accent.bg
                  }}
                >
                  <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-[#666666]">
                    <span>TOP{layer.tier}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-[#777]">{layer.items.length}支</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] ${accent.strengthClass}`}>
                        仓位强度: {accent.strength}
                      </span>
                    </div>
                  </div>
                <div className="flex flex-wrap gap-1">
                  {layer.items.map((stock) => (
                    <div
                      key={stock.id}
                      className="flex items-center gap-1 rounded border border-[var(--color-border)] bg-white px-2 py-0.5 text-[11px] text-[#444]"
                      style={{
                        backgroundColor: INDUSTRY_CHART_COLORS[
                          normalizeIndustryFromL1L4(stock.industryL1, stock.industryL4)
                        ]
                      }}
                    >
                      <span className="font-medium">{stock.stockName}</span>
                      {stock.stockCode && stock.stockCode !== stock.stockName ? (
                        <span className="text-[#666666]">({stock.stockCode})</span>
                      ) : null}
                      <span className="rounded bg-white/80 px-1 text-[10px] text-[#666666]">
                        {normalizeIndustryFromL1L4(stock.industryL1, stock.industryL4)}
                      </span>
                      <span className="rounded bg-white/80 px-1 text-[10px] text-[#666666]">
                        {getOperationTone(stock.operation)}
                      </span>
                    </div>
                  ))}
                </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-xs text-[#888888]">暂无 TOP 层级数据，导入后将自动识别。</div>
        )}
      </div>

      <div className="mt-3 rounded border border-[var(--color-border)] bg-white p-2">
        <div className="mb-1 text-xs font-semibold text-[#555555]">配置仓（超长期）</div>
        {configStocks.length ? (
          <div className="flex flex-wrap gap-1">
            {configStocks.map((stock) => (
              <span
                key={stock.id}
                className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[11px] text-[#555]"
                style={{
                  backgroundColor: INDUSTRY_CHART_COLORS[
                    normalizeIndustryFromL1L4(stock.industryL1, stock.industryL4)
                  ]
                }}
              >
                {stock.stockName}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-xs text-[#888888]">暂无配置仓数据。</div>
        )}
      </div>
    </div>
  )
}

