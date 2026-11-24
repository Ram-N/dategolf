import { describe, it, expect } from 'vitest'
import {
  FULL_VIEW,
  MAX_YEAR,
  MIN_SPAN,
  MIN_YEAR,
  centerOn,
  eraInView,
  eraView,
  formatTick,
  interpolateView,
  pan,
  span,
  tickStep,
  ticks,
  xToYear,
  yearToX,
  zoomAround,
} from '../dateflow/timeScale'
import {
  layoutLabels,
  minImportanceForSpan,
  segmentHitsRect,
  segmentsCross,
  spaceMilestones,
  wrapLabel,
  type LayoutItem,
} from '../dateflow/visibility'
import { FAMILIES, FAMILY_BY_CATEGORY, familyFor, shapeOf, shapePath } from '../dateflow/categoryGroups'
import { densityBins } from '../dateflow/density'
import { activeDuring, beforeAndAfter, meanwhile, summarizePeriod } from '../dateflow/explore'
import {
  NO_FILTERS,
  categoriesByFrequency,
  effectiveDetail,
  importanceThreshold,
  matchesFilters,
  toggleIn,
} from '../dateflow/filters'
import {
  DEFAULT_LANES,
  laneFor,
  moveLane,
  sanitizeLanes,
  toggleLane,
  visibleLanes,
  type LaneId,
} from '../dateflow/lanes'
import {
  emptyRows,
  eventsDuring,
  aliveTogether,
  formatPhase,
  formatSpan,
  packBars,
  phaseSegments,
  revealedSubSpans,
  spanParents,
  topLevelSpans,
  yearsBetween,
} from '../dateflow/durations'
import { formatYear, parseYear } from '@/utils/formatYear'
import type { Event } from '@/types'
import eventsData from '@/data/events.json'
import { constellationThreshold, dotRadius, hiddenOn, layoutTracks, OFF_TRACK_H, OTHER_STATES, scatter, stateTracks, toggleTrack, trackOf, tracksFor } from '../dateflow/constellation'
import type { Span, Relationship, RelationshipData } from '@/types/dateflow'
import durationsData from '@/data/durations.json'
import erasData from '@/data/eras.json'
import relationshipsData from '@/data/relationships.json'

const W = 1000

describe('people (Phase 13)', () => {
  const life = (id: string, startYear: number, endYear: number, person = true): Span => ({
    id, name: id, startYear, endYear, description: '', categories: ['Politics'], region: 'Europe', importance: 5,
    kind: 'period', person,
  })
  const akbar = life('akbar', 1542, 1605)
  const elizabeth = life('elizabeth', 1533, 1603)
  const newton = life('newton', 1643, 1727)
  const reign = life('reign-of-akbar', 1556, 1605, false)

  it('lists the people alive at the same time, longest overlap first, never non-people', () => {
    expect(aliveTogether(akbar, [akbar, elizabeth, newton, reign]).map((x) => [x.d.id, x.from, x.to, x.years]))
      .toEqual([['elizabeth', 1542, 1603, 61]])
  })

  it('counts years across the BCE/CE boundary without a year 0', () => {
    expect(yearsBetween(-4, 30)).toBe(33)
    expect(yearsBetween(1869, 1948)).toBe(79)
  })

  it('keeps a life out of bar nesting, so a reign stays inside its empire', () => {
    const empire = { ...life('mughal', 1526, 1857, false), kind: 'empire' as const }
    const links = [
      { source: 'reign-of-akbar', type: 'part_of', target: 'mughal' },
      { source: 'reign-of-akbar', type: 'part_of', target: 'akbar' }, // a stray link to a life is ignored
    ] as Relationship[]
    expect(spanParents(links, [empire, akbar, reign]).get('reign-of-akbar')).toBe('mughal')
  })
})

