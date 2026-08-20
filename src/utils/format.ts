/** Format a number with unit */
export const formatArea = (value: number, unit: 'acres' | 'hectares'): string =>
  `${value.toFixed(2)} ${unit}`

/** Format temperature */
export const formatTemp = (value: number, unit: 'celsius' | 'fahrenheit' = 'celsius'): string =>
  unit === 'celsius' ? `${Math.round(value)}°C` : `${Math.round(value * 9/5 + 32)}°F`

/** Relative time label */
export const timeAgo = (isoString: string): string => {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)   return 'Just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7)   return `${days}d ago`
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
