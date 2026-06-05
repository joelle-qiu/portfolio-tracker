const STOCK_ALIASES: Record<string, string> = {
  厦钨: '厦门钨业',
  云铝: '云铝股份',
  智选高股息ETF: '高股息ETF',
  智选高股息: '高股息ETF'
}

const INTRO_SKIP_TOKENS =
  /^(碳酸锂|仓位|控制|思路|长期|继续|看好|超长期|配置仓|总仓位|此外|Norecomend|我的|目前)$/i

/**
 * 统一股票名用于 TOP / 配置仓匹配。
 */
export function normalizeStockNameForMatch(name: string): string {
  const text = name.replace(/\s+/g, '').trim()
  return STOCK_ALIASES[text] ?? text
}

function namesMatch(a: string, b: string): boolean {
  if (!a || !b) return false
  if (a === b) return true
  return a.includes(b) || b.includes(a)
}

export function findTierForStock(
  stockName: string,
  tierByStock: Map<string, number>
): number | undefined {
  const norm = normalizeStockNameForMatch(stockName)
  if (tierByStock.has(norm)) return tierByStock.get(norm)

  for (const [key, tier] of tierByStock.entries()) {
    if (namesMatch(norm, key)) return tier
  }
  return undefined
}

export function isConfigStock(stockName: string, configStocks: Set<string>): boolean {
  const norm = normalizeStockNameForMatch(stockName)
  if (configStocks.has(norm)) return true

  for (const key of configStocks) {
    if (namesMatch(norm, key)) return true
  }
  return false
}

/**
 * 从表头前导语解析 TOP1~6 与配置仓名单。
 */
export function parseTopTierHintsFromIntro(introText: string): {
  tierByStock: Map<string, number>
  configStocks: Set<string>
} {
  const tierByStock = new Map<string, number>()
  const configStocks = new Set<string>()

  const topRegex = /TOPO?([1-6])[:：]\s*([\s\S]*?)(?=TOPO?[1-6][:：]|配置仓|总仓位|$)/gi
  const tokenRegex = /[\u4e00-\u9fa5A-Za-z][\u4e00-\u9fa5A-Za-z0-9]*/g

  let match: RegExpExecArray | null = topRegex.exec(introText)
  while (match) {
    const tier = Number.parseInt(match[1], 10)
    const block = match[2] ?? ''
    const tokens = block.match(tokenRegex) ?? []
    for (const token of tokens) {
      const key = normalizeStockNameForMatch(token)
      if (INTRO_SKIP_TOKENS.test(key) || key.length < 2) continue
      if (!tierByStock.has(key)) tierByStock.set(key, tier)
    }
    match = topRegex.exec(introText)
  }

  const cfgMatch = introText.match(
    /配置仓[\s\S]*?[:：]\s*([\s\S]*?)(?=总仓位|此外|Norecomend|我比较|$)/i
  )
  if (cfgMatch?.[1]) {
    const tokens = cfgMatch[1].match(tokenRegex) ?? []
    for (const token of tokens) {
      const key = normalizeStockNameForMatch(token)
      if (INTRO_SKIP_TOKENS.test(key) || /(超长期|配置仓)/.test(key)) continue
      if (key.length >= 2) configStocks.add(key)
    }
  }

  // 配置仓优先：从 TOP 映射中剔除
  for (const key of configStocks) {
    for (const [tierKey] of tierByStock) {
      if (namesMatch(key, tierKey)) tierByStock.delete(tierKey)
    }
  }

  return { tierByStock, configStocks }
}
