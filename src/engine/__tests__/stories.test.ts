import { describe, it, expect } from 'vitest'
import type { Event } from '@/types'
import type { Duration, RelationshipData } from '@/types/dateflow'
import eventsJson from '@/data/events.json'
import durationsJson from '@/data/durations.json'
import relationshipsJson from '@/data/relationships.json'
import { buildStory, featuredStories, gapText, narrate, storyCounts, storyStops, yearGap } from '../dateflow/stories'

const events = eventsJson as Event[]
const durations = durationsJson as Duration[]
const data = relationshipsJson as RelationshipData

const ev = (id: string, year: number, region = 'Europe', approximate = false) =>
  ({ id, name: id, year, region, approximate, categories: [], aliases: [], description: '', difficulty: 'easy',
     importance: 5 }) as Event
const span = (id: string, startYear: number, endYear: number, region = 'Europe') =>
  ({ id, name: id, startYear, endYear, region, description: '', categories: [], importance: 5, kind: 'period' }) as Duration
const types: RelationshipData['types'] = {
  contributed_to: { label: 'contributed to', inverse: 'had as a contributing factor', causal: true, story: 'cause' },
  preceded: { label: 'preceded', inverse: 'followed', causal: false, story: 'sequence' },
  began: { label: 'began', inverse: 'began with', causal: true, story: 'frame' },
  ended: { label: 'ended', inverse: 'was ended by', causal: true, story: 'frame' },
  part_of: { label: 'is part of', inverse: 'includes', causal: false, story: 'context' },
}

describe('dateflow stories — rules', () => {
  // depression → chancellor → (war begins) began [war] ; [war] ended by surrender ; bomb preceded+contributed surrender
  const toy: RelationshipData = {
    types,
    links: [
      { source: 'depression', type: 'contributed_to', target: 'chancellor', why: 'w1' },
      { source: 'chancellor', type: 'preceded', target: 'war-begins', why: 'w2' },
      { source: 'war-begins', type: 'began', target: 'war', why: 'w3' },
      { source: 'surrender', type: 'ended', target: 'war', why: 'w4' },
      { source: 'bomb', type: 'preceded', target: 'surrender', why: 'w5' },
      { source: 'bomb', type: 'contributed_to', target: 'surrender', why: 'w6', confidence: 'medium' },
      { source: 'bomb', type: 'part_of', target: 'war', why: 'w7' },
      { source: 'surrender', type: 'part_of', target: 'war', why: 'w8' },
    ],
  }
  const evs = [ev('depression', 1929, 'Americas'), ev('chancellor', 1933), ev('war-begins', 1939), ev('bomb', 1945, 'East Asia'),
               ev('surrender', 1945, 'East Asia')]
  const spans = [span('war', 1939, 1945, 'Global')]

  it('walks back through causes, sequences, a beginning and an ending, in time order', () => {
    const s = buildStory('surrender', toy, evs, spans)!
    expect(s.nodes.map((n) => n.id)).toEqual(['depression', 'chancellor', 'war-begins', 'war', 'bomb', 'surrender'])
    const ended = s.edges.find((e) => e.type === 'ended')!
    expect([ended.from, ended.to, ended.label]).toEqual(['war', 'surrender', 'was ended by']) // span → ender
    expect(s.start).toBe(1929)
    expect(s.end).toBe(1945)
  })

  it('keeps one edge per pair, a cause over a sequence, and marks it debated', () => {
    const s = buildStory('surrender', toy, evs, spans)!
    const bomb = s.edges.filter((e) => e.from === 'bomb' && e.to === 'surrender')
    expect(bomb).toHaveLength(1)
    expect(bomb[0]).toMatchObject({ role: 'cause', label: 'contributed to', debated: true, crossesRegion: false })
  })

  it('never calls a sequence a cause', () => {
    const s = buildStory('surrender', toy, evs, spans)!
    const seq = s.edges.find((e) => e.from === 'chancellor')!
    expect(seq).toMatchObject({ role: 'sequence', label: 'then' })
    expect(narrate(s)).toContain('6 years later: war-begins.')
    expect(narrate(s)).toContain('depression contributed to chancellor.')
    expect(narrate(s)).toContain('(debated)')
  })

  it('respects depth and size limits, and says when there is more', () => {
    const shallow = buildStory('surrender', toy, evs, spans, { depth: 1 })!
    expect(shallow.nodes.map((n) => n.id).sort()).toEqual(['bomb', 'surrender', 'war'])
    expect(shallow.truncated).toBe(true)
    expect(buildStory('surrender', toy, evs, spans, { max: 3 })!.nodes).toHaveLength(3)
  })

  it('walks forward too, and survives a cycle', () => {
    const cyclic: RelationshipData = { types, links: [...toy.links,
      { source: 'surrender', type: 'contributed_to', target: 'depression', why: 'a deliberate cycle' }] }
    const s = buildStory('depression', cyclic, evs, spans, { direction: 'forward', depth: 10 })!
    expect(new Set(s.nodes.map((n) => n.id)).size).toBe(s.nodes.length)
    expect(s.nodes.map((n) => n.id)).toContain('surrender')
  })

  it('finds backdrops and fans', () => {
    const s = buildStory('surrender', toy, evs, spans, { depth: 1 })!
    expect(s.backdrops.map((b) => b.id)).toEqual([]) // the war is itself a step here
    const stops = storyStops(buildStory('surrender', toy, evs, spans)!)
    expect(stops.find((x) => x.node.id === 'surrender')!.incoming.map((e) => e.from).sort()).toEqual(['bomb', 'war'])
  })

  it('counts years without a year 0 and says "about" for approximate dates', () => {
    expect(yearGap(-44, 14)).toBe(57)
    expect(yearGap(1933, 1939)).toBe(6)
    expect(gapText(1933, 1939)).toBe('6 years later')
    expect(gapText(1945, 1945)).toBe('the same year')
    expect(gapText(-2600, -2300, true)).toBe('about 300 years later')
  })
})

