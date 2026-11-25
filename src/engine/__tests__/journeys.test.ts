import { describe, it, expect } from 'vitest'
import type { Event } from '@/types'
import type { Span, RelationshipData } from '@/types/dateflow'
import eventsJson from '@/data/events.json'
import durationsJson from '@/data/durations.json'
import relationshipsJson from '@/data/relationships.json'
import journeysJson from '@/data/journeys.json'
import { journeyIds, recordStep, stopFrame, resolveJourney, resumeStep, stepJourneyIndex, type JourneyData } from '../dateflow/journeys'

const events = eventsJson as Event[]
const durations = durationsJson as Span[]
const data = relationshipsJson as RelationshipData
const journeys = journeysJson as JourneyData[]

const ev = (id: string, name: string, year: number) =>
  ({ id, name, year, categories: [], region: 'Global', aliases: [], description: '', difficulty: 'easy',
     importance: 5 }) as Event
const sp = (id: string, name: string, startYear: number, endYear: number, approximate = false) =>
  ({ id, name, startYear, endYear, description: '', categories: [], region: 'Global', importance: 5,
     kind: 'state', ...(approximate ? { approximate } : {}) }) as Span

describe('resolveJourney', () => {
  const fixture = {
    events: [ev('sack', 'Fall of Constantinople', 1453), ev('web', 'Web Goes Public', 1991)],
    durations: [sp('rome', 'Roman Empire', -27, 476), sp('byz', 'Byzantine Empire', 330, 1453),
                sp('otto', 'Ottoman Empire', 1299, 1922, true)],
    data: {
      types: { ended: { label: 'ended', inverse: 'was ended by', causal: true, story: 'frame' } },
      links: [{ source: 'sack', type: 'ended', target: 'byz', why: 'The city fell.', confidence: 'medium' }],
    } as RelationshipData,
  }
  const run = (stops: JourneyData['stops']) =>
    resolveJourney({ id: 'j', title: 'J', intro: 'i', stops }, fixture.events, fixture.durations, fixture.data)!

  it('names a stop by its only item and takes its years from its items', () => {
    const j = run([{ items: ['rome'], narration: 'a' }, { items: ['byz', 'sack'], title: 'East', narration: 'b' }])
    expect(j.stops.map((s) => s.title)).toEqual(['Roman Empire', 'East'])
    expect([j.stops[1]!.start, j.stops[1]!.end]).toEqual([330, 1453])
    expect([j.start, j.end]).toEqual([-27, 1453])
  })

  it('bridges with a reviewed link, else overlap, else plain time', () => {
    const j = run([{ items: ['rome'], narration: 'a' }, { items: ['byz'], narration: 'b' },
                   { items: ['sack'], narration: 'c' }, { items: ['web'], narration: 'd' }])
    expect(j.stops[0]!.bridge).toBeNull()
    expect(j.stops[1]!.bridge).toEqual({ kind: 'overlap' })
    expect(j.stops[2]!.bridge).toEqual({ kind: 'link', text: 'Fall of Constantinople ended Byzantine Empire',
                                         why: 'The city fell.', debated: true })
    expect(j.stops[3]!.bridge).toEqual({ kind: 'gap', text: '538 years later' })
  })

  it('says "about" after an approximate stop', () => {
    const j = run([{ items: ['otto'], narration: 'a' }, { items: ['web'], narration: 'b' }])
    expect(j.stops[1]!.bridge).toEqual({ kind: 'gap', text: 'About 69 years later' })
  })

  it('skips items the app lacks and drops a stop left empty', () => {
    const j = run([{ items: ['rome', 'gone'], narration: 'a' }, { items: ['gone'], narration: 'b' },
                   { items: ['web'], narration: 'c' }])
    expect(j.stops.map((s) => s.items.map((x) => x.id))).toEqual([['rome'], ['web']])
  })

  it('rings a stop’s items and its neighbours’, or every item at the intro and the end', () => {
    const j = run([{ items: ['rome'], narration: 'a' }, { items: ['byz', 'sack'], title: 'East', narration: 'b' },
                   { items: ['web'], narration: 'c' }])
    expect([...journeyIds(j, 0)]).toEqual(['rome', 'byz', 'sack'])
    expect([...journeyIds(j, 2)]).toEqual(['byz', 'sack', 'web'])
    expect([...journeyIds(j, null)]).toEqual(['rome', 'byz', 'sack', 'web'])
    expect([...journeyIds(j, 3)]).toEqual(['rome', 'byz', 'sack', 'web'])
  })
})

