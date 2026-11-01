// Years are plain integers: negative = BCE (-44 = 44 BCE). There is no year 0.

export function formatYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} BCE` : String(year)
}

/** Parse user input like "1453", "500 BC", "500 BCE", "-500", "1066 AD". Returns null if unparseable. */
export function parseYear(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/\./g, '')
  const m = s.match(/^(ad|ce)?\s*(-)?\s*(\d{1,4})\s*(bce|bc|ce|ad)?$/)
  if (!m) return null
  const n = Number(m[3])
  const isBce = m[2] === '-' || m[4] === 'bc' || m[4] === 'bce'
  return isBce ? -n : n
}
