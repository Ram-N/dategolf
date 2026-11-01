import { describe, it, expect } from 'vitest'
import type { Event } from '@/types'
import type { Duration } from '@/types/dateflow'
import eventsJson from '@/data/events.json'
import durationsJson from '@/data/durations.json'
import { laneFor } from '../dateflow/lanes'
import {
  GAMES,
  ROUND_LENGTH,
  dailyRng,
  generateRound,
  isCorrect,
  rngFromSeed,
  type GameId,
  type PickQuestion,
  type OrderQuestion,
} from '../dateflow/games/rounds'

// Real data on purpose: these tests also prove the data can supply every game.
const events = eventsJson as Event[]
const durations = durationsJson as Duration[]
const eventById = new Map(events.map((e) => [e.id, e]))
const durationById = new Map(durations.map((d) => [d.id, d]))
const SEEDS = Array.from({ length: 40 }, (_, i) => i * 7919 + 1)

const rounds = (game: GameId) => SEEDS.map((s) => generateRound(game, events, durations, rngFromSeed(s)))

describe('dateflow games — rounds', () => {
  it('daily rounds depend only on the date and game', () => {
    for (const { id } of GAMES) {
      const a = generateRound(id, events, durations, dailyRng(id, '2026-11-01'))
      const b = generateRound(id, events, durations, dailyRng(id, '2026-11-01'))
      const c = generateRound(id, events, durations, dailyRng(id, '2026-11-02'))
      expect(a).toEqual(b)
      expect(a).not.toEqual(c)
    }
  })

  it('every game builds full rounds with well-formed options and no repeated events', () => {
    for (const { id } of GAMES) {
      for (const round of rounds(id)) {
        expect(round).toHaveLength(ROUND_LENGTH)
        const seen = new Set<string>()
        for (const q of round) {
          const ids = q.kind === 'pick' ? q.options.map((o) => o.id) : q.events.map((e) => e.id)
          expect(new Set(ids).size).toBe(ids.length)
          if (q.kind === 'pick') expect(q.options[q.correct]).toBeDefined()
          if (id !== 'duration') {
            const answerId = q.kind === 'pick' ? q.options[q.correct]!.id : q.answer[0]!
            expect(seen.has(answerId)).toBe(false)
            ids.forEach((x) => seen.add(x))
          }
        }
      }
    }
  })
})

describe('dateflow games — each question has exactly one right answer', () => {
  it('Which Came First: the correct option is strictly earlier', () => {
    for (const round of rounds('which-first'))
      for (const q of round as PickQuestion[]) {
        const [a, b] = q.options.map((o) => eventById.get(o.id)!)
        const earlier = a!.year < b!.year ? 0 : 1
        expect(a!.year).not.toBe(b!.year)
        expect(q.correct).toBe(earlier)
      }
  })

  it('Put Them in Order: the answer is strictly increasing and uses the shown events', () => {
    for (const round of rounds('order'))
      for (const q of round as OrderQuestion[]) {
        const years = q.answer.map((id) => eventById.get(id)!.year)
        years.slice(1).forEach((y, k) => expect(y).toBeGreaterThan(years[k]!))
        expect([...q.answer].sort()).toEqual(q.events.map((e) => e.id).sort())
        expect(q.events.map((e) => e.id)).not.toEqual(q.answer) // never shown already solved
        expect(isCorrect(q, q.answer)).toBe(true)
      }
  })

  it("What's Missing: only the answer falls between the two context events", () => {
    for (const round of rounds('missing'))
      for (const q of round as PickQuestion[]) {
        const [prev, next] = q.context
        q.options.forEach((o, k) => {
          const y = eventById.get(o.id)!.year
          const between = y > prev!.year && y < next!.year
          expect(between).toBe(k === q.correct)
        })
      }
  })

  it("What's Happening Elsewhere: answer is near and elsewhere; distractors are far", () => {
    for (const round of rounds('elsewhere'))
      for (const q of round as PickQuestion[]) {
        const anchor = q.context[0]!
        q.options.forEach((o, k) => {
          const e = eventById.get(o.id)!
          expect(laneFor(e.region)).not.toBe(laneFor(anchor.region))
          const gap = Math.abs(e.year - anchor.year)
          if (k === q.correct) expect(gap).toBeLessThanOrEqual(40)
          else expect(gap).toBeGreaterThanOrEqual(100)
        })
      }
  })

  it('Find the Duration: options are distinct empires and only the answer matches the clue', () => {
    for (const round of rounds('duration'))
      for (const q of round as PickQuestion[]) {
        const answer = durationById.get(q.options[q.correct]!.id)!
        expect(q.clue).toContain(answer.region)
        q.options.forEach((o) => expect(durationById.get(o.id)!.kind).toBe('empire'))
        q.options
          .filter((_, k) => k !== q.correct)
          .forEach((o) => {
            const d = durationById.get(o.id)!
            const same = Math.abs(d.startYear - answer.startYear) < 50 && Math.abs(d.endYear - answer.endYear) < 50
            expect(same).toBe(false)
          })
      }
  })

  it('scores pick and order answers', () => {
    const [pick] = rounds('which-first')[0] as PickQuestion[]
    expect(isCorrect(pick!, pick!.correct)).toBe(true)
    expect(isCorrect(pick!, 1 - pick!.correct)).toBe(false)
    const [order] = rounds('order')[0] as OrderQuestion[]
    expect(isCorrect(order!, [...order!.answer].reverse())).toBe(false)
  })
})
