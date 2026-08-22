import { describe, it, expect } from 'vitest'
import {
  penalty,
  getScoreStatus,
  findBetterAlternatives,
  createGame,
  selectEvent,
  isComplete,
} from '../gameEngine'
import type { Event, DailyChallenge } from '@/types'

// ── Fixtures ──────────────────────────────────────────────────────────────────
const makeEvent = (overrides: Partial<Event> & { id: string; year: number }): Event => ({
  name: `Event ${overrides.id}`,
  categories: ['Politics'],
  region: 'Global',
  aliases: [],
  description: 'Test event.',
  difficulty: 'medium',
  importance: 3,
  ...overrides,
})

const EVENTS: Event[] = [
  makeEvent({ id: 'a', year: 1000 }),
  makeEvent({ id: 'b', year: 1200 }),
  makeEvent({ id: 'c', year: 1400 }),
  makeEvent({ id: 'd', year: 1600 }),
  makeEvent({ id: 'e', year: 1800 }),
  makeEvent({ id: 'f', year: 1900 }),
  makeEvent({ id: 'g', year: 2000 }),
]

const makeChallenge = (targetYears: number[] = [1100, 1300, 1500, 1700, 1900]): DailyChallenge => ({
  id: 'test-challenge',
  date: '2025-01-01',
  targetYears,
})

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('penalty()', () => {
  it('returns absolute difference between years', () => {
    expect(penalty(1900, 1850)).toBe(50)
    expect(penalty(1850, 1900)).toBe(50)
    expect(penalty(1900, 1900)).toBe(0)
  })

  it('handles BCE years (negative)', () => {
    expect(penalty(-44, -100)).toBe(56)
    expect(penalty(0, -100)).toBe(100)
    expect(penalty(-500, 500)).toBe(1000)
  })

  it('handles year 0', () => {
    expect(penalty(0, 0)).toBe(0)
    expect(penalty(1, 0)).toBe(1)
  })
})

describe('getScoreStatus()', () => {
  it('returns good when average ≤ 20', () => {
    expect(getScoreStatus(100, 5)).toBe('good') // avg 20
    expect(getScoreStatus(50, 5)).toBe('good')  // avg 10
  })

  it('returns warning when average 21-75', () => {
    expect(getScoreStatus(200, 4)).toBe('warning') // avg 50
    expect(getScoreStatus(300, 4)).toBe('warning') // avg 75
  })

  it('returns danger when average > 75', () => {
    expect(getScoreStatus(400, 5)).toBe('danger') // avg 80
  })

  it('returns good when no holes played', () => {
    expect(getScoreStatus(0, 0)).toBe('good')
  })
})

describe('findBetterAlternatives()', () => {
  it('finds alternatives that are closer to target', () => {
    // Target: 1500, player chose 'a' (1000 → penalty 500)
    // Better: 'c' (1400 → 100), 'd' (1600 → 100), 'b' (1200 → 300)
    const alts = findBetterAlternatives(1500, [], EVENTS, 'a')
    expect(alts.length).toBeGreaterThan(0)
    expect(alts.every(alt => alt.penalty < 500)).toBe(true)
  })

  it('prefers one alternative from each side of the target', () => {
    // Target: 1500 — 'c' at 1400 (before), 'd' at 1600 (after)
    // Player chose 'a' at 1000 (penalty 500)
    const alts = findBetterAlternatives(1500, [], EVENTS, 'a')
    const beforeTarget = alts.filter(a => a.eventYear <= 1500)
    const afterTarget = alts.filter(a => a.eventYear > 1500)
    // Should have at least one on each side
    expect(beforeTarget.length).toBeGreaterThan(0)
    expect(afterTarget.length).toBeGreaterThan(0)
  })

  it('returns empty array when player chose the optimal event', () => {
    // Target: 1000, player chose 'a' at 1000 (penalty 0) — nobody better
    const alts = findBetterAlternatives(1000, [], EVENTS, 'a')
    expect(alts).toHaveLength(0)
  })

  it('excludes already-used events from alternatives', () => {
    // Used 'c' (1400) and 'd' (1600) — the obvious alts for target 1500
    const alts = findBetterAlternatives(1500, ['c', 'd'], EVENTS, 'a')
    expect(alts.every(a => a.eventId !== 'c' && a.eventId !== 'd')).toBe(true)
  })

  it('returns max 2 alternatives', () => {
    const alts = findBetterAlternatives(1500, [], EVENTS, 'a')
    expect(alts.length).toBeLessThanOrEqual(2)
  })
})

