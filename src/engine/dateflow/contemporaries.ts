import type { Event } from '@/types'
import type { Duration } from '@/types/dateflow'
import { activeDuring } from './explore'
import { LANES, laneFor, type LaneId } from './lanes'
import { yearGap } from './stories'
import { approxMinGap } from '../datepick/distractorEngine'

// Contemporaries (Phase 10): "What was happening elsewhere in the world at the same time?"
// Pure queries behind the Time Machine panel. They describe what's in DateFlow, not everything
// that happened: a region with nothing is kept and marked empty, never silently dropped.

export interface ActiveSpan {
  span: Duration
  since: number // years since it began (0 = its first year)
  until: number // years until it ends (0 = its last year)
  uncertain: boolean // an approximate start or end lies close to the chosen year
}

export interface RegionNow {
  lane: LaneId
  label: string
  spans: ActiveSpan[]
  events: Event[]
}

export interface WorldAt {
  year: number
  window: number
  regions: RegionNow[]
  spanCount: number
  eventCount: number
}

const byImportanceThenCloseness = (year: number) => (a: Event, b: Event) =>
  b.importance - a.importance || Math.abs(yearGap(a.year, year)) - Math.abs(yearGap(b.year, year))

/** The world in one year: each region's active empires and periods, and the events nearby. */
export function worldAt(year: number, events: Event[], durations: Duration[], window = 25, perLane = 4): WorldAt {
  const active = [...activeDuring(durations, year, year, 'empire'), ...activeDuring(durations, year, year, 'period')]
  const fuzz = approxMinGap(year)
  const regions = LANES.map((l) => {
    const spans = active
      .filter((d) => laneFor(d.region) === l.id)
      .map((span) => {
        const since = yearGap(span.startYear, year)
        const until = yearGap(year, span.endYear)
        return { span, since, until, uncertain: !!span.approximate && (since <= fuzz || until <= fuzz) }
      })
      .sort((a, b) => b.span.importance - a.span.importance || a.span.startYear - b.span.startYear)
    const nearby = events
      .filter((e) => laneFor(e.region) === l.id && Math.abs(yearGap(e.year, year)) <= window)
      .sort(byImportanceThenCloseness(year))
      .slice(0, perLane)
      .sort((a, b) => a.year - b.year)
    return { lane: l.id, label: l.label, spans, events: nearby }
  })
  return {
    year,
    window,
    regions,
    spanCount: active.length,
    eventCount: regions.reduce((n, r) => n + r.events.length, 0),
  }
}

export interface RegionChange {
  lane: LaneId
  label: string
  gone: Duration[] // active in the earlier year, not the later
  new: Duration[] // active in the later year, not the earlier
  continuing: Duration[] // active in both
  cameAndWent: Duration[] // began and ended between the two years
}

export interface YearComparison {
  from: number
  to: number
  regions: RegionChange[]
  totals: { gone: number; new: number; continuing: number; cameAndWent: number }
}

/** How the world changed between two years (given in either order). */
export function compareYears(a: number, b: number, durations: Duration[]): YearComparison {
  const [from, to] = a <= b ? [a, b] : [b, a]
  const at = (d: Duration, y: number) => d.startYear <= y && d.endYear >= y
  const byImportance = (x: Duration, y: Duration) => y.importance - x.importance || x.startYear - y.startYear
  const regions = LANES.map((l) => {
    const mine = durations.filter((d) => laneFor(d.region) === l.id)
    return {
      lane: l.id,
      label: l.label,
      gone: mine.filter((d) => at(d, from) && !at(d, to)).sort(byImportance),
      new: mine.filter((d) => !at(d, from) && at(d, to)).sort(byImportance),
      continuing: mine.filter((d) => at(d, from) && at(d, to)).sort(byImportance),
      cameAndWent: mine.filter((d) => d.startYear > from && d.endYear < to).sort(byImportance),
    }
  })
  const total = (k: 'gone' | 'new' | 'continuing' | 'cameAndWent') => regions.reduce((n, r) => n + r[k].length, 0)
  return {
    from,
    to,
    regions,
    totals: { gone: total('gone'), new: total('new'), continuing: total('continuing'), cameAndWent: total('cameAndWent') },
  }
}

export type Overlap =
  | { kind: 'overlap'; start: number; end: number; years: number; approximate: boolean }
  | { kind: 'apart'; first: Duration; second: Duration; years: number; approximate: boolean }

/** How long two spans coexisted, or how far apart they were. */
export function overlap(a: Duration, b: Duration): Overlap {
  const approximate = !!(a.approximate || b.approximate)
  const start = Math.max(a.startYear, b.startYear)
  const end = Math.min(a.endYear, b.endYear)
  if (start <= end) return { kind: 'overlap', start, end, years: yearGap(start, end), approximate }
  const [first, second] = a.endYear < b.startYear ? [a, b] : [b, a]
  return { kind: 'apart', first, second, years: yearGap(first.endYear, second.startYear), approximate }
}

export interface Surprise {
  subject: Event // the event being compared
  near: Event // the famous event it's closer to…
  toNear: number
  far: Event // …than to the other one chosen
  toFar: number
}

export interface Distance {
  earlier: Event
  later: Event
  years: number
  approximate: boolean
  between: number // DateFlow events strictly between them
  surprise: Surprise | null
}

/**
 * The years between two events, and, when there is one, a surprising comparison:
 * "Caesar's assassination is closer in time to the Moon landing than to the Great Pyramid."
 * The third event is famous (a milestone first; failing that, importance 8+), and the farthest one
 * that is still closer, so the comparison is striking rather than trivial. Gaps under 200 years get none.
 */
export function distance(a: Event, b: Event, events: Event[], milestoneIds: string[] = []): Distance {
  const [earlier, later] = a.year <= b.year ? [a, b] : [b, a]
  const years = yearGap(earlier.year, later.year)
  const famous = new Set(milestoneIds)
  const others = events.filter((e) => e.id !== a.id && e.id !== b.id)
  // Milestones are the landmarks students recognise; very important events only if no milestone fits.
  const tiers = [others.filter((e) => famous.has(e.id)), others.filter((e) => !famous.has(e.id) && e.importance >= 8)]
  let surprise: Surprise | null = null
  for (const candidates of tiers) {
    if (years < 200 || surprise) break
    // After the later event: is the later one closer to something far ahead than to the earlier one?
    const ahead = candidates.filter((c) => c.year > later.year && yearGap(later.year, c.year) < years)
    const behind = candidates.filter((c) => c.year < earlier.year && yearGap(c.year, earlier.year) < years)
    const best = (list: Event[], from: Event) =>
      list.sort((x, y) => Math.abs(yearGap(from.year, y.year)) - Math.abs(yearGap(from.year, x.year)))[0]
    const c1 = best(ahead, later)
    const c2 = best(behind, earlier)
    const pick = [
      c1 && { subject: later, near: c1, toNear: yearGap(later.year, c1.year), far: earlier, toFar: years },
      c2 && { subject: earlier, near: c2, toNear: yearGap(c2.year, earlier.year), far: later, toFar: years },
    ].filter((x): x is Surprise => !!x)
    // The more striking one: the nearer gap closest to the far one.
    surprise = pick.sort((x, y) => y.toNear / y.toFar - x.toNear / x.toFar)[0] ?? null
  }
  return {
    earlier,
    later,
    years,
    approximate: !!(a.approximate || b.approximate),
    between: events.filter((e) => e.year > earlier.year && e.year < later.year).length,
    surprise,
  }
}
