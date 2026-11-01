// ── Duration ──────────────────────────────────────────────────────────────────
// Something that lasted: an empire/dynasty, or a period (war, movement, era).
// Source: src/data/durations.json (validate with scripts/validate-durations.cjs).
export interface Duration {
  id: string
  name: string
  startYear: number // BCE years are negative, like Event.year
  endYear: number
  description: string
  categories: string[]
  region: string
  importance: number // 1–9, same scale as events
  kind: 'empire' | 'period'
  approximate?: boolean // start/end are traditional or disputed dates
}