describe('createGame()', () => {
  it('creates a fresh game state from a challenge', () => {
    const challenge = makeChallenge()
    const state = createGame(challenge)

    expect(state.challengeId).toBe(challenge.id)
    expect(state.challengeDate).toBe(challenge.date)
    expect(state.targetYears).toEqual(challenge.targetYears)
    expect(state.currentHole).toBe(0)
    expect(state.usedEventIds).toHaveLength(0)
    expect(state.holeResults).toHaveLength(0)
    expect(state.totalScore).toBe(0)
    expect(state.completed).toBe(false)
  })
})

describe('selectEvent()', () => {
  it('calculates penalty and advances the hole', () => {
    const state = createGame(makeChallenge([1100]))
    const { newState, result } = selectEvent(state, 'a', EVENTS) // 'a' = year 1000

    expect(result.penalty).toBe(100) // |1100 - 1000|
    expect(result.targetYear).toBe(1100)
    expect(result.eventYear).toBe(1000)
    expect(newState.currentHole).toBe(1)
    expect(newState.totalScore).toBe(100)
    expect(newState.usedEventIds).toContain('a')
  })

  it('throws when trying to reuse an event', () => {
    let state = createGame(makeChallenge([1100, 1300, 1500, 1700, 1900]))
    const { newState } = selectEvent(state, 'a', EVENTS)
    state = newState

    expect(() => selectEvent(state, 'a', EVENTS)).toThrow()
  })

  it('marks game as complete after 5 holes', () => {
    let state = createGame(makeChallenge([1100, 1300, 1500, 1700, 1900]))
    const eventIds = ['a', 'b', 'c', 'd', 'e']

    for (const id of eventIds) {
      const { newState } = selectEvent(state, id, EVENTS)
      state = newState
    }

    expect(state.completed).toBe(true)
    expect(state.currentHole).toBe(5)
    expect(isComplete(state)).toBe(true)
  })

  it('throws when game is already complete', () => {
    let state = createGame(makeChallenge([1100, 1300, 1500, 1700, 1900]))
    for (const id of ['a', 'b', 'c', 'd', 'e']) {
      const { newState } = selectEvent(state, id, EVENTS)
      state = newState
    }
    expect(() => selectEvent(state, 'f', EVENTS)).toThrow()
  })

  it('accumulates total score across holes', () => {
    let state = createGame(makeChallenge([1100, 1300, 1500, 1700, 1900]))
    // 'a'=1000 vs 1100 → 100; 'b'=1200 vs 1300 → 100; etc.
    for (const id of ['a', 'b', 'c', 'd', 'e']) {
      const { newState } = selectEvent(state, id, EVENTS)
      state = newState
    }
    expect(state.totalScore).toBe(500) // each 100 apart × 5
  })
})

describe('isComplete()', () => {
  it('returns false for a fresh game', () => {
    const state = createGame(makeChallenge())
    expect(isComplete(state)).toBe(false)
  })

  it('returns true after 5 selections', () => {
    let state = createGame(makeChallenge([1100, 1300, 1500, 1700, 1900]))
    for (const id of ['a', 'b', 'c', 'd', 'e']) {
      const { newState } = selectEvent(state, id, EVENTS)
      state = newState
    }
    expect(isComplete(state)).toBe(true)
  })
})
