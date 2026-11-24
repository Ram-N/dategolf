import { describe, it, expect } from 'vitest'
import type { Span } from '@/types/dateflow'
import durationsJson from '@/data/durations.json'
import { CURRENT_CAP, pickCurrents } from '../dateflow/currents'

const durations = durationsJson as Span[]
const cur = (id: string, startYear: number, endYear: number, importance = 5, current = true) =>
  ({ id, name: id, startYear, endYear, importance, current, description: '', categories: [], region: 'Global',
     kind: 'period' }) as Span

/** The most bands covering any one year. */
function maxDepth(bands: { startYear: number; endYear: number }[], start: number, end: number) {
  let max = 0
  for (let y = start; y <= end; y++) max = Math.max(max, bands.filter((b) => b.startYear <= y && y <= b.endYear).length)
  return max
}

describe('pickCurrents', () => {
  it('keeps only flagged spans in view', () => {
    const ds = [cur('a', 1000, 1100), cur('b', 1500, 1600), cur('c', 1000, 1100, 5, false)]
    expect(pickCurrents(ds, 900, 1200).map((b) => b.id)).toEqual(['a'])
  })

  it('never lets more than the cap overlap; the most important win', () => {
    const ds = [cur('w', 1400, 1600), cur('x', 1490, 1600), cur('y', 1510, 1650, 7), cur('z', 1540, 1690, 6)]
    const bands = pickCurrents(ds, 1300, 1700, 3)
    expect(bands.map((b) => b.id).sort()).toEqual(['w', 'y', 'z']) // ties go to more years in view: w beats x
    expect(maxDepth(bands, 1300, 1700)).toBeLessThanOrEqual(3)
  })

  it('judges overlap only within the view', () => {
    // Four overlap around 1550, but a view of 1610–1700 holds only two of them.
    const ds = [cur('w', 1400, 1600), cur('x', 1490, 1600), cur('y', 1510, 1650), cur('z', 1540, 1690)]
    expect(pickCurrents(ds, 1610, 1700).map((b) => b.id)).toEqual(['y', 'z'])
  })

  it('gives overlapping bands different label rows, below the cap', () => {
    const bands = pickCurrents([cur('a', 0, 100), cur('b', 50, 150), cur('c', 120, 200)], -10, 210)
    expect(bands.map((b) => [b.id, b.row])).toEqual([['a', 0], ['b', 1], ['c', 0]])
  })

  it('holds to the cap on the real data at every zoom', () => {
    for (const [s, e] of [[-3500, 2025], [1300, 1800], [1500, 1600], [-900, -100], [1900, 2000]] as const) {
      const bands = pickCurrents(durations, s, e)
      expect(maxDepth(bands, s, e)).toBeLessThanOrEqual(CURRENT_CAP)
      expect(bands.every((b) => b.row < CURRENT_CAP)).toBe(true)
    }
    expect(pickCurrents(durations, -3500, 2025).length).toBeGreaterThanOrEqual(7)
  })
})
