import type { Holding } from '../types'

export interface QuoteView {
  currentPrice: number
  changePct: number
}

export interface IQuoteProvider {
  getQuote(stock: Holding): QuoteView
  getQuotes(stocks: Holding[]): Promise<Map<string, QuoteView>>
}

export type QuoteProviderMode = 'mock' | 'real'

function hashToUnit(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return ((hash >>> 0) % 10000) / 10000
}

/**
 * Mock 行情实现：为每只股票稳定生成一个“当前价 + 涨跌幅”。
 * 后续接入真实行情时，只需替换 provider 实现。
 */
export class MockQuoteProvider implements IQuoteProvider {
  getQuote(stock: Holding): QuoteView {
    const u1 = hashToUnit(`${stock.id}-price`)
    const u2 = hashToUnit(`${stock.id}-change`)
    const currentPrice = Number((30 + u1 * 170).toFixed(2))
    const changePct = Number((-5 + u2 * 10).toFixed(2))
    return { currentPrice, changePct }
  }

  async getQuotes(stocks: Holding[]): Promise<Map<string, QuoteView>> {
    const result = new Map<string, QuoteView>()
    for (const stock of stocks) {
      result.set(stock.id, this.getQuote(stock))
    }
    return result
  }
}

/**
 * 真实行情占位实现。后续接入接口时替换这里。
 */
export class RealQuoteProvider implements IQuoteProvider {
  private readonly fallback = new MockQuoteProvider()
  private readonly baseUrl = (import.meta.env.VITE_QUOTE_API_BASE ?? '').toString().trim()

  getQuote(stock: Holding): QuoteView {
    return this.fallback.getQuote(stock)
  }

  async getQuotes(stocks: Holding[]): Promise<Map<string, QuoteView>> {
    // 无配置时，直接回退 mock。
    if (!this.baseUrl) return this.fallback.getQuotes(stocks)

    const result = new Map<string, QuoteView>()
    await Promise.all(
      stocks.map(async (stock) => {
        const code = stock.stockCode || stock.stockName
        const url = `${this.baseUrl}?code=${encodeURIComponent(code)}`
        try {
          const response = await fetch(url, { method: 'GET' })
          if (!response.ok) throw new Error(`HTTP_${response.status}`)
          const data = (await response.json()) as {
            price?: number
            currentPrice?: number
            changePct?: number
            changePercent?: number
          }
          const currentPrice = Number((data.currentPrice ?? data.price ?? NaN).toFixed(2))
          const changePct = Number((data.changePct ?? data.changePercent ?? NaN).toFixed(2))
          if (Number.isNaN(currentPrice) || Number.isNaN(changePct)) {
            throw new Error('INVALID_QUOTE_PAYLOAD')
          }
          result.set(stock.id, { currentPrice, changePct })
        } catch {
          // 单只股票失败时回退 mock，保证页面可用。
          result.set(stock.id, this.fallback.getQuote(stock))
        }
      })
    )
    return result
  }
}

function resolveQuoteProviderMode(): QuoteProviderMode {
  const raw = (import.meta.env.VITE_QUOTE_PROVIDER ?? 'mock').toString().toLowerCase()
  return raw === 'real' ? 'real' : 'mock'
}

export const quoteProviderMode: QuoteProviderMode = resolveQuoteProviderMode()
export const quoteProvider: IQuoteProvider =
  quoteProviderMode === 'real' ? new RealQuoteProvider() : new MockQuoteProvider()

