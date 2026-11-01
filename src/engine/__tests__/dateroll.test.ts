import { describe, it, expect } from 'vitest'
import {
  FULL_VIEW,
  MAX_YEAR,
  MIN_SPAN,
  MIN_YEAR,
  centerOn,
  formatTick,
  pan,
  span,
  tickStep,
  ticks,
  xToYear,
  yearToX,
  zoomAround,
} from '../dateroll/timeScale'
import { layoutLabels, minImportanceForSpan } from '../dateroll/visibility'
import { parseYear } from '@/utils/formatYear'

const W = 1000

describe('timeScale', () => {
  it('round-trips year ↔ x', () => {
    const view = { start: 1400, end: 1500 }
    expect(yearToX(1450, view, W)).toBe(500)
    expect(xToYear(yearToX(1453, view, W), view, W)).toBeCloseTo(1453)
  })

  it('zoom keeps the anchor year at the same screen position', () => {
    const view = { start: 1000, end: 2000 }
    const before = yearToX(1453, view, W)
    const zoomed = zoomAround(view, 1453, 0.25)
    expect(span(zoomed)).toBeCloseTo(250)
    expect(yearToX(1453, zoomed, W)).toBeCloseTo(before)
  })

  it('clamps zoom and pan to history bounds', () => {
    expect(span(zoomAround(FULL_VIEW, 0, 10))).toBe(MAX_YEAR - MIN_YEAR)
    expect(span(zoomAround({ start: 1450, end: 1452 }, 1451, 0.1))).toBe(MIN_SPAN)
    expect(pan({ start: 1900, end: 2000 }, 500)).toEqual({ start: MAX_YEAR - 100, end: MAX_YEAR })
    expect(pan({ start: -3000, end: -2900 }, -5000).start).toBe(MIN_YEAR)
  })

  it('centers on a year', () => {
    expect(centerOn(1453, 100)).toEqual({ start: 1403, end: 1503 })
  })

  it('picks tick steps that keep labels apart', () => {
    expect(tickStep(FULL_VIEW, W)).toBe(500)
    expect(tickStep({ start: 1400, end: 1500 }, W)).toBe(10)
    expect(ticks({ start: 1400, end: 1500 }, W)).toHaveLength(11)
  })

  it('labels the BCE/CE boundary instead of a year 0', () => {
    expect(formatTick(0)).toBe('BCE | CE')
    expect(formatTick(-500)).toBe('500 BCE')
    expect(formatTick(1453)).toBe('1453')
  })
})

describe('parseYear', () => {
  it.each([
    ['1453', 1453],
    ['500 BC', -500],
    ['500 bce', -500],
    ['500 B.C.', -500],
    ['-44', -44],
    ['1066 AD', 1066],
    ['AD 800', 800],
  ])('%s → %d', (input, expected) => {
    expect(parseYear(input)).toBe(expected)
  })

  it('rejects junk', () => {
    expect(parseYear('soon')).toBeNull()
    expect(parseYear('')).toBeNull()
  })
})

describe('visibility', () => {
  it('reveals more events as the span shrinks', () => {
    const spans = [5000, 1000, 100, 10]
    const thresholds = spans.map(minImportanceForSpan)
    for (let i = 1; i < thresholds.length; i++) {
      expect(thresholds[i]).toBeLessThanOrEqual(thresholds[i - 1]!)
    }
    expect(minImportanceForSpan(10)).toBe(0)
  })

  it('stacks overlapping labels into rows, most important first', () => {
    const items = [
      { id: 'minor', x: 100, labelWidth: 80, importance: 3 },
      { id: 'major', x: 110, labelWidth: 80, importance: 9 },
    ]
    const placed = layoutLabels(items, 2)
    expect(placed).toEqual([
      { id: 'major', x: 110, row: 0 },
      { id: 'minor', x: 100, row: 1 },
    ])
  })

  it('drops labels that fit in no row', () => {
    const items = [
      { id: 'a', x: 100, labelWidth: 80, importance: 9 },
      { id: 'b', x: 105, labelWidth: 80, importance: 5 },
    ]
    expect(layoutLabels(items, 1).map((p) => p.id)).toEqual(['a'])
  })

  it('keeps non-overlapping labels on the same row', () => {
    const items = [
      { id: 'a', x: 100, labelWidth: 50, importance: 5 },
      { id: 'b', x: 300, labelWidth: 50, importance: 5 },
    ]
    expect(layoutLabels(items, 3).every((p) => p.row === 0)).toBe(true)
  })
})
