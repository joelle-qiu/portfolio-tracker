import type { Holding, Snapshot, SnapshotDiff } from '../types'
import { compareSnapshots, getTierLayers } from '../services/snapshotAnalytics'
import { INDUSTRY_CHART_COLORS, normalizeIndustryFromL1L4 } from '../utils/industry'
import { resolveHoldingTier } from '../utils/tierInference'

interface TopHoldingsLadderProps {
  snapshot: Snapshot | null
  prevSnapshot: Snapshot | null
  onSelectStock?: (stock: Holding) => void
}

function operationDotColor(operationType?: string): string {
  if (operationType === 'reduce' || operationType === 'sell') return 'var(--color-green)'
  if (operationType === 'watch') return 'var(--color-yellow)'
  return 'var(--color-red)'
}

function tierChangeArrow(
  stockName: string,
  diff: SnapshotDiff | null
): string {
  if (!diff) return ''
  const kind = diff.byStock.get(stockName)
  if (kind === 'tier_up' || kind === 'added') return '↑'
  if (kind === 'tier_down' || kind === 'removed') return '↓'
  return ''
}

export function TopHoldingsLadder({
  snapshot,
  prevSnapshot,
  onSelectStock
}: TopHoldingsLadderProps): React.JSX.Element {
  if (!snapshot) {
    return (
      <div className="mb-3 rounded-sm border border-[var(--color-border)] bg-white p-4 text-sm text-[#888888]">
        暂无持仓，请导入 Excel
      </div>
    )
  }

  const holdingStocks = snapshot.stocks.filter((s) => s.status === 'holding')
  const configStocks = holdingStocks.filter((s) => s.poolType === 'config')
  const coreStocks = holdingStocks.filter((s) => s.poolType !== 'config')
  const layers = getTierLayers(coreStocks)
  const diff = prevSnapshot ? compareSnapshots(prevSnapshot, snapshot) : null

  return (
    <div className="mb-3 rounded-sm border border-[var(--color-border)] bg-white p-3">
      <div className="mb-2 text-xs font-semibold text-[#555555]">核心持仓阶梯 TOP1 → TOP6</div>

      {layers.length ? (
        <div className="space-y-1.5">
          {layers.map((layer) => (
            <div key={layer.tier} className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#F0F0F0] text-sm font-bold text-[#444]">
                {layer.tier}
              </div>
              <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                {layer.items.map((stock) => {
                  const industry = normalizeIndustryFromL1L4(stock.industryL1, stock.industryL4)
                  const arrow = tierChangeArrow(stock.stockName, diff)
                  return (
                    <button
                      key={stock.id}
                      type="button"
                      onClick={() => onSelectStock?.(stock)}
                      className="inline-flex items-center gap-1 rounded border border-[var(--color-border)] px-2 py-1 text-xs font-medium text-[#333]"
                      style={{ backgroundColor: INDUSTRY_CHART_COLORS[industry] }}
                      title={`${stock.stockName} · ${industry}`}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: operationDotColor(stock.metrics?.operationType) }}
                      />
                      {stock.stockName}
                      {arrow ? (
                        <span className={arrow === '↑' ? 'text-red-600' : 'text-green-600'}>{arrow}</span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-[#888888]">暂无 TOP 层级（将自动从持仓推断）</div>
      )}

      {configStocks.length ? (
        <div className="mt-4 rounded border border-dashed border-[#BDBDBD] bg-[#FAFAFA] p-2">
          <div className="mb-1.5 text-[11px] font-semibold text-[#666]">配置仓（超长期）</div>
          <div className="flex flex-wrap gap-1">
            {configStocks.map((stock) => {
              const industry = normalizeIndustryFromL1L4(stock.industryL1, stock.industryL4)
              return (
                <button
                  key={stock.id}
                  type="button"
                  onClick={() => onSelectStock?.(stock)}
                  className="inline-flex items-center gap-1 rounded border border-[var(--color-border)] px-2 py-1 text-xs text-[#444]"
                  style={{ backgroundColor: INDUSTRY_CHART_COLORS[industry] }}
                  title={`${stock.stockName} · ${industry}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#9E9E9E]" />
                  {stock.stockName}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-[#999]">
        <span>色块=行业</span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-red)]" />
          看多
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-green)]" />
          减仓
        </span>
        <span>↑↓=较上期TOP变化</span>
      </div>
    </div>
  )
}

export function getDisplayTier(stock: Holding): number | undefined {
  return resolveHoldingTier(stock)
}
