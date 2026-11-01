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
import {
  layoutLabels,
  minImportanceForSpan,
  spaceMilestones,
  wrapLabel,
  type LayoutItem,
} from '../dateroll/visibility'
import { groupFor } from '../dateroll/categoryGroups'
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

  const item = (id: string, x: number, priority: number, extra: Partial<LayoutItem> = {}): LayoutItem => ({
    id,
    x,
    dotX: x,
    labelWidth: 80,
    levels: 2,
    priority,
    ...extra,
  })

  it('places the most important label nearest the axis, then alternates sides', () => {
    const placed = layoutLabels([item('minor', 100, 3), item('major', 110, 9)], 6)
    expect(placed).toEqual([
      { id: 'major', side: 'above', level: 0 },
      { id: 'minor', side: 'below', level: 0 },
    ])
  })

  it('drops labels that fit nowhere', () => {
    // one 2-level slot per side: a takes above, b takes below, c has nowhere left
    const placed = layoutLabels([item('a', 100, 9), item('b', 105, 7), item('c', 110, 5)], 2)
    expect(placed.map((p) => p.id)).toEqual(['a', 'b'])
  })

  it('keeps non-overlapping labels on the same level', () => {
    const placed = layoutLabels([item('a', 100, 5), item('b', 300, 5)], 6)
    expect(placed.every((p) => p.level === 0 && p.side === 'above')).toBe(true)
  })

  it('stacks multi-line labels without overlap', () => {
    // a takes levels 0–3 above; b must start at level 4 or go below
    const placed = layoutLabels(
      [item('a', 100, 9, { levels: 4 }), item('b', 300, 8, { levels: 2, x: 300, dotX: 300 }), item('c', 110, 5)],
      8,
    )
    expect(placed.find((p) => p.id === 'c')).toEqual({ id: 'c', side: 'below', level: 0 })
  })

  it("never lets a leader run through another event's label", () => {
    // a sits on level 0 above, b below. c's dot is under a's label, so c cannot climb past a.
    const placed = layoutLabels([item('a', 100, 9), item('b', 100, 8), item('c', 130, 5, { x: 180, dotX: 130 })], 8)
    const c = placed.find((p) => p.id === 'c')
    expect(c).toBeUndefined()
  })
})

describe('wrapLabel', () => {
  it('keeps short labels on one line', () => {
    expect(wrapLabel('Moon Landing')).toEqual(['Moon Landing'])
  })

  it('wraps long labels at word boundaries', () => {
    expect(wrapLabel('The Hijra: Muhammad Migrates to Medina')).toEqual([
      'The Hijra: Muhammad',
      'Migrates to Medina',
    ])
  })

  it('caps at three lines with an ellipsis', () => {
    const lines = wrapLabel('one two three four five six seven eight nine ten eleven twelve', 10, 3)
    expect(lines).toHaveLength(3)
    expect(lines[2]!.endsWith('…')).toBe(true)
  })
})

describe('categoryGroups', () => {
  it('groups by primary category, falling back to other', () => {
    expect(groupFor(['War', 'Science'])).toBe('power')
    expect(groupFor(['Exploration'])).toBe('knowledge')
    expect(groupFor(['Religion', 'Politics'])).toBe('culture')
    expect(groupFor(['Disasters'])).toBe('other')
    expect(groupFor([])).toBe('other')
  })
})

describe('spaceMilestones', () => {
  it('keeps higher-ranked lines and drops crowded lower-ranked ones', () => {
    const ranked = [{ id: 'a', x: 100 }, { id: 'b', x: 120 }, { id: 'c', x: 300 }]
    expect(spaceMilestones(ranked, 48).map((m) => m.id)).toEqual(['a', 'c'])
  })
})
