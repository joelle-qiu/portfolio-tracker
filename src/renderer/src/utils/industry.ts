export type IndustryKey =
  | '新能源金属'
  | '化工'
  | '有色金属'
  | '电子/科技'
  | '电气设备'
  | '消费/家居'
  | '公用事业/电力'
  | '其他'

export const INDUSTRY_CHART_COLORS: Record<IndustryKey, string> = {
  新能源金属: '#E3F2FD',
  化工: '#E8F5E9',
  有色金属: '#FFF3E0',
  '电子/科技': '#F3E5F5',
  电气设备: '#E0F7FA',
  '消费/家居': '#FBE9E7',
  '公用事业/电力': '#ECEFF1',
  其他: '#FAFAFA'
}

export const INDUSTRY_TAG_CLASSES: Record<IndustryKey, string> = {
  新能源金属: 'bg-blue-50 text-blue-800',
  化工: 'bg-green-50 text-green-800',
  有色金属: 'bg-orange-50 text-orange-800',
  '电子/科技': 'bg-purple-50 text-purple-800',
  电气设备: 'bg-cyan-50 text-cyan-800',
  '消费/家居': 'bg-amber-50 text-amber-800',
  '公用事业/电力': 'bg-gray-100 text-gray-700',
  其他: 'bg-gray-50 text-gray-600'
}

export function normalizeIndustryName(input: string): IndustryKey {
  const value = (input || '').trim()
  if (/新能源金属/.test(value)) return '新能源金属'
  if (/化工/.test(value)) return '化工'
  if (/有色金属/.test(value)) return '有色金属'
  if (/(电子|科技)/.test(value)) return '电子/科技'
  if (/电气设备/.test(value)) return '电气设备'
  if (/(消费|家居)/.test(value)) return '消费/家居'
  if (/(公用事业|电力)/.test(value)) return '公用事业/电力'
  return '其他'
}

export function normalizeIndustryFromL1L4(industryL1: string, industryL4: string): IndustryKey {
  const source = `${industryL1} ${industryL4}`
  if (/(新能源金属|锂|钴|镍)/.test(source)) return '新能源金属'
  if (/(化工|化纤|化肥|农用药剂)/.test(source)) return '化工'
  if (/(有色|铝|铜|钨|贵金属|金属)/.test(source)) return '有色金属'
  if (/(电子|集成电路|半导体|通信|科技|大模型)/.test(source)) return '电子/科技'
  if (/(电气设备|电气部件|光伏设备)/.test(source)) return '电气设备'
  if (/(消费|家居|轻工|饮料|服饰)/.test(source)) return '消费/家居'
  if (/(公用事业|电力|发电|高股息)/.test(source)) return '公用事业/电力'
  return '其他'
}

