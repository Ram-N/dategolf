import type { Event } from '@/types'
import type { Span, RelationshipData } from '@/types/dateflow'
import { gapText } from './stories'
import { eventStop, spanStop, type TourStop } from './tour'
import { formatYear } from '@/utils/formatYear'

// Phase 14: curated journeys (journeys.json, reviewed), played stop by stop in the Story panel.
// A stop shows existing events and spans and has no dates of its own: its years come from its items.
// Between two stops the panel shows a reviewed link between them if there is one, else plain time
// ("then, 357 years later"), never an implied cause.

export interface JourneyData {
  id: string
  title: string
  intro: string
  closing?: string
  question?: string
  stops: { items: string[]; title?: string; narration: string; question?: string }[]
}

/** How a stop follows the one before it. */
export type Bridge =
  | { kind: 'link'; text: string; why: string; debated: boolean }
  | { kind: 'overlap' }
  | { kind: 'gap'; text: string }

export interface JourneyStop {
  title: string // the stop's own title, or its only item's name
  items: TourStop[] // the first one frames the stop
  narration: string
  question?: string
  start: number
  end: number
  approximate: boolean
  bridge: Bridge | null // null for the first stop
}

export interface Journey {
  id: string
  title: string
  intro: string
  closing?: string
  question?: string
  stops: JourneyStop[]
  start: number
  end: number
}

/** A link between two stops, if any (either direction), preferring causes and frames over context. */
const ROLE_RANK: Record<string, number> = { cause: 0, frame: 1, sequence: 2, context: 3 }

function linkBetween(prev: TourStop[], next: TourStop[], data: RelationshipData): Bridge | null {
  const a = new Set(prev.map((s) => s.id))
  const b = new Set(next.map((s) => s.id))
  const name = new Map([...prev, ...next].map((s) => [s.id, s.name]))
  const found = data.links
    .filter((l) => (a.has(l.source) && b.has(l.target)) || (b.has(l.source) && a.has(l.target)))
    .filter((l) => data.types[l.type])
    .sort((x, y) => (ROLE_RANK[data.types[x.type]!.story] ?? 9) - (ROLE_RANK[data.types[y.type]!.story] ?? 9))
  const l = found[0]
  if (!l) return null
  return {
    kind: 'link',
    text: `${name.get(l.source)} ${data.types[l.type]!.label} ${name.get(l.target)}`,
    why: l.why,
    debated: l.confidence === 'medium' || l.confidence === 'low',
  }
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function bridge(prev: JourneyStop, next: Omit<JourneyStop, 'bridge'>, data: RelationshipData): Bridge {
  const link = linkBetween(prev.items, next.items, data)
  if (link) return link
  if (next.start <= prev.end) return { kind: 'overlap' }
  return { kind: 'gap', text: capitalise(gapText(prev.end, next.start, prev.approximate || next.approximate)) }
}

/**
 * A journey with its items looked up. A shared id reads as its span (like Connections). An item the
 * app doesn't have is skipped, and a stop left empty is dropped (the exporter shouldn't let either happen).
 */
export function resolveJourney(
  j: JourneyData,
  events: Event[],
  durations: Span[],
  data: RelationshipData,
): Journey | null {
  const spans = new Map(durations.map((d) => [d.id, d]))
  const evs = new Map(events.map((e) => [e.id, e]))
  const stops: JourneyStop[] = []
  for (const s of j.stops) {
    const items = s.items
      .map((id) => {
        const d = spans.get(id)
        if (d) return spanStop(d)
        const e = evs.get(id)
        return e ? eventStop(e) : null
      })
      .filter((x): x is TourStop => !!x)
    if (!items.length) continue
    const stop = {
      title: s.title ?? items[0]!.name,
      items,
      narration: s.narration,
      ...(s.question ? { question: s.question } : {}),
      start: Math.min(...items.map((x) => x.year)),
      end: Math.max(...items.map((x) => x.endYear ?? x.year)),
      approximate: items.some((x) => x.approximate),
    }
    const prev = stops[stops.length - 1]
    stops.push({ ...stop, bridge: prev ? bridge(prev, stop, data) : null })
  }
  if (!stops.length) return null
  return {
    id: j.id,
    title: j.title,
    intro: j.intro,
    ...(j.closing ? { closing: j.closing } : {}),
    ...(j.question ? { question: j.question } : {}),
    stops,
    start: Math.min(...stops.map((s) => s.start)),
    end: Math.max(...stops.map((s) => s.end)),
  }
}

/**
 * The ids a step rings on the timeline: the stop's items and its neighbours' (so the eye can follow from
 * one stop to the next; the current stop is spotlit on top), or every item at the intro and the end.
 */
export function journeyIds(j: Journey, step: number | null): Set<string> {
  const stops = step === null || !j.stops[step] ? j.stops : j.stops.slice(Math.max(0, step - 1), step + 2)
  return new Set(stops.flatMap((s) => s.items.map((x) => x.id)))
}

/** A stop's years as students read them: "c. 1519–1858", or one year. */
export function stopRange(s: JourneyStop): string {
  const c = s.approximate ? 'c. ' : ''
  return s.end === s.start ? `${c}${formatYear(s.start)}` : `${c}${formatYear(s.start)}–${formatYear(s.end)}`
}

/**
 * The years to frame for stop i. A single year gets `pointSpan` around it. The frame then reaches far enough
 * to show the end of the previous stop and the start of the next, but only when they are near (within half
 * the frame), so a short stop isn't stretched to reach one centuries away. A neighbour that overlaps the
 * stop is already in view.
 */
export function stopFrame(j: Journey, i: number, pointSpan: number): [number, number] {
  const s = j.stops[i]!
  let [a, b] = s.end === s.start ? [s.start - pointSpan / 2, s.start + pointSpan / 2] : [s.start, s.end]
  const reach = (b - a) / 2
  const peek = (b - a) * 0.1 // how much of the neighbour shows
  const prev = j.stops[i - 1]
  const next = j.stops[i + 1]
  const [a0, b0] = [a, b]
  if (prev && prev.end < a0 && a0 - prev.end <= reach) a = prev.end - peek
  if (next && next.start > b0 && next.start - b0 <= reach) b = next.start + peek
  return [a, b]
}

/**
 * The next step: null is the intro, 0…n-1 the stops, n the end. Back from the intro stays there;
 * on from the end stays there.
 */
export function stepJourneyIndex(step: number | null, delta: 1 | -1, n: number): number | null {
  if (step === null) return delta > 0 ? 0 : null
  const next = step + delta
  if (next < 0) return null
  return Math.min(next, n)
}

// ── Progress (doc 18, 3c): where each viewer stopped, kept in their browser ──

/** The furthest-along place in a journey: the step last shown, and whether it was ever finished. */
export interface JourneyProgress {
  step: number
  done?: boolean
}

/** Progress after showing `step` (null = the intro, n = the end). The intro never erases progress. */
export function recordStep(
  all: Record<string, JourneyProgress>,
  id: string,
  step: number | null,
  n: number,
): Record<string, JourneyProgress> {
  if (step === null) return all
  const done = step >= n || !!all[id]?.done
  return { ...all, [id]: { step: Math.min(step, n), ...(done ? { done } : {}) } }
}

/** Where "Continue" picks up: the last stop shown, or null (the intro) for a new or finished journey. */
export function resumeStep(p: JourneyProgress | undefined, n: number): number | null {
  return p && p.step < n ? p.step : null
}
