import { useEffect, useMemo, useState } from 'react'
import { DiffSummaryStrip } from './components/DiffSummaryStrip'
import { HoldingsTrendChart } from './components/HoldingsTrendChart'
import { ImportButton } from './components/ImportButton'
import { StockDetailView } from './components/StockDetailView'
import { StockTable, type PoolTab } from './components/StockTable'
import { TopHoldingsLadder } from './components/TopHoldingsLadder'
import { quoteProviderMode } from './services/quoteService'
import { compareSnapshots } from './services/snapshotAnalytics'
import { usePreviousSnapshot, useStore } from './store/useStore'
import type { Holding } from './types'
import { THEME_MATCHERS, type ThemeKey } from './utils/themes'

const POOL_TABS: Array<{ id: PoolTab; label: string }> = [
  { id: 'core', label: '核心持仓' },
  { id: 'config', label: '配置仓' },
  { id: 'watch', label: '关注池' },
  { id: 'research', label: '研究池' },
  { id: 'all', label: '全部' }
]

function App(): React.JSX.Element {
  const [selectedStock, setSelectedStock] = useState<Holding | null>(null)
  const [activePool, setActivePool] = useState<PoolTab>('all')
  const [activeTheme, setActiveTheme] = useState<ThemeKey | undefined>(undefined)
  const prevSnapshot = usePreviousSnapshot()
  const {
    influencers,
    currentInfluencerId,
    currentSnapshot,
    snapshots,
    diffFilter,
    isImporting,
    importError,
    initialize,
    setCurrentInfluencer,
    setCurrentSnapshotById,
    setDiffFilter,
    addInfluencer,
    importExcelFile
  } = useStore()

  const diff = useMemo(
    () => (currentSnapshot ? compareSnapshots(prevSnapshot, currentSnapshot) : null),
    [prevSnapshot, currentSnapshot]
  )

  useEffect(() => {
    void initialize()
  }, [initialize])

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#333333]">
      <header className="border-b border-[#E0E0E0] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-wide">
            <span>Portfolio Tracker</span>
            <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
              行情: {quoteProviderMode === 'real' ? 'REAL' : 'MOCK'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={currentInfluencerId}
              onChange={(event) => {
                void setCurrentInfluencer(event.target.value)
              }}
              className="border border-[var(--color-border)] bg-white px-2 py-1 text-sm"
            >
              {influencers.map((influencer) => (
                <option key={influencer.id} value={influencer.id}>
                  {influencer.name}
                </option>
              ))}
            </select>
            {snapshots.length > 0 ? (
              <select
                value={currentSnapshot?.id ?? ''}
                onChange={(e) => setCurrentSnapshotById(e.target.value)}
                className="border border-[var(--color-border)] bg-white px-2 py-1 text-sm"
              >
                {snapshots.map((snap) => (
                  <option key={snap.id} value={snap.id}>
                    {snap.version}
                  </option>
                ))}
              </select>
            ) : null}
            <button
              type="button"
              className="rounded border border-[var(--color-border)] bg-white px-2 py-1 text-xs text-[#555555] hover:bg-[#FAFAFA]"
              onClick={() => {
                const name = window.prompt('请输入博主名称')
                if (!name) return
                void addInfluencer(name)
              }}
            >
              + 新增博主
            </button>
            <ImportButton isImporting={isImporting} onImport={importExcelFile} />
          </div>
        </div>
      </header>

      <main className="p-4">
        {importError ? (
          <div className="mb-3 border border-[var(--color-red)] bg-[#FFEBEE] px-3 py-2 text-sm text-[var(--color-red)]">
            导入失败：{importError}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[65%_35%]">
          <section className="min-w-0">
            <TopHoldingsLadder
              snapshot={currentSnapshot}
              prevSnapshot={prevSnapshot}
              onSelectStock={setSelectedStock}
            />

            <div className="mb-3 grid gap-3 lg:grid-cols-2">
              <HoldingsTrendChart snapshots={snapshots} />
              <div className="rounded-sm border border-[var(--color-border)] bg-white p-2">
                <div className="mb-2 text-xs font-semibold text-[#555555]">主题筛选</div>
                <div className="flex flex-wrap gap-1">
                  {THEME_MATCHERS.map((item) => (
                    <button
                      key={item.theme}
                      type="button"
                      onClick={() =>
                        setActiveTheme(activeTheme === item.theme ? undefined : item.theme)
                      }
                      className={`rounded border px-2 py-0.5 text-[11px] ${
                        activeTheme === item.theme
                          ? 'border-[var(--color-blue)] bg-[#E3F2FD] text-[var(--color-blue)]'
                          : 'border-[var(--color-border)] bg-[#FAFAFA] text-[#555]'
                      }`}
                    >
                      {item.theme}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <DiffSummaryStrip
              prevSnapshot={prevSnapshot}
              currentSnapshot={currentSnapshot}
              activeFilter={diffFilter}
              onFilterChange={setDiffFilter}
            />

            <div className="mb-3 rounded-sm border border-[var(--color-border)] bg-white p-2">
              <div className="flex flex-wrap gap-2">
                {POOL_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`rounded border px-2 py-1 text-xs ${
                      tab.id === activePool
                        ? 'border-[var(--color-blue)] bg-[#E3F2FD] text-[var(--color-blue)]'
                        : 'border-[var(--color-border)] bg-white text-[#555555] hover:bg-[#FAFAFA]'
                    }`}
                    onClick={() => setActivePool(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <StockTable
              snapshot={currentSnapshot}
              diff={diff}
              diffFilter={diffFilter}
              activePool={activePool}
              activeTheme={activeTheme}
              onSelectStock={setSelectedStock}
            />
          </section>
          <StockDetailView stock={selectedStock} />
        </div>
      </main>
    </div>
  )
}

export default App
