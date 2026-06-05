import { useState } from 'react'
import type { Holding } from '../types'
import { IndustryTag } from './IndustryTag'
import { normalizeIndustryFromL1L4 } from '../utils/industry'
import { buildHoldingMetrics } from '../utils/parserHelpers'
import { getDisplayTier } from './TopHoldingsLadder'

interface StockDetailViewProps {
  stock: Holding | null
}

const TREND_LABEL = { up: '上行', down: '下行', range: '震荡', unknown: '待观察' }
const MA_LABEL = { above_ma5: '不破5日线', below_ma10: '破10日线', neutral: '均线中性' }
const RISK_LABEL = { low: '低', medium: '中', high: '高' }

export function StockDetailView({ stock }: StockDetailViewProps): React.JSX.Element {
  const [showRaw, setShowRaw] = useState(false)

  if (!stock) {
    return (
      <aside className="rounded-sm border border-[var(--color-border)] bg-white p-3 text-sm text-[#888888]">
        点击左侧股票查看结构化详情
      </aside>
    )
  }

  const industry = normalizeIndustryFromL1L4(stock.industryL1, stock.industryL4)
  const metrics =
    stock.metrics ??
    buildHoldingMetrics({
      operation: stock.operation,
      reasonBrief: stock.reasonBrief,
      longTermView: stock.longTermView,
      shortTermView: stock.shortTermView,
      techSignal: stock.techSignal,
      stopLoss: stock.stopLoss,
      shortTarget: stock.shortTarget,
      support: stock.support
    })
  const tier = getDisplayTier(stock)

  return (
    <aside className="rounded-sm border border-[var(--color-border)] bg-white p-3 text-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="text-base font-semibold text-[#333]">{stock.stockName}</div>
          <div className="mt-1 flex items-center gap-2">
            <IndustryTag industry={industry} />
            {tier ? (
              <span className="rounded bg-[#F0F0F0] px-1.5 py-0.5 text-[10px] text-[#666]">TOP{tier}</span>
            ) : null}
          </div>
        </div>
        <span className="text-xs text-[#888]">{stock.operation || '-'}</span>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded border border-[var(--color-border)] bg-[#FAFAFA] p-2">
          <div className="text-[#999]">趋势</div>
          <div className="font-medium text-[#444]">{TREND_LABEL[metrics.trend]}</div>
        </div>
        <div className="rounded border border-[var(--color-border)] bg-[#FAFAFA] p-2">
          <div className="text-[#999]">均线</div>
          <div className="font-medium text-[#444]">{MA_LABEL[metrics.maSignal]}</div>
        </div>
        <div className="rounded border border-[var(--color-border)] bg-[#FAFAFA] p-2">
          <div className="text-[#999]">风险</div>
          <div className="font-medium text-[#444]">{RISK_LABEL[metrics.risk]}</div>
        </div>
        <div className="rounded border border-[var(--color-border)] bg-[#FAFAFA] p-2">
          <div className="text-[#999]">买点</div>
          <div className="font-medium text-blue-700">{metrics.buyPointHint}</div>
        </div>
      </div>

      <div className="mb-3 rounded border border-[var(--color-border)] bg-[#FAFAFA] p-2 text-xs">
        <div className="text-[#999]">关键价位</div>
        <div className="mt-1 text-[#444]">
          支撑 {stock.support ?? '-'} ｜ 止损 {stock.stopLoss ?? '-'} ｜ 短期 {stock.shortTarget ?? '-'} ｜ 长期{' '}
          {stock.longTarget ?? '-'}
        </div>
      </div>

      {metrics.thesis ? (
        <div className="mb-3 text-xs text-[#555]">
          <span className="text-[#999]">论点：</span>
          {metrics.thesis}
        </div>
      ) : null}

      {metrics.techTags.length ? (
        <div className="mb-3 flex flex-wrap gap-1">
          {metrics.techTags.map((tag) => (
            <span key={tag} className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] text-purple-700">
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        className="text-xs text-[var(--color-blue)] hover:underline"
        onClick={() => setShowRaw((v) => !v)}
      >
        {showRaw ? '收起原文' : '展开原文'}
      </button>

      {showRaw ? (
        <div className="mt-2 space-y-2 border-t border-[var(--color-border)] pt-2 text-xs text-[#666]">
          <div>
            <div className="font-medium text-[#888]">短期</div>
            {stock.shortTermView || '-'}
          </div>
          <div>
            <div className="font-medium text-[#888]">长期</div>
            {stock.longTermView || '-'}
          </div>
          <div>
            <div className="font-medium text-[#888]">基本面</div>
            {stock.fundamentals || '-'}
          </div>
          <div>
            <div className="font-medium text-[#888]">技术面</div>
            {stock.techSignal || '-'}
          </div>
          <div>
            <div className="font-medium text-[#888]">看好原因</div>
            {stock.reasonBrief || '-'}
          </div>
        </div>
      ) : null}
    </aside>
  )
}