describe('life-cycle phases (Phase 12)', () => {
  const phases = [
    { kind: 'foundation' as const, title: 'A', start: 1299, end: 1326, description: 'x', approximate: true },
    { kind: 'expansion' as const, title: 'B', start: 1326, end: 1453, description: 'y' },
    { kind: 'end' as const, title: 'C', start: 1453, end: 1922, description: 'z' },
  ]
  const toX = (y: number) => y - 1299 // one pixel per year, from 1299

  it('lays phases end to end inside the bar, clipped to what is drawn', () => {
    expect(phaseSegments(phases, toX, 0, 623).map((s) => [s.x, s.w])).toEqual([[0, 27], [27, 127], [154, 469]])
    // A bar cut off by the screen edge clips its phases; ones wholly outside are dropped
    expect(phaseSegments(phases, toX, 100, 200).map((s) => [s.phase.title, s.x, s.w])).toEqual([['B', 100, 54], ['C', 154, 46]])
  })

  it('writes an approximate phase with c.', () => {
    expect(formatPhase(phases[0]!, formatYear)).toBe('c. 1299 – 1326')
    expect(formatPhase(phases[1]!, formatYear)).toBe('1326 – 1453')
  })
})

describe('timeScale', () => {
  it('era chips open an era exactly, and light up only when the view matches one', () => {
    const eras = erasData
    const medieval = eras.find((e) => e.id === 'medieval')!
    expect(eraView(medieval)).toEqual({ start: 500, end: 1500 })
    expect(eraInView(eraView(medieval), eras)?.id).toBe('medieval')
    expect(eraInView({ start: 510, end: 1505 }, eras)?.id).toBe('medieval') // within 2% of the span
    expect(eraInView({ start: 600, end: 1500 }, eras)).toBeNull() // zoomed in: no chip lit
    expect(eraInView(FULL_VIEW, eras)).toBeNull()
    const ancient = eras.find((e) => e.id === 'ancient')!
    expect(eraView(ancient)).toEqual({ start: MIN_YEAR, end: -800 }) // clamped to the history bounds
  })

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
    const violations: string[] = []
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
        if (a.rect.x1 < 0 || a.rect.x2 > OPTS.width) violations.push(`run ${run}: label off screen`)
        for (let j = 0; j < geom.length; j++) {
          const b = geom[j]!
          if (i === j || a.side !== b.side) continue
          const overlap = a.rect.x1 < b.rect.x2 && b.rect.x1 < a.rect.x2 && a.rect.d1 < b.rect.d2 && b.rect.d1 < a.rect.d2
          if (overlap) violations.push(`run ${run}: labels ${i}/${j} overlap`)
          if (segmentHitsRect(a.leader, b.rect)) violations.push(`run ${run}: leader ${i} through label ${j}`)
          if (j > i && segmentsCross(a.leader, b.leader)) violations.push(`run ${run}: leaders ${i}/${j} cross`)
        }
      }
    }
    // One assertion at the end: ~500k expect() calls inside the loops made this test slow.
    expect(violations).toEqual([])
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

describe('durations', () => {
  it('packs overlapping bars into rows, most important first', () => {
    const placed = packBars(
      [
        { id: 'minor', x1: 0, x2: 100, priority: 3 },
        { id: 'major', x1: 50, x2: 200, priority: 9 },
        { id: 'later', x1: 210, x2: 300, priority: 5 },
      ],
      2,
    )
    expect(placed).toEqual([
      { id: 'major', row: 0 },
      { id: 'later', row: 0 },
      { id: 'minor', row: 1 },
    ])
  })

  it('drops bars that fit in no row', () => {
    const placed = packBars(
      [
        { id: 'a', x1: 0, x2: 100, priority: 9 },
        { id: 'b', x1: 10, x2: 90, priority: 5 },
      ],
      1,
    )
    expect(placed.map((p) => p.id)).toEqual(['a'])
  })

  const roman: Span = {
    id: 'roman-empire',
    name: 'Roman Empire',
    startYear: -27,
    endYear: 476,
    description: '',
    categories: ['Politics'],
    region: 'Europe',
    importance: 9,
    kind: 'empire',
    approximate: true,
  }

  it('lists the most important same-region events during a duration, in date order', () => {
    const ev = (id: string, year: number, importance: number, region = 'Europe'): Event => ({
      id,
      name: id,
      year,
      importance,
      region,
      categories: ['Politics'],
      aliases: [],
      description: '',
      difficulty: 'easy',
    })
    const events = [ev('late', 400, 5), ev('early', 10, 8), ev('minor', 200, 2), ev('asia', 100, 9, 'East Asia'), ev('after', 600, 9)]
    expect(eventsDuring(events, roman, 2).map((e) => e.id)).toEqual(['early', 'late'])
  })

  it('marks approximate spans with c.', () => {
    expect(formatSpan(roman, formatYear)).toBe('c. 27 BCE – c. 476')
  })
})

