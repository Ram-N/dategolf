import { describe, it, expect } from 'vitest'
import {
  FULL_VIEW,
  MAX_YEAR,
  MIN_SPAN,
  MIN_YEAR,
  centerOn,
  formatTick,
  interpolateView,
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
  segmentHitsRect,
  segmentsCross,
  spaceMilestones,
  wrapLabel,
  type LayoutItem,
} from '../dateroll/visibility'
import { groupFor } from '../dateroll/categoryGroups'
import { densityBins } from '../dateroll/density'
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

  const OPTS = { width: 1000, levelsPerSide: 12, levelH: 13, axisGap: { above: 10, below: 24 } }
  const item = (id: string, dotX: number, priority: number, extra: Partial<LayoutItem> = {}): LayoutItem => ({
    id,
    dotX,
    labelWidth: 80,
    boxH: 19,
    levels: 2,
    priority,
    ...extra,
  })

  it('places the most important label nearest the axis with a vertical leader', () => {
    const placed = layoutLabels([item('minor', 100, 3), item('major', 110, 9)], OPTS)
    expect(placed[0]).toMatchObject({ id: 'major', side: 'above', level: 0, labelX: 110, leaderX: 110 })
    expect(placed[1]).toMatchObject({ id: 'minor', side: 'below', level: 0 })
  })

  it('keeps non-overlapping labels on the same level', () => {
    const placed = layoutLabels([item('a', 100, 5), item('b', 300, 5)], OPTS)
    expect(placed.every((p) => p.level === 0 && p.side === 'above')).toBe(true)
  })

  it('shifts a label sideways when the space above its dot is taken', () => {
    const placed = layoutLabels([item('a', 100, 9), item('b', 100, 8), item('c', 140, 5)], OPTS)
    const c = placed.find((p) => p.id === 'c')!
    expect(c).toBeDefined()
    expect(c.labelX).not.toBe(140)
  })

  it('keeps labels inside the viewport', () => {
    const placed = layoutLabels([item('edge', 5, 5), item('edge2', 995, 5)], OPTS)
    expect(placed.map((p) => p.labelX)).toEqual([42, 958])
  })

  it('drops labels when there is no room at all', () => {
    const tight = { ...OPTS, levelsPerSide: 2, shifts: [0] }
    const placed = layoutLabels([item('a', 100, 9), item('b', 105, 7), item('c', 110, 5)], tight)
    expect(placed.map((p) => p.id)).toEqual(['a', 'b'])
  })

  it('never overlaps labels, never runs a leader through a label, never crosses leaders (fuzz)', () => {
    let seed = 42
    const rand = () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32)
    for (let run = 0; run < 300; run++) {
      const items = Array.from({ length: 40 }, (_, i) => {
        const lines = 1 + Math.floor(rand() * 3)
        return item(`e${i}`, rand() * 1000, Math.floor(rand() * 9), {
          labelWidth: 50 + rand() * 90,
          boxH: lines * 13 + 6,
          levels: lines + 1,
        })
      })
      const placed = layoutLabels(items, OPTS)
      const byId = new Map(items.map((it) => [it.id, it]))
      const geom = placed.map((p) => {
        const it = byId.get(p.id)!
        const d0 = OPTS.axisGap[p.side] + p.level * OPTS.levelH
        return {
          side: p.side,
          rect: { x1: p.labelX - it.labelWidth / 2, x2: p.labelX + it.labelWidth / 2, d1: d0, d2: d0 + it.boxH },
          leader: { x1: it.dotX, d1: 0, x2: p.leaderX, d2: d0 },
        }
      })
      for (let i = 0; i < geom.length; i++) {
        const a = geom[i]!
        expect(a.rect.x1).toBeGreaterThanOrEqual(0)
        expect(a.rect.x2).toBeLessThanOrEqual(OPTS.width)
        for (let j = 0; j < geom.length; j++) {
          const b = geom[j]!
          if (i === j || a.side !== b.side) continue
          const overlap = a.rect.x1 < b.rect.x2 && b.rect.x1 < a.rect.x2 && a.rect.d1 < b.rect.d2 && b.rect.d1 < a.rect.d2
          expect(overlap).toBe(false)
          expect(segmentHitsRect(a.leader, b.rect)).toBe(false)
          if (j > i) expect(segmentsCross(a.leader, b.leader)).toBe(false)
        }
      }
    }
  })
})

describe('geometry', () => {
  const rect = { x1: 0, x2: 10, d1: 0, d2: 10 }
  it('detects a segment through a rect, not one beside it', () => {
    expect(segmentHitsRect({ x1: -5, d1: 5, x2: 15, d2: 5 }, rect)).toBe(true)
    expect(segmentHitsRect({ x1: 12, d1: 0, x2: 20, d2: 10 }, rect)).toBe(false)
    expect(segmentHitsRect({ x1: 5, d1: 10, x2: 5, d2: 20 }, rect)).toBe(false) // touching an edge is fine
  })
  it('detects crossing leaders and stacked vertical leaders, not a shared start', () => {
    expect(segmentsCross({ x1: 0, d1: 0, x2: 10, d2: 10 }, { x1: 10, d1: 0, x2: 0, d2: 10 })).toBe(true)
    expect(segmentsCross({ x1: 5, d1: 0, x2: 5, d2: 10 }, { x1: 5, d1: 0, x2: 5, d2: 30 })).toBe(true)
    expect(segmentsCross({ x1: 5, d1: 0, x2: 0, d2: 10 }, { x1: 5, d1: 0, x2: 10, d2: 10 })).toBe(false)
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

describe('densityBins', () => {
  it('counts events per equal time slice, ignoring out-of-range years', () => {
    const bins = densityBins([-100, -50, 0, 10, 99, 100, 500], -100, 100, 4)
    expect(bins.map((b) => b.count)).toEqual([1, 1, 2, 2]) // bins are [start, end); the last includes its end
    expect(bins[0]).toMatchObject({ start: -100, end: -50 })
  })
})

describe('interpolateView', () => {
  const a = { start: -3000, end: 2000 }
  const b = { start: 1400, end: 1500 }
  it('starts at a and ends at b', () => {
    expect(interpolateView(a, b, 0)).toEqual(a)
    const end = interpolateView(a, b, 1)
    expect(end.start).toBeCloseTo(1400)
    expect(end.end).toBeCloseTo(1500)
  })
  it('changes span geometrically and centre linearly', () => {
    const mid = interpolateView(a, b, 0.5)
    expect(span(mid)).toBeCloseTo(Math.sqrt(5000 * 100))
    expect((mid.start + mid.end) / 2).toBeCloseTo((-500 + 1450) / 2)
  })
})
