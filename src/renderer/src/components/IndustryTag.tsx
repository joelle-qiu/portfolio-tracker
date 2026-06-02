import { INDUSTRY_TAG_CLASSES, normalizeIndustryName } from '../utils/industry'

interface IndustryTagProps {
  industry: string
}

export function IndustryTag({ industry }: IndustryTagProps): React.JSX.Element {
  const label = normalizeIndustryName(industry)
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${INDUSTRY_TAG_CLASSES[label]}`}>
      {label}
    </span>
  )
}

