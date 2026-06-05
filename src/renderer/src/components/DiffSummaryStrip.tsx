import type { Snapshot, SnapshotDiffKind } from '../types'
import { compareSnapshots } from '../services/snapshotAnalytics'
import type { DiffFilter } from '../store/useStore'

interface DiffSummaryStripProps {
  prevSnapshot: Snapshot | null
  currentSnapshot: Snapshot | null
  activeFilter: DiffFilter
  onFilterChange: (filter: DiffFilter) => void
}

interface Chip {
  key: DiffFilter
  label: string
  count: number
}

export function DiffSummaryStrip({
  prevSnapshot,
  currentSnapshot,
  activeFilter,
  onFilterChange
}: DiffSummaryStripProps): React.JSX.Element {
  if (!currentSnapshot) return <div />

  const diff = compareSnapshots(prevSnapshot, currentSnapshot)
  const tierUp = diff.tierChanged.filter((e) => e.kind === 'tier_up').length
  const tierDown = diff.tierChanged.filter((e) => e.kind === 'tier_down').length

  const chips: Chip[] = [
    { key: 'all', label: '全部', count: currentSnapshot.stocks.length },
    { key: 'added', label: '新增', count: diff.added.length },
    { key: 'removed', label: '移除', count: diff.removed.length },
    { key: 'tier_up', label: 'TOP升级', count: tierUp },
    { key: 'tier_down', label: 'TOP降级', count: tierDown },
    { key: 'operation', label: '操作变化', count: diff.operationChanged.length }
  ]

  if (!prevSnapshot) {
    return (
      <div className="mb-3 rounded-sm border border-[var(--color-border)] bg-[#FAFAFA] px-3 py-2 text-xs text-[#888888]">
        仅有一期快照，导入更多版本后可对比持仓变化
      </div>
    )
  }

  return (
    <div className="mb-3 rounded-sm border border-[var(--color-border)] bg-white p-2">
      <div className="mb-1 text-[10px] text-[#888]">
        对比：{prevSnapshot.version} → {currentSnapshot.version}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            disabled={chip.key !== 'all' && chip.count === 0}
            onClick={() => onFilterChange(chip.key)}
            className={`rounded border px-2 py-0.5 text-[11px] ${
              activeFilter === chip.key
                ? 'border-[var(--color-blue)] bg-[#E3F2FD] text-[var(--color-blue)]'
                : 'border-[var(--color-border)] bg-[#FAFAFA] text-[#555] hover:bg-[#F3F3F3] disabled:opacity-40'
            }`}
          >
            {chip.label} {chip.count}
          </button>
        ))}
      </div>
    </div>
  )
}

export function matchesDiffFilter(
  stockName: string,
  filter: DiffFilter,
  diff: ReturnType<typeof compareSnapshots>
): boolean {
  if (filter === 'all') return true
  if (filter === 'added') return diff.added.includes(stockName)
  if (filter === 'removed') return false
  if (filter === 'tier_up') {
    return diff.tierChanged.some((e) => e.stockName === stockName && e.kind === 'tier_up')
  }
  if (filter === 'tier_down') {
    return diff.tierChanged.some((e) => e.stockName === stockName && e.kind === 'tier_down')
  }
  if (filter === 'operation') {
    return diff.operationChanged.some((e) => e.stockName === stockName)
  }
  const kind = diff.byStock.get(stockName)
  return kind === filter
}

export type { SnapshotDiffKind }
