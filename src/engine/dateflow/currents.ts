import type { Span } from '@/types/dateflow'

// Historical Currents (Phase 11, step 3d): long movements drawn as translucent bands behind the
// timeline. At most CURRENT_CAP bands overlap at any year in view; the most important win.

export const CURRENT_CAP = 3

export interface CurrentBand {
  id: string
  name: string
  startYear: number
  endYear: number
  approximate?: boolean
  region: string
  /** 0 … cap − 1: which label row it takes, so overlapping bands' names don't collide. */
  row: number
}

const overlaps = (a: [number, number], b: [number, number]) => a[0] <= b[1] && b[0] <= a[1]

/** The most bands covering any single year of `range`. */
function depthWithin(range: [number, number], others: [number, number][]): number {
  const inside = others
    .filter((o) => overlaps(o, range))
    .map(([s, e]): [number, number] => [Math.max(s, range[0]), Math.min(e, range[1])])
  // Sweep: +1 at each start, −1 just after each end; starts sort before ends on the same year.
  const edges = inside.flatMap(([s, e]) => [[s, 1], [e, -1]] as const).sort((a, b) => a[0] - b[0] || b[1] - a[1])
  let depth = 0
  let max = 0
  for (const [, d] of edges) max = Math.max(max, (depth += d))
  return max
}

/**
 * The currents to draw for the years start…end: every flagged span in view, most important first
 * (then the one with more of itself in view), skipping any that would make a year hold more than `cap`.
 */
export function pickCurrents(durations: Span[], start: number, end: number, cap = CURRENT_CAP): CurrentBand[] {
  const visible = (d: Span) => Math.min(d.endYear, end) - Math.max(d.startYear, start)
  const candidates = durations
    .filter((d) => d.current && d.endYear >= start && d.startYear <= end)
    .sort((a, b) => b.importance - a.importance || visible(b) - visible(a) || a.name.localeCompare(b.name))

  const chosen: Span[] = []
  const clip = (d: Span): [number, number] => [Math.max(d.startYear, start), Math.min(d.endYear, end)]
  for (const d of candidates) {
    if (depthWithin(clip(d), chosen.map(clip)) < cap) chosen.push(d)
  }

  // Label rows: in time order, each band takes the lowest row its overlapping neighbours (in view) left
  // free. Greedy by start uses no more rows than the deepest overlap, so rows stay below the cap.
  const bands: (CurrentBand & { clipped: [number, number] })[] = []
  for (const d of [...chosen].sort((a, b) => a.startYear - b.startYear || a.name.localeCompare(b.name))) {
    const taken = new Set(bands.filter((b) => overlaps(b.clipped, clip(d))).map((b) => b.row))
    let row = 0
    while (taken.has(row)) row++
    bands.push({ id: d.id, name: d.name, startYear: d.startYear, endYear: d.endYear, approximate: d.approximate,
                 region: d.region, row,
                 clipped: clip(d) })
  }
  return bands.map(({ clipped: _, ...b }) => b)
}
