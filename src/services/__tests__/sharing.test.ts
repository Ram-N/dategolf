import { describe, it, expect } from 'vitest'
import { buildShareText } from '../sharing'
import type { GameState, HoleResult } from '@/types'

const hole = (penalty: number, isGolden: boolean): HoleResult => ({
  holeIndex: 0,
  targetYear: 1410,
  eventId: 'x',
  eventName: 'X',
  eventYear: 1410 + penalty,
  penalty,
  isOptimal: isGolden,
  isGolden,
  betterAlternatives: [],
})

const state = (holeResults: HoleResult[]): GameState => ({
  challengeId: 'c',
  challengeDate: '2026-11-17',
  targetYears: [],
  currentHole: holeResults.length,
  usedEventIds: [],
  holeResults,
  totalScore: holeResults.reduce((t, r) => t + r.penalty, 0),
  completed: true,
})

describe('buildShareText()', () => {
  it('shows a star for golden holes in place of the colour square', () => {
    const text = buildShareText(state([hole(43, true), hole(5, false), hole(200, true), hole(200, false)]))
    expect(text).toContain('⭐ 🟩 ⭐ 🟥')
  })
})
