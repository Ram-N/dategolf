import { describe, expect, it } from 'vitest'
import { centuryBands } from '../dateflow/centuries'

describe('centuryBands', () => {
  it('names CE centuries like "the 1700s" and alternates two shades', () => {
    const b = centuryBands(1650, 1920)
    expect(b.map((x) => x.label)).toEqual(['1600s', '1700s', '1800s', '1900s'])
    expect(b.map((x) => x.shade)).toEqual([0, 1, 0, 1])
    expect(b.every((x) => !x.bce)).toBe(true)
    expect([b[1]!.start, b[1]!.end]).toEqual([1700, 1800])
  })

  it('counts BCE centuries backwards, with the epoch bands named by their years (no year 0)', () => {
    const b = centuryBands(-250, 150)
    expect(b.map((x) => x.label)).toEqual(['200s BCE', '100s BCE', '99–1 BCE', '1–99', '100s'])
    expect(b.map((x) => x.bce)).toEqual([true, true, true, false, false])
    // neighbours always differ, across the epoch too
    expect(b.map((x) => x.shade)).toEqual([1, 0, 1, 0, 1])
  })
})
