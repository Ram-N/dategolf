import type { Event } from '@/types'
import type { Duration } from '@/types/dateflow'
import { LANES, laneFor, type LaneId } from './lanes'

// "What was happening elsewhere?" — pure queries behind the event card's Meanwhile
// section and the period summary.

export interface LaneEvents {
  lane: LaneId
  label: string
  events: Event[]
}

const byImportanceThenCloseness = (year: number) => (a: Event, b: Event) =>
  b.importance - a.importance || Math.abs(a.year - year) - Math.abs(b.year - year)

/** Top events in every *other* lane within ±windowYears of the target, in lane order. */
export function meanwhile(events: Event[], target: Event, windowYears = 50, perLane = 2): LaneEvents[] {
  const own = laneFor(target.region)
  return LANES.filter((l) => l.id !== own)
    .map((l) => ({
      lane: l.id,
      label: l.label,
      events: events
        .filter((e) => laneFor(e.region) === l.id && Math.abs(e.year - target.year) <= windowYears)
        .sort(byImportanceThenCloseness(target.year))
        .slice(0, perLane)
        .sort((a, b) => a.year - b.year),
    }))
    .filter((l) => l.events.length > 0)
}

/** The nearest events before and after the target in its own lane. */
export function beforeAndAfter(events: Event[], target: Event, count = 2): { before: Event[]; after: Event[] } {
  const lane = laneFor(target.region)
  const same = events
    .filter((e) => e.id !== target.id && laneFor(e.region) === lane)
    .sort((a, b) => a.year - b.year)
  return {
    before: same.filter((e) => e.year <= target.year).slice(-count),
    after: same.filter((e) => e.year > target.year).slice(0, count),
  }
}

/** Durations of a kind overlapping [start, end] (a single year when start === end), most important first. */
export function activeDuring(durations: Duration[], start: number, end: number, kind: Duration['kind']): Duration[] {
  return durations
    .filter((d) => d.kind === kind && d.startYear <= end && d.endYear >= start)
    .sort((a, b) => b.importance - a.importance || a.startYear - b.startYear)
}

export interface PeriodSummary {
  start: number
  end: number
  empires: Duration[]
  periods: Duration[]
  lanes: LaneEvents[]
  total: number
}

/** Everything in [start, end]: active empires and periods, and the top events per lane. */
export function summarizePeriod(
  events: Event[],
  durations: Duration[],
  start: number,
  end: number,
  perLane = 4,
): PeriodSummary {
  const inRange = events.filter((e) => e.year >= start && e.year <= end)
  const mid = (start + end) / 2
  return {
    start,
    end,
    empires: activeDuring(durations, start, end, 'empire'),
    periods: activeDuring(durations, start, end, 'period'),
    lanes: LANES.map((l) => ({
      lane: l.id,
      label: l.label,
      events: inRange
        .filter((e) => laneFor(e.region) === l.id)
        .sort(byImportanceThenCloseness(mid))
        .slice(0, perLane)
        .sort((a, b) => a.year - b.year),
    })).filter((l) => l.events.length > 0),
    total: inRange.length,
  }
}