describe('stopFrame', () => {
  const fixture = {
    events: [ev('sack', 'Fall of Constantinople', 1453), ev('web', 'Web Goes Public', 1991)],
    durations: [sp('alex', 'Conquests of Alexander', -334, -323), sp('pers', 'Achaemenid Empire', -550, -330),
                sp('rome', 'Roman Empire', -27, 476), sp('a', 'A', 1000, 1100), sp('b', 'B', 1120, 1200),
                sp('c', 'C', 1230, 1300)],
    data: { types: {}, links: [] } as RelationshipData,
  }
  const run = (ids: string[]) =>
    resolveJourney({ id: 'j', title: 'J', intro: 'i', stops: ids.map((id) => ({ items: [id], narration: '' })) },
                   fixture.events, fixture.durations, fixture.data)!

  it('frames a span by its years when its neighbours overlap it or are far away', () => {
    // Persia overlaps Alexander; Rome starts ~300 years after Alexander's 11, far beyond half his frame
    expect(stopFrame(run(['pers', 'alex', 'rome']), 1, 100)).toEqual([-334, -323])
  })

  it('reaches for the end of the previous stop and the start of the next when they are near', () => {
    // B is 80 years: half is 40, so A's end (20 years before) and C's start (30 after) peek in by 8 years
    expect(stopFrame(run(['a', 'b', 'c']), 1, 100)).toEqual([1092, 1238])
  })

  it('gives a single year a span around it', () => {
    expect(stopFrame(run(['sack', 'web']), 0, 100)).toEqual([1403, 1503])
  })
})

describe('stepJourneyIndex', () => {
  it('runs intro → stops → end, and stays put at either end', () => {
    expect(stepJourneyIndex(null, 1, 3)).toBe(0)
    expect(stepJourneyIndex(null, -1, 3)).toBeNull()
    expect(stepJourneyIndex(0, -1, 3)).toBeNull()
    expect(stepJourneyIndex(2, 1, 3)).toBe(3)
    expect(stepJourneyIndex(3, 1, 3)).toBe(3)
    expect(stepJourneyIndex(3, -1, 3)).toBe(2)
  })
})

describe('journey progress', () => {
  it('remembers the last stop, marks the end as done, and resumes only an unfinished journey', () => {
    let p = recordStep({}, 'j', null, 5)
    expect(p).toEqual({}) // the intro alone is not progress
    p = recordStep(p, 'j', 2, 5)
    expect(resumeStep(p.j, 5)).toBe(2)
    p = recordStep(p, 'j', 5, 5)
    expect(p.j).toEqual({ step: 5, done: true })
    expect(resumeStep(p.j, 5)).toBeNull() // finished: start again from the intro
    p = recordStep(p, 'j', 1, 5) // taking it again
    expect(p.j).toEqual({ step: 1, done: true })
    expect(resumeStep(p.j, 5)).toBe(1)
    expect(resumeStep(undefined, 5)).toBeNull()
  })
})

describe('journeys — real data', () => {
  it('every published journey resolves with all its stops and items', () => {
    expect(journeys.length).toBeGreaterThan(0)
    for (const raw of journeys) {
      const j = resolveJourney(raw, events, durations, data)!
      expect(j.stops.length).toBe(raw.stops.length)
      expect(j.stops.flatMap((s) => s.items).length).toBe(raw.stops.flatMap((s) => s.items).length)
    }
  })

  it('the Empires journey links Rome to Byzantium', () => {
    const j = resolveJourney(journeys.find((x) => x.id === 'rise-and-fall-of-empires')!, events, durations, data)!
    const byz = j.stops.find((s) => s.items[0]!.id === 'byzantine-empire')!
    expect(byz.bridge).toMatchObject({ kind: 'link', text: 'Roman Empire evolved into Byzantine Empire' })
  })
})
