import type { Holding } from '../types'

interface StockDetailViewProps {
  stock: Holding | null
}

export function StockDetailView({ stock }: StockDetailViewProps): React.JSX.Element {
  return (
    <aside className="rounded-sm border border-[var(--color-border)] bg-white p-3 text-sm">
      <div className="mb-2 font-semibold text-[#555555]">个股详情（预留）</div>
      {stock ? (
        <div className="space-y-1 text-[#666666]">
          <div>
            <span className="text-[#888888]">证券：</span>
            {stock.stockName}
          </div>
          <div>
            <span className="text-[#888888]">行业：</span>
            {stock.industryL1 || stock.industryL4 || '其他'}
          </div>
          <div>
            <span className="text-[#888888]">操作：</span>
            {stock.operation || '-'}
          </div>
          <div>
            <span className="text-[#888888]">短期思路：</span>
            {stock.shortTermView || '-'}
          </div>
        </div>
      ) : (
        <div className="text-[#888888]">点击左侧股票查看详情</div>
      )}
    </aside>
  )
}

