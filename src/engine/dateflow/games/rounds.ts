import type { Event } from '@/types'
import type { Duration } from '@/types/dateflow'
import { laneFor, type LaneId } from '../lanes'
import { formatSpan } from '../durations'
import { formatYear } from '@/utils/formatYear'
import { mulberry32, pickOne, sample, seedFrom, shuffle, type Rng } from './random'

// DateFlow games: five question generators sharing one round format. Each round has
// ROUND_LENGTH questions that get harder (closer dates, nearer distractors) as it goes.

export type GameId = 'which-first' | 'order' | 'missing' | 'elsewhere' | 'duration'

export const GAMES: { id: GameId; title: string; blurb: string }[] = [
  { id: 'which-first', title: 'Which Came First?', blurb: 'Two events — pick the earlier one. They get closer together as you go.' },
  { id: 'order', title: 'Put Them in Order', blurb: 'Events from around the world. Tap them from earliest to latest.' },
  { id: 'missing', title: "What's Missing?", blurb: 'Two events from one region. Which event happened in between?' },
  { id: 'elsewhere', title: "What's Happening Elsewhere?", blurb: 'One event. Which of these happened elsewhere at about the same time?' },
  { id: 'duration', title: 'Find the Duration', blurb: 'Given where and when it ruled, name the empire or dynasty.' },
]

export const ROUND_LENGTH = 5

/** Something to plot in the answer reveal: a point (start === end) or a span. */
export interface RevealItem {
  id: string
  label: string
  start: number
  end: number
  role: 'answer' | 'context' | 'other'
}

export interface Option {
  id: string
  label: string
}

interface QuestionBase {
  game: GameId
  prompt: string
  reveal: RevealItem[]
}

export interface PickQuestion extends QuestionBase {
  kind: 'pick'
  context: Event[] // shown with their years
  clue?: string // extra text clue (Find the Duration)
  options: Option[]
  correct: number
}

export interface OrderQuestion extends QuestionBase {
  kind: 'order'
  events: Event[] // in shuffled display order
  answer: string[] // event ids, earliest first
}

export type Question = PickQuestion | OrderQuestion