describe('lanes', () => {
  it('maps inconsistent region strings onto lanes', () => {
    expect(laneFor('World')).toBe('global')
    expect(laneFor('North America')).toBe('americas')
    expect(laneFor('Southeast Asia')).toBe('east-asia')
    expect(laneFor('Atlantis')).toBe('global')
  })

  it('shows lanes in order and keeps at least one visible', () => {
    expect(visibleLanes(DEFAULT_LANES)).toEqual(['south-asia', 'east-asia', 'europe', 'global'])
    const one = { order: DEFAULT_LANES.order, visible: ['europe'] as LaneId[] }
    expect(toggleLane(one, 'europe')).toBe(one)
    expect(toggleLane(one, 'africa').visible).toEqual(['europe', 'africa'])
  })

  it('reorders lanes and ignores moves past either end', () => {
    const moved = moveLane(DEFAULT_LANES, 'europe', -1)
    expect(moved.order.slice(0, 3)).toEqual(['south-asia', 'europe', 'east-asia'])
    expect(moveLane(DEFAULT_LANES, 'south-asia', -1)).toBe(DEFAULT_LANES)
    expect(moveLane(DEFAULT_LANES, 'global', 1)).toBe(DEFAULT_LANES)
  })

  it('repairs saved lane state', () => {
    const fixed = sanitizeLanes({ order: ['europe', 'bogus' as LaneId], visible: [] })
    expect(fixed.order[0]).toBe('europe')
    expect(fixed.order).toHaveLength(7)
    expect(fixed.visible).toEqual(DEFAULT_LANES.visible)
    expect(sanitizeLanes(null)).toEqual(DEFAULT_LANES)
  })
})

describe('filters', () => {
  const sci = { categories: ['Science', 'Technology'], region: 'Europe' }
  const war = { categories: ['War'], region: 'North America' }

  it('lets everything through with no filters', () => {
    expect(matchesFilters(sci, NO_FILTERS, true)).toBe(true)
    expect(matchesFilters(war, NO_FILTERS, true)).toBe(true)
  })

  it('matches any selected category', () => {
    const f = { ...NO_FILTERS, categories: ['Technology', 'Religion'] }
    expect(matchesFilters(sci, f, true)).toBe(true)
    expect(matchesFilters(war, f, true)).toBe(false)
  })

  it('combines categories and regions with AND, regions via lanes', () => {
    const f = { ...NO_FILTERS, categories: ['War'], regions: ['americas' as LaneId] }
    expect(matchesFilters(war, f, true)).toBe(true) // North America → americas lane
    expect(matchesFilters({ ...war, region: 'Europe' }, f, true)).toBe(false)
    expect(matchesFilters({ ...war, region: 'Europe' }, f, false)).toBe(true) // regions ignored in Lanes mode
  })

  it('shifts the importance threshold with the detail setting', () => {
    expect(importanceThreshold(5000, 0)).toBe(7)
    expect(importanceThreshold(5000, 2)).toBe(5)
    expect(importanceThreshold(5000, -2)).toBe(9)
    expect(importanceThreshold(10, 2)).toBe(0) // never below zero
  })

  it('shifts detail by the density preset on top of the slider', () => {
    expect(effectiveDetail(0, 'standard')).toBe(0)
    expect(effectiveDetail(0, 'simple')).toBe(-1)
    expect(effectiveDetail(1, 'detailed')).toBe(3)
    expect(importanceThreshold(5000, effectiveDetail(2, 'detailed'))).toBe(3) // more than the slider alone allows
    expect(constellationThreshold(effectiveDetail(0, 'simple'))).toBe(5)
  })

  it('lists categories most common first', () => {
    expect(categoriesByFrequency([sci, war, { categories: ['War'], region: '' }])).toEqual([
      'War',
      'Science',
      'Technology',
    ])
  })

  it('toggles values in a list', () => {
    expect(toggleIn(['a'], 'b')).toEqual(['a', 'b'])
    expect(toggleIn(['a', 'b'], 'a')).toEqual(['b'])
  })
})

