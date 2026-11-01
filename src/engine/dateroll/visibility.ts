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

/** Word-wrap a label to at most `maxLines` lines of ~`maxChars`; the last line gets "…" if text remains. */
export function wrapLabel(text: string, maxChars = 20, maxLines = 3): string[] {
  const lines: string[] = []
  let current = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = current ? `${current} ${word}` : word
    if (next.length <= maxChars || !current) {
      current = next
    } else {
      lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)

  const out = lines.slice(0, maxLines).map((l) => (l.length > maxChars ? l.slice(0, maxChars - 1) + '…' : l))
  if (lines.length > maxLines) {
    const last = out[maxLines - 1]!
    out[maxLines - 1] = (last.length >= maxChars ? last.slice(0, maxChars - 1) : last) + '…'
  }
  return out
}

export type Side = 'above' | 'below'

export interface LayoutItem {
  id: string
  /** Horizontal centre of the label box (may be clamped inside the viewport). */
  x: number
  /** True position of the event on the axis — where its leader line runs. */
  dotX: number
  labelWidth: number
  /** Vertical size of the label, in levels. */
  levels: number
  /** Higher is placed first. */
  priority: number
}

export interface PlacedItem {
  id: string
  side: Side
  /** First level the label occupies, counted outward from the axis (0 = nearest). */
  level: number
}

/**
 * Greedy label layout on both sides of the axis. Highest priority first; each label
 * takes the nearest free slot (alternating above/below) such that:
 *  - it overlaps no other label,
 *  - its own leader (axis → label) crosses no label nearer the axis,
 *  - no already-placed leader runs through it.
 * Labels that fit nowhere are dropped. Ties in priority keep input order.
 */
export function layoutLabels(items: LayoutItem[], levelsPerSide: number, gapPx = 6): PlacedItem[] {
  type Span = [number, number]
  const sides: Side[] = ['above', 'below']
  const labels: Record<Side, Span[][]> = {
    above: Array.from({ length: levelsPerSide }, () => []),
    below: Array.from({ length: levelsPerSide }, () => []),
  }
  // A leader runs through every level below the label it ends at.
  const leaders: Record<Side, { x: number; through: number }[]> = { above: [], below: [] }
  const placed: PlacedItem[] = []
  const overlaps = ([a, b]: Span, lo: number, hi: number) => hi > a && lo < b
  const contains = ([a, b]: Span, x: number) => x > a && x < b

  for (const item of [...items].sort((a, b) => b.priority - a.priority)) {
    const lo = item.x - item.labelWidth / 2 - gapPx
    const hi = item.x + item.labelWidth / 2 + gapPx

    const fits = (side: Side, level: number) => {
      for (let l = level; l < level + item.levels; l++) {
        if (labels[side][l]!.some((s) => overlaps(s, lo, hi))) return false
        if (leaders[side].some((ld) => ld.through > l && ld.x > lo && ld.x < hi)) return false
      }
      for (let l = 0; l < level; l++) {
        if (labels[side][l]!.some((s) => contains(s, item.dotX))) return false
      }
      return true
    }

    search: for (let level = 0; level + item.levels <= levelsPerSide; level++) {
      for (const side of sides) {
        if (!fits(side, level)) continue
        for (let l = level; l < level + item.levels; l++) labels[side][l]!.push([lo, hi])
        leaders[side].push({ x: item.dotX, through: level })
        placed.push({ id: item.id, side, level })
        break search
      }
    }
  }
  return placed
}

/**
 * Milestone section lines, given in rank order (most significant first). A line is kept
 * only if it is at least `minGapPx` from every higher-ranked kept line, so wide zooms
 * show a few evenly spread sections and zooming in reveals the rest.
 */
export function spaceMilestones<T extends { x: number }>(ranked: T[], minGapPx: number): T[] {
  const kept: T[] = []
  for (const m of ranked) {
    if (kept.every((k) => Math.abs(k.x - m.x) >= minGapPx)) kept.push(m)
  }
  return kept
}
