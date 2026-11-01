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
  /** True position of the event on the axis — where its leader starts. */
  dotX: number
  labelWidth: number
  /** Label height in px. */
  boxH: number
  /** Vertical size of the label, in levels (box height + gap to the next label). */
  levels: number
  /** Higher is placed first. */
  priority: number
}

export interface LayoutOptions {
  /** Viewport width; labels are kept fully inside [0, width]. */
  width: number
  levelsPerSide: number
  /** Height of one level in px. */
  levelH: number
  /** Distance in px from the axis to level 0 on each side. */
  axisGap: Record<Side, number>
  /** Horizontal breathing room around each label. */
  gapPx?: number
  /** Sideways offsets (px) to try for a label, nearest first. */
  shifts?: number[]
  /** Max horizontal run of a leader per px of rise; 2 ≈ no flatter than 27°. */
  maxSlope?: number
}

export interface PlacedItem {
  id: string
  side: Side
  /** First level the label occupies, counted outward from the axis (0 = nearest). */
  level: number
  /** Horizontal centre of the label box. */
  labelX: number
  /** Where the leader meets the label's axis-facing edge. */
  leaderX: number
}

// Capped at 130px so a label never drifts far from its year — the date is what students learn.
const DEFAULT_SHIFTS = [0, 30, -30, 60, -60, 95, -95, 130, -130]

// Geometry is per side in (x, d) space: d = px distance from the axis, outward.
interface Rect {
  x1: number
  x2: number
  d1: number
  d2: number
}
interface Seg {
  x1: number
  d1: number
  x2: number
  d2: number
}

/** Does the segment pass through the rect's interior? (Liang–Barsky clip, rect shrunk 0.5px.) */
export function segmentHitsRect(s: Seg, r: Rect): boolean {
  const [rx1, rx2, rd1, rd2] = [r.x1 + 0.5, r.x2 - 0.5, r.d1 + 0.5, r.d2 - 0.5]
  if (rx1 >= rx2 || rd1 >= rd2) return false
  const dx = s.x2 - s.x1
  const dd = s.d2 - s.d1
  let t0 = 0
  let t1 = 1
  const clip = (p: number, q: number) => {
    if (p === 0) return q >= 0
    const t = q / p
    if (p < 0) {
      if (t > t1) return false
      if (t > t0) t0 = t
    } else {
      if (t < t0) return false
      if (t < t1) t1 = t
    }
    return true
  }
  return (
    clip(-dx, s.x1 - rx1) &&
    clip(dx, rx2 - s.x1) &&
    clip(-dd, s.d1 - rd1) &&
    clip(dd, rd2 - s.d1) &&
    t1 - t0 > 1e-9
  )
}

/** Do two leaders cross (or run along each other)? Sharing only a start point is fine. */
export function segmentsCross(a: Seg, b: Seg): boolean {
  const orient = (ax: number, ad: number, bx: number, bd: number, cx: number, cd: number) =>
    (bx - ax) * (cd - ad) - (bd - ad) * (cx - ax)
  const o1 = orient(a.x1, a.d1, a.x2, a.d2, b.x1, b.d1)
  const o2 = orient(a.x1, a.d1, a.x2, a.d2, b.x2, b.d2)
  const o3 = orient(b.x1, b.d1, b.x2, b.d2, a.x1, a.d1)
  const o4 = orient(b.x1, b.d1, b.x2, b.d2, a.x2, a.d2)
  const eps = 1e-6
  if (Math.abs(o1) < eps && Math.abs(o2) < eps) {
    // Collinear: conflict if they overlap by more than a pixel (e.g. two stacked vertical leaders).
    const lenA = Math.hypot(a.x2 - a.x1, a.d2 - a.d1)
    const proj = (x: number, d: number) => ((x - a.x1) * (a.x2 - a.x1) + (d - a.d1) * (a.d2 - a.d1)) / lenA
    const [p1, p2] = [proj(b.x1, b.d1), proj(b.x2, b.d2)].sort((m, n) => m - n)
    return Math.min(lenA, p2!) - Math.max(0, p1!) > 1
  }
  return o1 * o2 < -eps && o3 * o4 < -eps
}

/**
 * Greedy callout layout on both sides of the axis. Highest priority first; each label
 * tries slots ordered by cost (nearer the axis, then nearer its own dot, alternating
 * above/below) and takes the first one where:
 *  - it overlaps no other label,
 *  - its leader (dot → label) passes through no other label and crosses no other leader,
 *  - no existing leader passes through it,
 *  - the leader is no flatter than `maxSlope`.
 * Labels that fit nowhere are dropped. Ties in priority keep input order.
 */
export function layoutLabels(items: LayoutItem[], opts: LayoutOptions): PlacedItem[] {
  const { width, levelsPerSide, levelH, axisGap, gapPx = 6, shifts = DEFAULT_SHIFTS, maxSlope = 2 } = opts

  // Candidate slots, cheapest first: one level outward costs about as much as a 60px shift.
  const slots: { level: number; shift: number; side: Side }[] = []
  for (let level = 0; level < levelsPerSide; level++) {
    for (const shift of shifts) for (const side of ['above', 'below'] as Side[]) slots.push({ level, shift, side })
  }
  slots.sort((a, b) => a.level + Math.abs(a.shift) / 60 - (b.level + Math.abs(b.shift) / 60))

  const boxes: Record<Side, { rect: Rect; levelLo: number; levelHi: number }[]> = { above: [], below: [] }
  const leaders: Record<Side, Seg[]> = { above: [], below: [] }
  const placed: PlacedItem[] = []

  for (const item of [...items].sort((a, b) => b.priority - a.priority)) {
    const half = item.labelWidth / 2
    if (half * 2 + 4 > width) continue

    for (const { level, shift, side } of slots) {
      if (level + item.levels > levelsPerSide) continue
      const labelX = Math.min(Math.max(item.dotX + shift, half + 2), width - half - 2)
      if (shift !== 0 && Math.abs(labelX - item.dotX) < Math.abs(shift) - 1) continue // clamped onto another slot

      const d0 = axisGap[side] + level * levelH
      const rect: Rect = { x1: labelX - half - gapPx, x2: labelX + half + gapPx, d1: d0, d2: d0 + item.boxH }
      const leaderX = Math.min(Math.max(item.dotX, labelX - half + 6), labelX + half - 6)
      if (Math.abs(leaderX - item.dotX) > maxSlope * d0) continue
      const leader: Seg = { x1: item.dotX, d1: 0, x2: leaderX, d2: d0 }

      const levelHi = level + item.levels
      const clash = boxes[side].some(
        (b) =>
          (b.levelLo < levelHi && level < b.levelHi && b.rect.x1 < rect.x2 && rect.x1 < b.rect.x2) ||
          segmentHitsRect(leader, b.rect),
      )
      if (clash) continue
      if (leaders[side].some((l) => segmentHitsRect(l, rect) || segmentsCross(l, leader))) continue

      boxes[side].push({ rect, levelLo: level, levelHi })
      leaders[side].push(leader)
      placed.push({ id: item.id, side, level, labelX, leaderX })
      break
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
