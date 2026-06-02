import { useEffect, useState } from 'react'
import { ImportButton } from './components/ImportButton'
import { PortfolioCharts } from './components/PortfolioCharts'
import { StockDetailView } from './components/StockDetailView'
import { StockTable, type PoolTab } from './components/StockTable'
import { quoteProviderMode } from './services/quoteService'
import { useStore } from './store/useStore'
import type { Holding } from './types'
import type { ThemeKey } from './utils/themes'

const POOL_TABS: Array<{ id: PoolTab; label: string }> = [
  { id: 'core', label: '核心持仓' },
  { id: 'config', label: '配置仓' },
  { id: 'watch', label: '关注池' },
  { id: 'research', label: '研究池' },
  { id: 'all', label: '所有股票' }
]

function App(): React.JSX.Element {
  const [selectedStock, setSelectedStock] = useState<Holding | null>(null)
  const [activePool, setActivePool] = useState<PoolTab>('all')
  const [activeTheme, setActiveTheme] = useState<ThemeKey | undefined>(undefined)
  const {
    influencers,
    currentInfluencerId,
    currentSnapshot,
    isImporting,
    importError,
    initialize,
    setCurrentInfluencer,
    addInfluencer,
    importExcelFile
  } = useStore()

  useEffect(() => {
    void initialize()
  }, [initialize])

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#333333]">
      <header className="border-b border-[#E0E0E0] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-wide">
            <span>Portfolio Tracker</span>
            <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
              行情源: {quoteProviderMode === 'real' ? 'REAL' : 'MOCK'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={currentInfluencerId}
              onChange={(event) => {
                void setCurrentInfluencer(event.target.value)
              }}
              className="border border-[var(--color-border)] bg-white px-2 py-1 text-sm text-[#333333]"
            >
              {influencers.map((influencer) => (
                <option key={influencer.id} value={influencer.id}>
                  {influencer.name}
                </option>
              ))}
            </select>
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
            <PortfolioCharts
              snapshot={currentSnapshot}
              activeTheme={activeTheme}
              onThemeSelect={setActiveTheme}
            />
            <div className="mb-3 rounded-sm border border-[var(--color-border)] bg-white p-2">
              <div className="flex flex-wrap items-center gap-2">
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
                {activeTheme ? (
                  <button
                    type="button"
                    onClick={() => setActiveTheme(undefined)}
                    className="rounded border border-[var(--color-blue)] bg-[#E3F2FD] px-2 py-1 text-xs text-[var(--color-blue)]"
                  >
                    清除主题筛选: {activeTheme}
                  </button>
                ) : null}
              </div>
            </div>
            <StockTable
              snapshot={currentSnapshot}
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