describe('explore', () => {
  const ev = (id: string, year: number, region: string, importance = 5): Event => ({
    id,
    name: id,
    year,
    region,
    importance,
    categories: ['Politics'],
    aliases: [],
    description: '',
    difficulty: 'easy',
  })
  const constantinople = ev('constantinople', 1453, 'Europe', 5)
  const events = [
    constantinople,
    ev('gutenberg', 1440, 'Europe', 5),
    ev('columbus', 1492, 'North America', 8),
    ev('far-americas', 1600, 'Americas', 9),
    ev('zheng-he', 1405, 'East Asia', 6),
    ev('ming-minor', 1450, 'East Asia', 3),
    ev('ming-big', 1421, 'East Asia', 7),
    ev('ottoman', 1450, 'Middle East', 4),
    ev('rome', -27, 'Europe', 9),
  ]

  it('finds the top events in other lanes within the window', () => {
    const m = meanwhile(events, constantinople, 50, 2)
    expect(m.map((l) => l.lane)).toEqual(['east-asia', 'middle-east', 'americas'])
    expect(m[0]!.events.map((e) => e.id)).toEqual(['zheng-he', 'ming-big']) // top 2 by importance, in date order
    expect(m[2]!.events.map((e) => e.id)).toEqual(['columbus']) // 1600 is outside ±50
  })

  it('finds neighbours before and after in the same lane', () => {
    const { before, after } = beforeAndAfter(events, constantinople, 2)
    expect(before.map((e) => e.id)).toEqual(['rome', 'gutenberg'])
    expect(after).toEqual([])
  })

  const dur = (id: string, s: number, e: number, kind: Span['kind'], importance = 5): Span => ({
    id,
    name: id,
    startYear: s,
    endYear: e,
    kind,
    importance,
    description: '',
    categories: ['Politics'],
    region: 'Europe',
  })
  const durations = [
    dur('byzantine', 330, 1453, 'empire', 8),
    dur('ottoman', 1299, 1922, 'empire', 8),
    dur('ming', 1368, 1644, 'empire', 9),
    dur('renaissance', 1400, 1600, 'period', 5),
    dur('rome', -27, 476, 'empire', 9),
  ]

  it('lists durations active at a year, most important first', () => {
    expect(activeDuring(durations, 1453, 1453, 'empire').map((d) => d.id)).toEqual(['ming', 'byzantine', 'ottoman'])
    expect(activeDuring(durations, 1453, 1453, 'period').map((d) => d.id)).toEqual(['renaissance'])
  })

  it('summarises a period by lane', () => {
    const s = summarizePeriod(events, durations, 1400, 1500)
    expect(s.total).toBe(7)
    expect(s.empires.map((d) => d.id)).toEqual(['ming', 'byzantine', 'ottoman'])
    expect(s.lanes.map((l) => l.lane)).toEqual(['east-asia', 'europe', 'middle-east', 'americas'])
    expect(s.lanes.find((l) => l.lane === 'east-asia')!.events).toHaveLength(3)
  })
})

