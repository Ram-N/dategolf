import { describe, it, expect } from 'vitest'
import type { Event } from '@/types'
import type { Duration, RelationshipData } from '@/types/dateflow'
import eventsJson from '@/data/events.json'
import durationsJson from '@/data/durations.json'
import relationshipsJson from '@/data/relationships.json'
import { connectedIds, connectionsFor } from '../dateflow/connections'

const events = eventsJson as Event[]
const durations = durationsJson as Duration[]
const data = relationshipsJson as RelationshipData

const ev = (id: string, year: number, name = id) =>
  ({ id, name, year, categories: [], region: 'Global', aliases: [], description: '', difficulty: 'easy',
     importance: 5 }) as Event
const span = (id: string, startYear: number, endYear: number, name = id) =>
  ({ id, name, startYear, endYear, description: '', categories: [], region: 'Global', importance: 5,
     kind: 'period' }) as Duration
const types = {
  part_of: { label: 'is part of', inverse: 'includes', causal: false, story: 'context' as const },
  ended: { label: 'ended', inverse: 'was ended by', causal: true, story: 'frame' as const },
}

describe('dateflow connections', () => {
  const small: RelationshipData = {
    types,
    links: [
      { source: 'battle', type: 'part_of', target: 'war', why: 'A battle of the war.' },
      { source: 'treaty', type: 'ended', target: 'war', why: 'The treaty ended it.' },
    ],
  }
  const evs = [ev('battle', 1805, 'Battle'), ev('treaty', 1815, 'Treaty')]
  const spans = [span('war', 1803, 1815, 'War')]

  it('reads a link forwards on its source and with the inverse on its target', () => {
    expect(connectionsFor('battle', small, evs, spans)).toEqual([
      { relation: 'is part of', type: 'part_of', forward: true,
        items: [{ otherId: 'war', kind: 'span', name: 'War', year: 1803, endYear: 1815, region: 'Global',
                 why: 'A battle of the war.' }] },
    ])
    const war = connectionsFor('war', small, evs, spans)
    expect(war.map((g) => g.relation)).toEqual(['was ended by', 'includes']) // "includes" last
    expect(war[1]!.items[0]!.name).toBe('Battle')
  })

  it('shows a shared id (event + span) as its span', () => {
    const shared = [ev('war', 1803, 'War Begins')]
    const [g] = connectionsFor('battle', small, [...evs, ...shared], spans)
    expect(g!.items[0]!.name).toBe('War')
    expect(g!.items[0]!.endYear).toBe(1815)
  })

  it('skips links to unknown ids and returns nothing for an unlinked entity', () => {
    expect(connectionsFor('battle', small, evs, [])).toEqual([])
    expect(connectionsFor('nobody', small, evs, spans)).toEqual([])
  })

  it('lists connected ids for the timeline highlight', () => {
    expect([...connectedIds('war', small)].sort()).toEqual(['battle', 'treaty'])
  })

  it('resolves every exported link from both ends (real data)', () => {
    for (const l of data.links) {
      const fromSource = connectionsFor(l.source, data, events, durations).flatMap((g) => g.items)
      const fromTarget = connectionsFor(l.target, data, events, durations).flatMap((g) => g.items)
      expect(fromSource.some((c) => c.otherId === l.target), `${l.source} → ${l.target}`).toBe(true)
      expect(fromTarget.some((c) => c.otherId === l.source), `${l.target} ← ${l.source}`).toBe(true)
    }
  })

  it('reads the Mughal Empire the way the plan says (real data)', () => {
    const groups = connectionsFor('mughal-empire', data, events, durations)
    const includes = groups.find((g) => g.relation === 'includes')
    expect(includes?.items.some((c) => c.name === 'First Battle of Panipat') ?? false).toBe(false) // it "began" it
    expect(groups.find((g) => g.relation === 'began with')?.items.map((c) => c.name)).toContain('Babur Founds the Mughal Empire')
    expect(includes!.items.length).toBeGreaterThan(5)
  })
})
