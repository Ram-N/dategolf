import type { Event } from '@/types'
import type { Span, RelationshipData } from '@/types/dateflow'
import { featuredStories, type FeaturedStory } from './stories'
import { laneFor, LANES, type LaneId } from './lanes'
import { mulberry32, seedFrom, shuffle } from './games/random'
import type { Journey } from './journeys'
import { formatEventYear } from '@/utils/formatYear'

// Doc 18, item 5: the gallery of journeys and chains of events, and the chain of the day.
// A card says only what its items and links say: no hand-written hook for a chain, since chains are
// rebuilt from the links and a hook could go stale. A journey uses its own reviewed intro.

/** One item on a card's mini time axis: an event is a dot, a span a short bar. */
export interface CardPoint {
  year: number
  endYear?: number
}

export interface GalleryCard {
  kind: 'journey' | 'chain'
  id: string // a journey's id, or a chain's root
  title: string
  line: string // a chain's generated line; a journey's intro
  count: number // a chain's steps, a journey's stops
  start: number
  end: number
  startApprox: boolean
  endApprox: boolean
  lanes: LaneId[] // in the LANES order
  points: CardPoint[] // chronological
}

/** Chains with this many steps or more take turns as the chain of the day. */
export const DAILY_MIN_STEPS = 6

const LANE_ORDER = new Map(LANES.map((l, i) => [l.id, i]))
const sortLanes = (ids: Iterable<LaneId>) =>
  [...new Set(ids)].sort((a, b) => (LANE_ORDER.get(a) ?? 99) - (LANE_ORDER.get(b) ?? 99))

/**
 * "c." at an end only when every item there is approximate. A span has one flag for both ends, so an
 * approximate span ending the year of an exact event (a raj ending at independence, 1947) doesn't make it "c. 1947".
 */
function approxAt(items: { year: number; endYear?: number; approximate?: boolean }[], year: number): boolean {
  const there = items.filter((x) => x.year === year || x.endYear === year)
  return there.length > 0 && there.every((x) => x.approximate)
}

/** "13 steps from the Battle of Plassey to India Gains Independence": the chain's own first and last items. */
export function chainLine(f: FeaturedStory): string {
  const nodes = f.story.nodes
  const first = nodes[0]!
  const last = nodes[nodes.length - 1]!
  return first.id === last.id ? f.name : `${nodes.length} steps from ${first.name} to ${last.name}`
}

export function chainCard(f: FeaturedStory): GalleryCard {
  const nodes = f.story.nodes
  return {
    kind: 'chain',
    id: f.rootId,
    title: f.name,
    line: chainLine(f),
    count: nodes.length,
    start: f.start,
    end: f.end,
    startApprox: approxAt(nodes, f.start),
    endApprox: approxAt(nodes, f.end),
    lanes: sortLanes(nodes.map((n) => n.lane)),
    points: nodes.map((n) => ({ year: n.year, ...(n.endYear !== undefined ? { endYear: n.endYear } : {}) })),
  }
}

export function journeyCard(j: Journey): GalleryCard {
  const items = j.stops.flatMap((s) => s.items)
  return {
    kind: 'journey',
    id: j.id,
    title: j.title,
    line: j.intro,
    count: j.stops.length,
    start: j.start,
    end: j.end,
    startApprox: approxAt(items, j.start),
    endApprox: approxAt(items, j.end),
    lanes: sortLanes(items.map((x) => laneFor(x.region))),
    // One point per stop, framed by its first item, so a stop of five items isn't five dots
    points: j.stops.map((s) => ({ year: s.start, ...(s.end !== s.start ? { endYear: s.end } : {}) })),
  }
}

/** Every distinct chain of events (the menu's overlap rule, no cap), earliest first: students scan by time. */
export function galleryChains(data: RelationshipData, events: Event[], durations: Span[]): GalleryCard[] {
  return featuredStories(data, events, durations, Infinity)
    .map(chainCard)
    .sort((a, b) => a.start - b.start || a.title.localeCompare(b.title))
}

/** Days since 1970-01-01 for a "YYYY-MM-DD" date string (UTC, so no time zone shifts it). */
export function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Math.floor(Date.UTC(y!, m! - 1, d!) / 86_400_000)
}

/** The pool's order in one cycle: a shuffle seeded by the cycle's number, never by the clock. */
function cycleOrder(ids: string[], cycle: number): string[] {
  return shuffle(ids, mulberry32(seedFrom(`dateflow:chain-of-the-day:${cycle}`)))
}

/**
 * The chain of the day, from the date alone: same date → same chain for everyone. The pool (chains of
 * DAILY_MIN_STEPS+ steps) is shuffled once per cycle and stepped through a day at a time, so every chain
 * comes up once before any repeats, and a cycle never opens with the chain that closed the one before.
 */
export function chainOfTheDay<T extends { id: string; count: number }>(date: string, cards: T[]): T | null {
  const pool = cards.filter((c) => c.count >= DAILY_MIN_STEPS)
  if (!pool.length) return null
  const ids = pool.map((c) => c.id).sort() // the order the cards arrive in doesn't matter
  const day = dayNumber(date)
  const cycle = Math.floor(day / ids.length)
  const order = cycleOrder(ids, cycle)
  const previous = cycleOrder(ids, cycle - 1)
  // Don't repeat across the seam: if this cycle would open with yesterday's chain, swap its first two
  if (ids.length > 1 && order[0] === previous[previous.length - 1]) [order[0], order[1]] = [order[1]!, order[0]!]
  const id = order[((day % ids.length) + ids.length) % ids.length]!
  return pool.find((c) => c.id === id) ?? null
}

/** "c. 1200 BCE → 900", with "c." on an approximate end. */
export function cardYears(c: Pick<GalleryCard, 'start' | 'end' | 'startApprox' | 'endApprox'>): string {
  return `${formatEventYear(c.start, c.startApprox)} → ${formatEventYear(c.end, c.endApprox)}`
}
