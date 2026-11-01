// Progressive disclosure: zooming reveals more history rather than enlarging markers.
// Two filters: an importance threshold driven by the visible span, then a
// collision-aware layout that drops whatever doesn't fit on screen.

/** Events below this importance are hidden at the given visible span (years). Tuned to events.json (importance 2–9). */
export function minImportanceForSpan(spanYears: number): number {
  if (spanYears > 1500) return 7
  if (spanYears > 300) return 5
  if (spanYears > 50) return 4
  return 0
}

export interface LayoutItem {
  id: string
  x: number
  labelWidth: number
  importance: number
}

export interface PlacedItem {
  id: string
  x: number
  row: number
}

/**
 * Greedy label layout: most important first, each label (centered on x) goes in the
 * lowest row where it doesn't overlap an already-placed label. Items that fit in no
 * row are dropped. Ties in importance keep input order.
 */
export function layoutLabels(items: LayoutItem[], rows: number, gapPx = 6): PlacedItem[] {
  const occupied: [number, number][][] = Array.from({ length: rows }, () => [])
  const placed: PlacedItem[] = []
  const sorted = [...items].sort((a, b) => b.importance - a.importance)

  for (const item of sorted) {
    const lo = item.x - item.labelWidth / 2 - gapPx
    const hi = item.x + item.labelWidth / 2 + gapPx
    const row = occupied.findIndex((spans) => spans.every(([a, b]) => hi <= a || lo >= b))
    if (row === -1) continue
    occupied[row]!.push([lo, hi])
    placed.push({ id: item.id, x: item.x, row })
  }
  return placed
}
