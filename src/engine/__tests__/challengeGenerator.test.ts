import { describe, it, expect } from 'vitest'
import { generateDailyChallenge } from '../challengeGenerator'

describe('generateDailyChallenge()', () => {
  it('generates exactly 5 target years', () => {
    const challenge = generateDailyChallenge('2025-01-01')
    expect(challenge.targetYears).toHaveLength(5)
  })

  it('is deterministic — same date always gives same result', () => {
    const a = generateDailyChallenge('2025-06-15')
    const b = generateDailyChallenge('2025-06-15')
    expect(a.targetYears).toEqual(b.targetYears)
  })

  it('produces different challenges for different dates', () => {
    const a = generateDailyChallenge('2025-01-01')
    const b = generateDailyChallenge('2025-01-02')
    expect(a.targetYears).not.toEqual(b.targetYears)
  })

  it('all target years are integers', () => {
    const challenge = generateDailyChallenge('2025-03-10')
    for (const y of challenge.targetYears) {
      expect(Number.isInteger(y)).toBe(true)
    }
  })

  it('target years span historical range', () => {
    // Run 20 dates and collect all years — should see some variety
    const allYears: number[] = []
    for (let d = 1; d <= 20; d++) {
      const date = `2025-01-${String(d).padStart(2, '0')}`
      allYears.push(...generateDailyChallenge(date).targetYears)
    }
    const min = Math.min(...allYears)
    const max = Math.max(...allYears)
    expect(max - min).toBeGreaterThan(100) // at least 100 years spread
  })

  it('sets correct challenge id and date', () => {
    const date = '2025-07-04'
    const challenge = generateDailyChallenge(date)
    expect(challenge.id).toBe(`challenge-${date}`)
    expect(challenge.date).toBe(date)
  })
})
