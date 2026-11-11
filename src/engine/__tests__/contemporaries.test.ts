import { describe, it, expect } from 'vitest'
import type { Event } from '@/types'
import type { Duration } from '@/types/dateflow'
import eventsJson from '@/data/events.json'
import durationsJson from '@/data/durations.json'
import milestonesJson from '@/data/milestones.json'
import { LANES } from '../dateflow/lanes'
import { compareYears, distance, overlap, worldAt } from '../dateflow/contemporaries'
import { yearGap } from '../dateflow/stories'

const events = eventsJson as Event[]
const durations = durationsJson as Duration[]
const milestones = milestonesJson as string[]
const span = (id: string) => durations.find((d) => d.id === id)!
const event = (id: string) => events.find((e) => e.id === id)!
const ids = (list: { id: string }[]) => list.map((x) => x.id)

describe('contemporaries — the world in a year', () => {
  const w = worldAt(1250, events, durations)
  const active = w.regions.flatMap((r) => r.spans.map((s) => s.span.id))

  it('lists what existed in 1250, and nothing that had not begun', () => {
    for (const id of ['delhi-sultanate', 'song-dynasty', 'mongol-conquests', 'mali-empire', 'abbasid-caliphate']) {
      expect(active).toContain(id)
    }
    expect(active).not.toContain('ming-dynasty')
  })

  it('keeps every region, empty or not, in lane order', () => {
    expect(w.regions.map((r) => r.lane)).toEqual(LANES.map((l) => l.id))
  })

  it('says how far into each span the year falls', () => {
    const abbasid = w.regions.flatMap((r) => r.spans).find((s) => s.span.id === 'abbasid-caliphate')!
    expect(abbasid.until).toBe(8) // 1250 → 1258
    const delhi = w.regions.flatMap((r) => r.spans).find((s) => s.span.id === 'delhi-sultanate')!
    expect(delhi.since).toBe(44) // 1206 → 1250
  })

  it('only shows events within the window, counting across the missing year 0', () => {
    const w0 = worldAt(1, events, durations, 25)
    for (const r of w0.regions) for (const e of r.events) expect(Math.abs(yearGap(e.year, 1))).toBeLessThanOrEqual(25)
  })

  it('flags an uncertain span edge near the year', () => {
    const fake = [{ ...span('mali-empire'), approximate: true }]
    const near = worldAt(1240, [], fake).regions.flatMap((r) => r.spans)[0]!
    expect(near.uncertain).toBe(true) // 5 years after an approximate start
    const far = worldAt(1400, [], fake).regions.flatMap((r) => r.spans)[0]!
    expect(far.uncertain).toBe(false)
  })
})

describe('contemporaries — comparing two years', () => {
  it('1250 → 1500: what went, what came, what stayed', () => {
    const c = compareYears(1500, 1250, durations) // either order
    expect([c.from, c.to]).toEqual([1250, 1500])
    const all = (k: 'gone' | 'new' | 'continuing' | 'cameAndWent') => c.regions.flatMap((r) => ids(r[k]))
    expect(all('gone')).toContain('song-dynasty')
    expect(all('new')).toContain('ming-dynasty')
    expect(all('continuing')).toContain('delhi-sultanate')
    expect(all('gone')).not.toContain('delhi-sultanate')
    expect(c.totals.gone).toBe(all('gone').length)
  })
})

describe('contemporaries — overlap and distance', () => {
  it('Rome and Han coexisted for 246 years (27 BCE – 220 CE)', () => {
    expect(overlap(span('roman-empire'), span('han-dynasty'))).toMatchObject({ kind: 'overlap', start: -27, end: 220, years: 246 })
  })

  it('says how far apart two spans that never met were', () => {
    const o = overlap(span('han-dynasty'), span('ming-dynasty'))
    expect(o).toMatchObject({ kind: 'apart', years: 1368 - 220 })
    if (o.kind === 'apart') expect(o.first.id).toBe('han-dynasty')
  })

  it('Pyramid ↔ Caesar: about 2,516 years, and Caesar is closer to a famous later event', () => {
    const d = distance(event('egyptian-pyramids-built'), event('julius-caesar-assassination'), events, milestones)
    expect(d.years).toBe(2516)
    expect(d.approximate).toBe(true) // the pyramid's date is approximate
    expect(d.surprise).not.toBeNull()
    expect(d.surprise!.subject.id).toBe('julius-caesar-assassination')
    expect(d.surprise!.toNear).toBeLessThan(d.surprise!.toFar)
    expect(d.surprise!.near.year).toBeGreaterThan(1800) // far ahead: a striking comparison
  })

  it('no surprise for short gaps, and none invented', () => {
    expect(distance(event('world-war-one'), event('world-war-two'), events, milestones).surprise).toBeNull()
  })
})