describe('constellation', () => {
  it('puts events on geography or activity tracks', () => {
    const e = { region: 'North America', categories: ['Technology', 'War'] }
    expect(trackOf(e, 'geography')).toBe('americas')
    expect(trackOf(e, 'activity')).toBe('science') // the family of the primary category
    expect(trackOf({ region: 'Mars', categories: ['Exploration'] }, 'activity')).toBe('earth') // as its shape
    expect(trackOf({ region: 'Mars', categories: [] }, 'activity')).toBe('society')
  })

  it('has a track for every event', () => {
    for (const axis of ['geography', 'activity', 'society'] as const) {
      const ids = new Set(tracksFor(axis).map((t) => t.id))
      for (const e of eventsData as Event[]) expect(ids.has(trackOf(e, axis))).toBe(true)
    }
  })

  it('puts events on Society tracks by their first non-political category', () => {
    expect(trackOf({ region: 'Europe', categories: ['Politics', 'Economy'] }, 'society')).toBe('trade')
    expect(trackOf({ region: 'Europe', categories: ['Disasters'] }, 'society')).toBe('social')
    expect(trackOf({ region: 'Europe', categories: ['War', 'Politics'] }, 'society')).toBe('politics-war')
    expect(hiddenOn({}, 'society')).toEqual(['politics-war']) // off until the viewer turns it on
    expect(hiddenOn(toggleTrack({}, 'society', 'politics-war'), 'society')).toEqual([])
    expect(hiddenOn({}, 'geography')).toEqual([])
  })

  it('sizes dots logarithmically by importance', () => {
    const r = [2, 4, 6, 8, 9].map(dotRadius)
    for (let i = 1; i < r.length; i++) expect(r[i]!).toBeGreaterThan(r[i - 1]!)
    expect(r[1]! - r[0]!).toBeGreaterThan(r[3]! - r[2]!) // steps shrink as importance grows
    expect(dotRadius(9)).toBeCloseTo(7)
    expect(dotRadius(1)).toBe(dotRadius(2)) // clamped
  })

  it('shows every event by default and thins with less detail', () => {
    expect(constellationThreshold(0)).toBe(0)
    expect(constellationThreshold(2)).toBe(0)
    expect(constellationThreshold(-1)).toBe(5)
    expect(constellationThreshold(-2)).toBe(6)
  })

  it('switches tracks off: no room wasted, the rest share the height', () => {
    let hidden = toggleTrack({}, 'geography', 'europe')
    hidden = toggleTrack(hidden, 'geography', 'nowhere') // not a track: ignored
    expect(hidden).toEqual({ geography: ['europe'] })
    const rows = layoutTracks(tracksFor('geography'), hidden.geography!, 0, 7 * 100)
    const europe = rows.find((r) => r.id === 'europe')!
    expect([europe.on, europe.h]).toEqual([false, OFF_TRACK_H])
    expect(rows.filter((r) => r.on).every((r) => r.h === (700 - OFF_TRACK_H) / 6)).toBe(true)
    expect(rows[rows.length - 1]!.top + rows[rows.length - 1]!.h).toBeCloseTo(700) // fills the height exactly
    expect(layoutTracks(tracksFor('activity'), hidden.activity ?? [], 0, 600).every((r) => r.on)).toBe(true)
    expect(toggleTrack(hidden, 'geography', 'europe')).toEqual({ geography: [] })
  })

  it('gives each state in view a row, oldest first, with sub-states rolled up and the rest on Other', () => {
    const st = (id: string, startYear: number, endYear: number, importance = 6) =>
      [id, { id, name: id.toUpperCase(), startYear, endYear, importance }] as const
    const states = new Map([st('delhi', 1206, 1526), st('khalji', 1290, 1320), st('mughal', 1526, 1857, 8),
                            st('timurid', 1370, 1507), st('rome', -27, 476, 9)])
    const parents = new Map([['khalji', 'delhi']])
    const eventStates = { a: ['khalji'], b: ['delhi'], c: ['mughal', 'delhi'], d: ['timurid'], e: [], f: ['rome'] }
    const evs = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id }))
    const { tracks, of } = stateTracks(evs, eventStates, states, parents)
    expect(tracks.map((t) => t.id)).toEqual(['delhi', 'timurid', 'mughal', OTHER_STATES]) // Rome isn't in view
    expect(tracks[0]).toMatchObject({ start: 1206, end: 1526 })
    expect(of('a')).toEqual(['delhi'])
    expect(of('c')).toEqual(['mughal', 'delhi']) // two states, two rows
    expect(of('e')).toEqual([OTHER_STATES])
    const two = stateTracks(evs, eventStates, states, parents, 1) // only Delhi (3 events) gets a row
    expect(two.tracks.map((t) => t.id)).toEqual(['delhi', OTHER_STATES])
    expect(two.of('d')).toEqual([OTHER_STATES])
    expect(toggleTrack({}, 'states', 'delhi')).toEqual({ states: ['delhi'] }) // rows vary: any id is kept
  })

  it('scatters deterministically within [-1, 1]', () => {
    expect(scatter('magna-carta')).toBe(scatter('magna-carta'))
    const vals = (eventsData as Event[]).map((e) => scatter(e.id))
    expect(Math.min(...vals)).toBeGreaterThanOrEqual(-1)
    expect(Math.max(...vals)).toBeLessThanOrEqual(1)
    expect(new Set(vals.map((v) => Math.round(v * 10))).size).toBeGreaterThan(15) // spread, not clumped
  })
})

