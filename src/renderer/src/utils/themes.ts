import type { Holding } from '../types'

export type ThemeKey = '化工' | '锂电材料' | '红利' | '储能' | '能源' | '科技/电子'

export const THEME_MATCHERS: Array<{ theme: ThemeKey; matcher: RegExp }> = [
  { theme: '化工', matcher: /(化工|化纤|化肥|农用药剂|万华|云天化|桐昆|卫星)/ },
  { theme: '锂电材料', matcher: /(锂|磷酸铁|电解液|恩捷|中伟|龙蟠|赣锋|天齐)/ },
  { theme: '红利', matcher: /(高股息|红利|美的|中国移动|华能)/ },
  { theme: '储能', matcher: /(储能|阳光电源|宁德|亿纬|赣锋)/ },
  { theme: '能源', matcher: /(煤炭|油气|核电|神华|海油|电力)/ },
  { theme: '科技/电子', matcher: /(半导体|电子|科技|工业富联|长电科技|士兰微)/ }
]

export function matchesTheme(stock: Holding, activeTheme?: ThemeKey): boolean {
  if (!activeTheme) return true
  const rule = THEME_MATCHERS.find((item) => item.theme === activeTheme)
  if (!rule) return true
  const text = `${stock.stockName} ${stock.stockCode} ${stock.industryL1} ${stock.industryL4} ${stock.reasonBrief}`
  return rule.matcher.test(text)
}

