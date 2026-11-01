import { formatYear } from '@/utils/formatYear'

// ── View ──────────────────────────────────────────────────────────────────────
// A view is the visible window of history, in years. Pixels are always derived
// from it; the axis is strictly linear (one year = same width at a given zoom).
export interface View {
  start: number
  end: number
}

export const MIN_YEAR = -3600
export const MAX_YEAR = 2030
export const MIN_SPAN = 2
export const MAX_SPAN = MAX_YEAR - MIN_YEAR
export const FULL_VIEW: View = { start: MIN_YEAR, end: MAX_YEAR }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export const span = (view: View) => view.end - view.start

/** Build a view from a start + span, clamped to the history bounds. */
export function makeView(start: number, spanYears: number): View {
  const s = clamp(spanYears, MIN_SPAN, MAX_SPAN)
  const st = clamp(start, MIN_YEAR, MAX_YEAR - s)
  return { start: st, end: st + s }
}

export function yearToX(year: number, view: View, widthPx: number): number {
  return ((year - view.start) / span(view)) * widthPx
}

export function xToYear(x: number, view: View, widthPx: number): number {
  return view.start + (x / widthPx) * span(view)
}

/** Zoom by `factor` (<1 = zoom in) keeping `anchorYear` at the same screen position. */
export function zoomAround(view: View, anchorYear: number, factor: number): View {
  const newSpan = clamp(span(view) * factor, MIN_SPAN, MAX_SPAN)
  const frac = (anchorYear - view.start) / span(view)
  return makeView(anchorYear - frac * newSpan, newSpan)
}

export function pan(view: View, deltaYears: number): View {
  return makeView(view.start + deltaYears, span(view))
}

/** Center the view on a year with the given span. */
export function centerOn(year: number, spanYears: number): View {
  return makeView(year - spanYears / 2, spanYears)
}

// ── Ticks ─────────────────────────────────────────────────────────────────────
const TICK_STEPS = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000]

export function tickStep(view: View, widthPx: number, minGapPx = 80): number {
  const pxPerYear = widthPx / span(view)
  return TICK_STEPS.find((s) => s * pxPerYear >= minGapPx) ?? TICK_STEPS[TICK_STEPS.length - 1]!
}

export function ticks(view: View, widthPx: number, minGapPx = 80): number[] {
  const step = tickStep(view, widthPx, minGapPx)
  const out: number[] = []
  for (let y = Math.ceil(view.start / step) * step; y <= view.end; y += step) out.push(y)
  return out
}

/** Axis label. 0 is the BCE/CE boundary (there is no year 0), so label it as such. */
export function formatTick(year: number): string {
  return year === 0 ? 'BCE | CE' : formatYear(year)
}

// ── Animation ─────────────────────────────────────────────────────────────────
/**
 * View part-way (t ∈ [0, 1]) from a to b. The centre moves linearly but the span changes
 * geometrically, so a 5000 → 100 year zoom feels even instead of rushing at the start.
 */
export function interpolateView(a: View, b: View, t: number): View {
  const ca = (a.start + a.end) / 2
  const cb = (b.start + b.end) / 2
  const s = span(a) * Math.pow(span(b) / span(a), t)
  return makeView(ca + (cb - ca) * t - s / 2, s)
}

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
