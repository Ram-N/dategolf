// Century colour bands (doc 18, 5c): when zoomed in far enough, each century gets a faint background wash,
// two shades alternating, sepia for BCE and a cooler pair for CE, so the eye feels time passing.

/** Centuries are drawn when the view spans at most this many years; wider than that, the era shading is used. */
export const CENTURY_MAX_SPAN = 2000

export interface CenturyBand {
  /** Edges in timeline coordinates (signed years; there is no year 0, so 1 BCE and 1 CE sit either side of 0). */
  start: number
  end: number
  bce: boolean
  shade: 0 | 1
  label: string
}

/**
 * The centuries overlapping [start, end]. CE bands run from 1700 to 1799 ("the 1700s"); BCE bands run backwards
 * the same way, 199–100 BCE being "the 100s BCE". The bands nearest the epoch are named by their years
 * ("1–99", "99–1 BCE"), since "the 0s" isn't a thing.
 */
export function centuryBands(start: number, end: number): CenturyBand[] {
  const out: CenturyBand[] = []
  for (let k = Math.floor(start / 100); k * 100 < end; k++) {
    const bce = k < 0
    const label = k >= 1 ? `${k * 100}s` : k === 0 ? '1–99' : k === -1 ? '99–1 BCE' : `${(-k - 1) * 100}s BCE`
    out.push({ start: k * 100, end: (k + 1) * 100, bce, shade: (((k % 2) + 2) % 2) as 0 | 1, label })
  }
  return out
}
