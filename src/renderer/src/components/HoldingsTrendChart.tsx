import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Snapshot } from '../types'
import { buildHoldingsTrend } from '../services/snapshotAnalytics'

interface HoldingsTrendChartProps {
  snapshots: Snapshot[]
}

export function HoldingsTrendChart({ snapshots }: HoldingsTrendChartProps): React.JSX.Element {
  const trend = buildHoldingsTrend(snapshots)

  if (!trend.length) {
    return (
      <div className="rounded-sm border border-[var(--color-border)] bg-white p-3 text-xs text-[#888888]">
        导入快照后可查看持仓变化曲线
      </div>
    )
  }

  const data = trend.map((p) => ({
    label: p.version.replace(/-/g, '').slice(2),
    total: p.total,
    core: p.core,
    config: p.config,
    watch: p.watch
  }))

  return (
    <div className="rounded-sm border border-[var(--color-border)] bg-white p-3">
      <div className="mb-2 text-xs font-semibold text-[#555555]">持仓变化曲线</div>
      {trend.length < 2 ? (
        <div className="mb-2 text-[10px] text-[#999]">已有 1 期数据，再导入一期即可显示趋势线</div>
      ) : null}
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#EEEEEE" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} width={28} />
          <Tooltip
            formatter={(value, name) => {
              const n = typeof value === 'number' ? value : Number(value ?? 0)
              const labels: Record<string, string> = {
                total: '总持仓',
                core: '核心仓',
                config: '配置仓',
                watch: '关注池'
              }
              return [`${n} 支`, labels[String(name)] ?? String(name)]
            }}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Line type="monotone" dataKey="total" name="总持仓" stroke="#E53935" strokeWidth={2} dot />
          <Line type="monotone" dataKey="core" name="核心仓" stroke="#1E88E5" strokeWidth={1.5} dot />
          <Line type="monotone" dataKey="config" name="配置仓" stroke="#43A047" strokeWidth={1.5} dot />
          <Line type="monotone" dataKey="watch" name="关注池" stroke="#FB8C00" strokeWidth={1.5} dot />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
