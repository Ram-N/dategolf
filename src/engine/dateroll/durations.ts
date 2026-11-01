import type { Event } from '@/types'
import type { Duration } from '@/types/dateroll'

export interface BarItem {
  id: string
  x1: number
  x2: number
  priority: number
}

/**
 * Gantt-style row packing: highest priority first, each bar takes the lowest row where
 * it overlaps no other bar (with `gapPx` between). Bars that fit in no row are dropped.
 */
export function packBars(items: BarItem[], rows: number, gapPx = 4): { id: string; row: number }[] {
  const occupied: [number, number][][] = Array.from({ length: rows }, () => [])
  const placed: { id: string; row: number }[] = []
  for (const item of [...items].sort((a, b) => b.priority - a.priority)) {
    const row = occupied.findIndex((spans) => spans.every(([a, b]) => item.x2 + gapPx <= a || item.x1 >= b + gapPx))
    if (row === -1) continue
    occupied[row]!.push([item.x1, item.x2])
    placed.push({ id: item.id, row })
  }
  return placed
}

/** The most important events in the same region during a duration, in date order. */
export function eventsDuring(events: Event[], d: Duration, limit = 8): Event[] {
  return events
    .filter((e) => e.region === d.region && e.year >= d.startYear && e.year <= d.endYear)
    .sort((a, b) => b.importance - a.importance)
    .slice(0, limit)
    .sort((a, b) => a.year - b.year)
}

/** "c. 320 – c. 550" style range for display. */
export function formatSpan(d: Duration, formatYear: (y: number) => string): string {
  const c = d.approximate ? 'c. ' : ''
  return `${c}${formatYear(d.startYear)} – ${c}${formatYear(d.endYear)}`
}