describe('dateflow stories — real data', () => {
  it('tells the road to Japan\'s surrender through the war and the bomb', () => {
    const s = buildStory('japan-world-war-two-defeat', data, events, durations, { depth: 6 })!
    const ids = s.nodes.map((n) => n.id)
    for (const id of ['world-war-2', 'world-war-two', 'atomic-bomb-hiroshima', 'manhattan-project']) expect(ids).toContain(id)
    expect(ids.indexOf('manhattan-project')).toBeLessThan(ids.indexOf('atomic-bomb-hiroshima'))
  })

  it('follows the Mughal succession in order', () => {
    const s = buildStory('aurangzeb-becomes-emperor', data, events, durations, { depth: 10 })!
    const ids = s.nodes.map((n) => n.id)
    const order = ['babur-founds-mughal-empire', 'humayun-succeeds-babur', 'death-of-akbar', 'death-of-jahangir', 'aurangzeb-becomes-emperor']
    expect(order.map((id) => ids.indexOf(id))).toEqual(order.map((id) => ids.indexOf(id)).sort((a, b) => a - b))
  })

  it('builds every featured story, without repeats', () => {
    const featured = featuredStories(data, events, durations)
    expect(featured.length).toBeGreaterThanOrEqual(5)
    expect(new Set(featured.map((f) => f.rootId)).size).toBe(featured.length)
    for (const f of featured) expect(buildStory(f.rootId, data, events, durations)).not.toBeNull()
  })

  it('every story edge reads earlier → later (no time travel)', () => {
    for (const l of data.links) {
      const s = buildStory(l.target, data, events, durations, { depth: 1 })
      for (const e of s?.edges ?? []) {
        const from = s!.nodes.find((n) => n.id === e.from)!
        const to = s!.nodes.find((n) => n.id === e.to)!
        expect(from.year, `${e.from} ${e.label} ${e.to}`).toBeLessThanOrEqual(to.endYear ?? to.year)
      }
    }
  })

  it('counts story steps for the card buttons', () => {
    const c = storyCounts('japan-world-war-two-defeat', data, events, durations)
    expect(c.back).toBeGreaterThan(3)
    expect(storyCounts('thales-solar-eclipse', data, events, durations)).toEqual({ back: 0, forward: 0 })
  })
})
