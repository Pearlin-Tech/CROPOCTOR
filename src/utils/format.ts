/** Digit mapping for languages with native numerals */
const DIGIT_MAPS: Record<string, string[]> = {
  hi: ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'],
  gu: ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'],
  ar: ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'],
  fa: ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'],
}

/** Translate digits in any string or number based on the current language */
export const formatLocalizedNumber = (val: number | string | undefined | null, lang: string = 'en'): string => {
  if (val === undefined || val === null) return ''
  const str = String(val)
  const map = DIGIT_MAPS[lang] || DIGIT_MAPS[lang.split('-')[0]]
  if (!map) return str
  return str.replace(/\d/g, (d) => map[parseInt(d, 10)] || d)
}

/** Format percentage according to language */
export const formatLocalizedPercent = (val: number | string, lang: string = 'en'): string => {
  const formattedNum = formatLocalizedNumber(val, lang)
  const isRtlLang = lang === 'ar' || lang === 'fa'
  return isRtlLang ? `${formattedNum}٪` : `${formattedNum}%`
}

/** Format a number with unit */
export const formatArea = (value: number, unit: 'acres' | 'hectares', lang: string = 'en'): string =>
  `${formatLocalizedNumber(value.toFixed(2), lang)} ${unit}`

/** Format temperature */
export const formatTemp = (value: number, unit: 'celsius' | 'fahrenheit' = 'celsius', lang: string = 'en'): string => {
  const tempVal = unit === 'celsius' ? Math.round(value) : Math.round((value * 9) / 5 + 32)
  const unitLabel = unit === 'celsius' ? '°C' : '°F'
  return `${formatLocalizedNumber(tempVal, lang)}${unitLabel}`
}

/** Relative time label */
export const timeAgo = (isoString: string): string => {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(isoString).toLocaleDateString()
}

/** Greeting based on time of day */
export const getGreeting = (): 'morning' | 'afternoon' | 'evening' => {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

/** Debounce */
export const debounce = <T extends (...args: unknown[]) => unknown>(fn: T, ms: number) => {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

/** Truncate text */
export const truncate = (text: string, max: number): string =>
  text.length > max ? text.slice(0, max) + '…' : text

/** Convert acres ↔ hectares */
export const acresToHectares = (acres: number) => acres * 0.404686
export const hectaresToAcres = (ha: number) => ha / 0.404686
