export const DIGIT_MAPS: Record<string, Record<string, string>> = {
  hi: { '0': '०', '1': '१', '2': '२', '3': '३', '4': '४', '5': '५', '6': '६', '7': '७', '8': '८', '9': '९' },
  gu: { '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪', '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯' },
  ar: { '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤', '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩' },
}

/**
 * Replaces ASCII digits (0-9) in any text string with localized script digits
 * (Devanagari for Hindi, Gujarati for Gujarati, Arabic-Indic for Arabic).
 */
export const formatNumbersInText = (text: string | number | undefined | null, language: string): string => {
  if (text === undefined || text === null) return ''
  const str = String(text)
  const map = DIGIT_MAPS[language]
  if (!map) return str
  return str.replace(/[0-9]/g, digit => map[digit] || digit)
}

/**
 * Formats a single number or numerical string into localized digits.
 */
export const formatNumber = (num: number | string | undefined | null, language: string): string => {
  return formatNumbersInText(num, language)
}

/**
 * Formats a date string, timestamp, or Date object into localized numeric date.
 */
export const formatDate = (dateInput: string | number | Date | undefined | null, language: string): string => {
  if (!dateInput) return ''
  
  // If date is already in DD/MM/YYYY string format
  if (typeof dateInput === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateInput)) {
    return formatNumbersInText(dateInput, language)
  }

  const d = new Date(dateInput)
  if (isNaN(d.getTime())) {
    return formatNumbersInText(String(dateInput), language)
  }

  const formatted = d.toLocaleDateString(language, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
  return formatNumbersInText(formatted, language)
}
