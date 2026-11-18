import type { Event } from '@/types'
import type { Duration, Relationship } from '@/types/dateflow'

// Step 4 (issues #3, #4, #9): one navigation over an ordered set of events and spans.
// A set comes from a free-text search or from whatever the filters let through; the
// panel steps through it, plays it, and scrubs it.

export interface TourStop {
  id: string
  kind: 'event' | 'span'
  name: string
  year: number // an event's year, a span's start
  endYear?: number // spans only
  approximate?: boolean
  dateDisplay?: string // an approximate event's true range
  description: string
  significance?: string
  region: string
  importance: number
  /** Found because it is part of a span that matched ("Taj Mahal" for "Mughal"). */
  via?: string
}

export const MIN_QUERY = 2

/** Lower-case words with accents stripped: "Führer" → ["fuhrer"]. */
export function words(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
}

/**
 * Every query word starts a word of the same name or alias ("mugh" finds "Mughal", "rome" doesn't
 * find "Jerome", and "world war" doesn't pair "world" in one alias with "war" in another).
 */
function matches(queryWords: string[], texts: string[]): boolean {
  return texts.some((t) => {
    const ws = words(t)
    return queryWords.every((q) => ws.some((w) => w.startsWith(q)))
  })
}

export function eventStop(e: Event, via?: string): TourStop {
  return {
    id: e.id, kind: 'event', name: e.name, year: e.year, approximate: e.approximate, dateDisplay: e.dateDisplay,
    description: e.description, significance: e.significance, region: e.region, importance: e.importance,
    ...(via ? { via } : {}),
  }
}

export function spanStop(d: Duration, via?: string): TourStop {
  return {
    id: d.id, kind: 'span', name: d.name, year: d.startYear, endYear: d.endYear, approximate: d.approximate,
    description: d.description, significance: d.significance, region: d.region, importance: d.importance,
    ...(via ? { via } : {}),
  }
}

/** Time order; on the same year a span (the frame) before its events, then the more important first. */
export function sortStops(stops: TourStop[]): TourStop[] {
  return [...stops].sort(
    (a, b) => a.year - b.year || (a.kind === b.kind ? 0 : a.kind === 'span' ? -1 : 1) ||
      b.importance - a.importance || a.name.localeCompare(b.name),
  )
}

/**
 * Free-text search over names and aliases (never the year or description). A matching span
 * also brings in everything reviewed as `part_of` it, at any depth: "Mughal" finds the
 * Mughal Empire, Shah Jahan's reign inside it, and the Taj Mahal inside that.
 */
export function searchStops(query: string, events: Event[], durations: Duration[], links: Relationship[]): TourStop[] {
  const q = words(query)
  if (query.trim().length < MIN_QUERY || !q.length) return []

  const eventById = new Map(events.map((e) => [e.id, e]))
  const spanById = new Map(durations.map((d) => [d.id, d]))
  const found = new Map<string, TourStop>()
  for (const e of events) if (matches(q, [e.name, ...e.aliases])) found.set(e.id, eventStop(e))
  for (const d of durations) if (matches(q, [d.name])) found.set(d.id, spanStop(d))

  const parts = new Map<string, string[]>() // span → its direct parts
  for (const l of links) {
    if (l.type !== 'part_of' || !spanById.has(l.target)) continue
    parts.set(l.target, [...(parts.get(l.target) ?? []), l.source])
  }
  const queue = [...found.values()].filter((s) => s.kind === 'span')
  while (queue.length) {
    const parent = queue.shift()!
    for (const id of parts.get(parent.id) ?? []) {
      if (found.has(id)) continue
      const via = parent.via ?? parent.name // name the span the query matched, not the middle layer
      const e = eventById.get(id)
      const d = spanById.get(id)
      if (e) found.set(id, eventStop(e, via))
      else if (d) {
        const s = spanStop(d, via)
        found.set(id, s)
        queue.push(s)
      }
    }
  }
  return sortStops([...found.values()])
}

/** One step through `length` stops from `at` (null = the overview); past either end, back to the overview. */
export function stepIndex(at: number | null, delta: 1 | -1, length: number): number | null {
  if (!length) return null
  const next = at === null ? (delta > 0 ? 0 : length - 1) : at + delta
  return next < 0 || next >= length ? null : next
}

export type TourSpeed = 'slow' | 'normal' | 'fast'
export const TOUR_SPEEDS: { id: TourSpeed; label: string; ms: number }[] = [
  { id: 'slow', label: 'Slow', ms: 6000 },
  { id: 'normal', label: 'Normal', ms: 3500 },
  { id: 'fast', label: 'Fast', ms: 1500 },
]