export function isCorrect(q: Question, response: number | string[]): boolean {
  if (q.kind === 'pick') return response === q.correct
  return Array.isArray(response) && response.length === q.answer.length && response.every((id, i) => id === q.answer[i])
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const TRIES = 200
const pointItem = (e: Event, role: RevealItem['role']): RevealItem => ({
  id: e.id,
  label: e.name,
  start: e.year,
  end: e.year,
  role,
})
const spanItem = (d: Duration, role: RevealItem['role']): RevealItem => ({
  id: d.id,
  label: d.name,
  start: d.startYear,
  end: d.endYear,
  role,
})

/** Earlier questions draw from better-known events. */
const poolFor = (events: Event[], i: number) => (i < 2 ? events.filter((e) => e.importance >= 5) : events)

function pickOptions(correct: Option, distractors: Option[], rng: Rng) {
  const options = shuffle([correct, ...distractors], rng)
  return { options, correct: options.findIndex((o) => o.id === correct.id) }
}

// ── Which Came First? ────────────────────────────────────────────────────────
const FIRST_GAPS: [number, number][] = [
  [300, 3000],
  [100, 400],
  [40, 150],
  [15, 60],
  [1, 25],
]

function whichFirst(i: number, events: Event[], rng: Rng, used: Set<string>): Question | null {
  const pool = poolFor(events, i).filter((e) => !used.has(e.id))
  const [lo, hi] = FIRST_GAPS[i]!
  for (let t = 0; t < TRIES; t++) {
    const a = pickOne(pool, rng)
    const partners = pool.filter((b) => {
      const gap = Math.abs(b.year - a.year)
      return b.id !== a.id && gap >= lo && gap <= hi
    })
    if (!partners.length) continue
    const b = pickOne(partners, rng)
    const [earlier, later] = a.year < b.year ? [a, b] : [b, a]
    const { options, correct } = pickOptions(
      { id: earlier.id, label: earlier.name },
      [{ id: later.id, label: later.name }],
      rng,
    )
    used.add(a.id).add(b.id)
    return {
      kind: 'pick',
      game: 'which-first',
      prompt: 'Which came first?',
      context: [],
      options,
      correct,
      reveal: [pointItem(earlier, 'answer'), pointItem(later, 'other')],
    }
  }
  return null
}

// ── Put Them in Order ────────────────────────────────────────────────────────
const ORDER_WINDOW = [2500, 1200, 600, 300, 150]
const ORDER_MIN_SEP = [150, 60, 20, 8, 3]

function putInOrder(i: number, events: Event[], rng: Rng, used: Set<string>): Question | null {
  const pool = poolFor(events, i).filter((e) => !used.has(e.id))
  const count = i < 2 ? 3 : 4
  for (let t = 0; t < TRIES; t++) {
    const start = pickOne(pool, rng).year
    const windowed = shuffle(
      pool.filter((e) => e.year >= start && e.year <= start + ORDER_WINDOW[i]!),
      rng,
    )
    const chosen: Event[] = []
    const lanes = new Set<LaneId>()
    const farEnough = (e: Event) => chosen.every((c) => Math.abs(c.year - e.year) >= ORDER_MIN_SEP[i]!)
    // Prefer one event per region, then fill from any region.
    for (const e of windowed) {
      if (chosen.length < count && !lanes.has(laneFor(e.region)) && farEnough(e)) {
        chosen.push(e)
        lanes.add(laneFor(e.region))
      }
    }
    for (const e of windowed) if (chosen.length < count && !chosen.includes(e) && farEnough(e)) chosen.push(e)
    if (chosen.length < count) continue

    const sorted = [...chosen].sort((a, b) => a.year - b.year)
    let shown = shuffle(chosen, rng)
    if (shown.every((e, k) => e.id === sorted[k]!.id)) shown = [...shown].reverse() // never pre-solved
    chosen.forEach((e) => used.add(e.id))
    return {
      kind: 'order',
      game: 'order',
      prompt: 'Put these in order — earliest first.',
      events: shown,
      answer: sorted.map((e) => e.id),
      reveal: sorted.map((e) => pointItem(e, 'answer')),
    }
  }
  return null
}

// ── What's Missing? ──────────────────────────────────────────────────────────
const MISSING_MAX_SPAN = [1500, 800, 400, 250, 150]

function whatsMissing(i: number, events: Event[], rng: Rng, used: Set<string>): Question | null {
  const byLane = new Map<LaneId, Event[]>()
  for (const e of events) {
    const lane = laneFor(e.region)
    byLane.set(lane, [...(byLane.get(lane) ?? []), e])
  }
  for (const list of byLane.values()) list.sort((a, b) => a.year - b.year)
  const lanes = [...byLane.keys()].filter((l) => byLane.get(l)!.length >= 7)

  for (let t = 0; t < TRIES; t++) {
    const lane = pickOne(lanes, rng)
    const list = byLane.get(lane)!
    const j = 1 + Math.floor(rng() * (list.length - 2))
    const [prev, mid, next] = [list[j - 1]!, list[j]!, list[j + 1]!]
    if ([prev, mid, next].some((e) => used.has(e.id))) continue
    // Consecutive in the region, strictly increasing, and not too long a stretch.
    if (!(prev.year < mid.year && mid.year < next.year)) continue
    if (next.year - prev.year > MISSING_MAX_SPAN[i]!) continue

    // Distractors lie entirely outside the gap, so only one option fits.
    // Early questions use far-off events; later ones the nearest outside the gap.
    const outside = list.filter((e) => !used.has(e.id) && (e.year < prev.year || e.year > next.year))
    const distance = (e: Event) => (e.year < prev.year ? prev.year - e.year : e.year - next.year)
    const ranked = [...outside].sort((a, b) => distance(a) - distance(b))
    const candidates = i < 2 ? ranked.filter((e) => distance(e) >= 300) : ranked.slice(0, 8)
    if (candidates.length < 3) continue
    const distractors = sample(candidates, 3, rng)

    const { options, correct } = pickOptions(
      { id: mid.id, label: mid.name },
      distractors.map((e) => ({ id: e.id, label: e.name })),
      rng,
    )
    ;[prev, mid, next, ...distractors].forEach((e) => used.add(e.id))
    return {
      kind: 'pick',
      game: 'missing',
      prompt: `Which of these happened in between?`,
      context: [prev, next],
      options,
      correct,
      reveal: [pointItem(prev, 'context'), pointItem(mid, 'answer'), pointItem(next, 'context')],
    }
  }
  return null
}

// ── What's Happening Elsewhere? ──────────────────────────────────────────────
const ELSEWHERE_NEAR = [40, 30, 25, 20, 15]
const ELSEWHERE_FAR = [500, 350, 250, 150, 100]

function happeningElsewhere(i: number, events: Event[], rng: Rng, used: Set<string>): Question | null {
  const pool = poolFor(events, i).filter((e) => !used.has(e.id))
  const all = events.filter((e) => !used.has(e.id))
  for (let t = 0; t < TRIES; t++) {
    const anchor = pickOne(pool, rng)
    const lane = laneFor(anchor.region)
    const elsewhere = all.filter((e) => e.id !== anchor.id && laneFor(e.region) !== lane)
    const near = elsewhere.filter((e) => Math.abs(e.year - anchor.year) <= ELSEWHERE_NEAR[i]!)
    // Plausible distractors: just past the "far" line, not absurdly distant.
    const far = elsewhere
      .filter((e) => Math.abs(e.year - anchor.year) >= ELSEWHERE_FAR[i]!)
      .sort((a, b) => Math.abs(a.year - anchor.year) - Math.abs(b.year - anchor.year))
      .slice(0, 15)
    if (!near.length || far.length < 3) continue

    const answer = pickOne(near, rng)
    const distractors = sample(far, 3, rng)
    const { options, correct } = pickOptions(
      { id: answer.id, label: answer.name },
      distractors.map((e) => ({ id: e.id, label: e.name })),
      rng,
    )
    ;[anchor, answer, ...distractors].forEach((e) => used.add(e.id))
    return {
      kind: 'pick',
      game: 'elsewhere',
      prompt: 'Which of these happened elsewhere in the world at about the same time?',
      context: [anchor],
      options,
      correct,
      reveal: [
        pointItem(anchor, 'context'),
        pointItem(answer, 'answer'),
        ...distractors.map((e) => pointItem(e, 'other')),
      ],
    }
  }
  return null
}

// ── Find the Duration ────────────────────────────────────────────────────────
const sameSpan = (a: Duration, b: Duration) =>
  Math.abs(a.startYear - b.startYear) < 50 && Math.abs(a.endYear - b.endYear) < 50

function findDuration(i: number, durations: Duration[], rng: Rng, used: Set<string>): Question | null {
  const empires = durations.filter((d) => d.kind === 'empire')
  const pool = empires.filter((d) => !used.has(d.id))
  for (let t = 0; t < TRIES; t++) {
    const target = pickOne(pool, rng)
    const others = empires.filter((d) => d.id !== target.id && !sameSpan(d, target))
    // Early: empires from clearly different eras. Later: same region where possible,
    // so the dates — not the region — decide the answer.
    let candidates: Duration[]
    if (i < 2) {
      candidates = others.filter((d) => Math.abs(d.startYear - target.startYear) >= 500)
    } else {
      const sameRegion = others.filter((d) => d.region === target.region)
      const nearest = [...others].sort(
        (a, b) => Math.abs(a.startYear - target.startYear) - Math.abs(b.startYear - target.startYear),
      )
      candidates = sameRegion.length >= 3 ? sameRegion : [...sameRegion, ...nearest.filter((d) => !sameRegion.includes(d))].slice(0, 6)
    }
    if (candidates.length < 3) continue
    const distractors = sample(candidates, 3, rng)

    const { options, correct } = pickOptions(
      { id: target.id, label: target.name },
      distractors.map((d) => ({ id: d.id, label: d.name })),
      rng,
    )
    used.add(target.id)
    return {
      kind: 'pick',
      game: 'duration',
      prompt: 'Which empire or dynasty is this?',
      context: [],
      clue: `Ruled ${target.region} · ${formatSpan(target, formatYear)}`,
      options,
      correct,
      reveal: [spanItem(target, 'answer'), ...distractors.map((d) => spanItem(d, 'other'))],
    }
  }
  return null
}

// ── Rounds ───────────────────────────────────────────────────────────────────
type Generator = (i: number, events: Event[], durations: Duration[], rng: Rng, used: Set<string>) => Question | null

const GENERATORS: Record<GameId, Generator> = {
  'which-first': (i, ev, _d, rng, used) => whichFirst(i, ev, rng, used),
  order: (i, ev, _d, rng, used) => putInOrder(i, ev, rng, used),
  missing: (i, ev, _d, rng, used) => whatsMissing(i, ev, rng, used),
  elsewhere: (i, ev, _d, rng, used) => happeningElsewhere(i, ev, rng, used),
  duration: (i, _ev, d, rng, used) => findDuration(i, d, rng, used),
}

/** A full round. If a hard question can't be built, it falls back to an easier setting. */
export function generateRound(game: GameId, events: Event[], durations: Duration[], rng: Rng): Question[] {
  const used = new Set<string>()
  const round: Question[] = []
  for (let i = 0; i < ROUND_LENGTH; i++) {
    let q: Question | null = null
    for (let level = i; level >= 0 && !q; level--) q = GENERATORS[game](level, events, durations, rng, used)
    if (!q) throw new Error(`Could not build question ${i + 1} for ${game}`)
    round.push(q)
  }
  return round
}

/** Same date + game → same round for everyone. */
export const dailyRng = (game: GameId, date: string) => mulberry32(seedFrom(`dateflow:${game}:${date}`))

export const rngFromSeed = (seed: number) => mulberry32(seed)