describe('families', () => {
  it('puts every category in a family by primary category', () => {
    expect(familyFor(['War', 'Politics'])).toBe('war')
    expect(familyFor(['Philosophy'])).toBe('belief')
    expect(familyFor(['Exploration'])).toBe('earth')
    expect(familyFor([])).toBe('society')
    const cats = new Set((eventsData as Event[]).flatMap((e) => e.categories))
    expect([...cats].filter((c) => !FAMILY_BY_CATEGORY[c])).toEqual([]) // a new category needs a family
  })

  it('gives each family its own shape', () => {
    expect(new Set(FAMILIES.map((f) => f.shape)).size).toBe(FAMILIES.length)
    expect(shapeOf('war')).toBe('triangle')
  })

  it('draws closed paths centred on the point for every shape', () => {
    for (const f of FAMILIES) {
      const d = shapePath(f.shape, 100, 50, 5)
      expect(d.startsWith('M')).toBe(true)
      expect(d.endsWith('Z')).toBe(true)
      const nums = [...d.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map((m) => [Number(m[1]), Number(m[2])])
      if (f.shape === 'circle') continue // arcs use relative coordinates
      const xs = nums.map((n) => n[0]!)
      const ys = nums.map((n) => n[1]!)
      expect(Math.abs((Math.min(...xs) + Math.max(...xs)) / 2 - 100)).toBeLessThan(0.5)
      expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(5 * 3.2) // stays roughly circle-sized
    }
  })
})

describe('sub-spans', () => {
  it('packs in rounds that share rows', () => {
    const rows = emptyRows(1)
    expect(packBars([{ id: 'a', x1: 0, x2: 100, priority: 5 }], 1, 4, rows)).toEqual([{ id: 'a', row: 0 }])
    expect(packBars([{ id: 'b', x1: 50, x2: 150, priority: 9 }], 1, 4, rows)).toEqual([]) // a holds the row
    expect(packBars([{ id: 'c', x1: 120, x2: 200, priority: 1 }], 1, 4, rows)).toEqual([{ id: 'c', row: 0 }])
  })

  const span = (id: string): Span => ({
    id, name: id, startYear: 1, endYear: 2, description: '', categories: [], region: 'Europe', importance: 5, kind: 'period',
  })
  const spans = ['mughal', 'shahjahan', 'taj', 'akbar', 'punic'].map(span)
  const parents = spanParents(
    [
      { source: 'shahjahan', type: 'part_of', target: 'mughal', why: '' },
      { source: 'taj', type: 'part_of', target: 'shahjahan', why: '' },
      { source: 'akbar', type: 'part_of', target: 'mughal', why: '' },
      { source: 'akbar', type: 'preceded', target: 'shahjahan', why: '' }, // not nesting
      { source: 'punic', type: 'part_of', target: 'some-event', why: '' }, // not a span
    ],
    spans,
  )

  it('maps part_of links between spans only', () => {
    expect([...parents]).toEqual([['shahjahan', 'mughal'], ['taj', 'shahjahan'], ['akbar', 'mughal']])
  })

  it('keeps a bar only for spans with no ancestor among the candidates', () => {
    expect(topLevelSpans(['mughal', 'taj', 'akbar', 'punic'], parents)).toEqual(['mughal', 'punic']) // taj via shahjahan
    expect(topLevelSpans(['taj', 'akbar'], parents)).toEqual(['taj', 'akbar']) // parents not shown: stand alone
  })

  it('reveals children that fit, and grandchildren only inside a revealed child', () => {
    const all = () => true
    expect(revealedSubSpans('mughal', parents, all)).toEqual([
      { id: 'shahjahan', depth: 1 },
      { id: 'taj', depth: 2 },
      { id: 'akbar', depth: 1 },
    ])
    expect(revealedSubSpans('mughal', parents, (id) => id !== 'shahjahan')).toEqual([{ id: 'akbar', depth: 1 }])
    expect(revealedSubSpans('mughal', parents, all, 1).map((r) => r.id)).toEqual(['shahjahan', 'akbar'])
  })

  it('finds the nested spans in the real data', () => {
    const real = spanParents((relationshipsData as RelationshipData).links, durationsData as Span[])
    expect(real.get('khalji-dynasty')).toBe('delhi-sultanate')
    expect(topLevelSpans([...real.keys(), 'delhi-sultanate'], real)).not.toContain('khalji-dynasty')
  })
})
