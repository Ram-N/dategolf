import { describe, it, expect } from 'vitest'
import { generateDistractors, approxMinGap } from '../datepick/distractorEngine'
import { mulberry32 } from '../dateflow/games/random'
import type { Event } from '@/types'

const make = (id: string, year: number, extra: Partial<Event> = {}): Event => ({
  id,
  name: id,
  year,
  categories: ['Politics'],
  region: 'Europe',
  aliases: [],
  description: '',
  difficulty: 'medium',
  importance: 4,
  ...extra,
})

// The real case: Chandragupta II (c. 375-380) next to the Huns (375).
const pool = [
  make('huns', 375),
  make('near-a', 384),
  make('near-b', 390),
  make('mid-a', 420),
  make('mid-b', 476),
  make('far-a', 800),
  make('far-b', 1066),
]

const distractors = (event: Event, seed: number) => {
  const { choices, correctIndex } = generateDistractors(event, [event, ...pool], mulberry32(seed))
  return choices.filter((_, i) => i !== correctIndex)
}

describe('generateDistractors()', () => {
  it('may offer a nearby year for an exact-date event', () => {
    const exact = make('exact', 380)
    const offered = new Set<number>()
    for (let s = 0; s < 50; s++) distractors(exact, s + 1).forEach((y) => offered.add(y))
    expect(offered.has(375)).toBe(true)
  })

  it('never offers a year within the gap for an approximate-date event', () => {
    const approx = make('approx', 380, { approximate: true })
    for (let s = 0; s < 50; s++) {
      for (const y of distractors(approx, s + 1)) {
        expect(Math.abs(y - 380)).toBeGreaterThan(approxMinGap(380))
      }
    }
  })

  it('still returns 4 distinct choices including the answer', () => {
    const approx = make('approx', 380, { approximate: true })
    const { choices, correctIndex } = generateDistractors(approx, [approx, ...pool], mulberry32(7))
    expect(choices).toHaveLength(4)
    expect(new Set(choices).size).toBe(4)
    expect(choices[correctIndex]).toBe(380)
  })

  it('skips synthetic offsets inside the gap when real candidates run out', () => {
    const lonely = make('lonely', 380, { approximate: true })
    const { choices, correctIndex } = generateDistractors(lonely, [lonely], mulberry32(11))
    const wrong = choices.filter((_, i) => i !== correctIndex)
    expect(wrong).toHaveLength(3)
    for (const y of wrong) expect(Math.abs(y - 380)).toBeGreaterThan(approxMinGap(380))
  })

  it('widens the gap for older dates', () => {
    expect(approxMinGap(1850)).toBe(10)
    expect(approxMinGap(-500)).toBe(25)
    expect(approxMinGap(-3500)).toBe(100)
  })

  it('keeps wrong answers 100+ years from an approximate ancient date, even from synthetic years', () => {
    const ancient = make('ancient', -3500, { approximate: true })
    const near = make('near', -3450)
    for (let s = 0; s < 30; s++) {
      const { choices, correctIndex } = generateDistractors(ancient, [ancient, near], mulberry32(s + 1))
      const wrong = choices.filter((_, i) => i !== correctIndex)
      expect(wrong).toHaveLength(3)
      for (const y of wrong) expect(Math.abs(y + 3500)).toBeGreaterThan(100)
    }
  })

  it('never makes up year 0', () => {
    const early = make('early', 10)
    const { choices } = generateDistractors(early, [early], mulberry32(3))
    expect(choices).not.toContain(0)
  })
})
