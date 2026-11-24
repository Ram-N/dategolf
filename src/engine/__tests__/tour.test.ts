import { describe, it, expect } from 'vitest'
import type { Event } from '@/types'
import type { Span, RelationshipData } from '@/types/dateflow'
import eventsJson from '@/data/events.json'
import durationsJson from '@/data/durations.json'
import relationshipsJson from '@/data/relationships.json'
import { searchStops, sortStops, stepIndex, words, eventStop, spanStop } from '../dateflow/tour'

const events = eventsJson as Event[]
const durations = durationsJson as Span[]
const links = (relationshipsJson as RelationshipData).links

const ev = (id: string, name: string, year: number, extra: Partial<Event> = {}) =>
  ({ id, name, year, categories: [], region: 'Global', aliases: [], description: '', difficulty: 'easy',
     importance: 5, ...extra }) as Event
const sp = (id: string, name: string, startYear: number, endYear: number) =>
  ({ id, name, startYear, endYear, description: '', categories: [], region: 'Global', importance: 5,
     kind: 'state' }) as Span

describe('words', () => {
  it('lower-cases, strips accents and splits on punctuation', () => {
    expect(words("Hitler Becomes Führer")).toEqual(['hitler', 'becomes', 'fuhrer'])
    expect(words("Thirty Years' War")).toEqual(['thirty', 'years', 'war'])
  })
})

describe('searchStops', () => {
  const fixture = {
    events: [
      ev('taj', 'Taj Mahal Completed', 1653),
      ev('jerome', 'Jerome Translates the Bible', 405),
      ev('rome', 'Founding of Rome', -753, { aliases: ['Romulus'] }),
    ],
    durations: [sp('mughal', 'Mughal Empire', 1526, 1857), sp('shah', 'Reign of Shah Jahan', 1628, 1658)],
    links: [
      { source: 'shah', type: 'part_of', target: 'mughal', why: '' },
      { source: 'taj', type: 'part_of', target: 'shah', why: '' },
    ] as RelationshipData['links'],
  }
  const run = (q: string) => searchStops(q, fixture.events, fixture.durations, fixture.links)

  it('matches word starts, not the middle of a word', () => {
    expect(run('rome').map((s) => s.id)).toEqual(['rome'])
    expect(run('rom').map((s) => s.id)).toEqual(['rome']) // and "Romulus" is the same event
  })

  it('needs every query word', () => {
    expect(run('founding rome').map((s) => s.id)).toEqual(['rome'])
    expect(run('founding mughal')).toEqual([])
  })

  it('matches all the words within one name or alias', () => {
    const e = [ev('lex', 'Battles of Lexington and Concord', 1775, { aliases: ['Shot heard round the world', 'Revolutionary War begins'] })]
    expect(searchStops('world war', e, [], [])).toEqual([])
  })

  it('brings in the parts of a matching span at any depth, naming the span that matched', () => {
    const hits = run('mughal')
    expect(hits.map((s) => s.id)).toEqual(['mughal', 'shah', 'taj'])
    expect(hits.find((s) => s.id === 'taj')!.via).toBe('Mughal Empire')
    expect(hits.find((s) => s.id === 'mughal')!.via).toBeUndefined()
  })

  it('never searches the year', () => {
    expect(run('1653')).toEqual([])
    expect(run('753')).toEqual([])
  })

  it('ignores queries shorter than two characters', () => {
    expect(run('r')).toEqual([])
    expect(run('  ')).toEqual([])
  })

  it('finds the issue #9 examples in the real data', () => {
    const mughal = searchStops('Mughal', events, durations, links)
    expect(mughal.some((s) => s.id === 'mughal-empire' || s.name === 'Mughal Empire')).toBe(true)
    expect(mughal.length).toBeGreaterThan(10)
    const hitler = searchStops('Hitler', events, durations, links)
    expect(hitler.length).toBeGreaterThanOrEqual(3)
    expect(hitler.every((s, i) => i === 0 || hitler[i - 1]!.year <= s.year)).toBe(true)
  })
})

describe('sortStops', () => {
  it('orders by year, a span before an event of the same year, then importance', () => {
    const stops = sortStops([
      eventStop(ev('b', 'B', 100, { importance: 3 })),
      eventStop(ev('a', 'A', 100, { importance: 8 })),
      spanStop(sp('s', 'S', 100, 200)),
      eventStop(ev('z', 'Z', -50)),
    ])
    expect(stops.map((s) => s.id)).toEqual(['z', 's', 'a', 'b'])
  })
})

describe('stepIndex', () => {
  it('starts at either end from the overview', () => {
    expect(stepIndex(null, 1, 3)).toBe(0)
    expect(stepIndex(null, -1, 3)).toBe(2)
  })
  it('returns to the overview past either end', () => {
    expect(stepIndex(2, 1, 3)).toBeNull()
    expect(stepIndex(0, -1, 3)).toBeNull()
    expect(stepIndex(1, 1, 3)).toBe(2)
  })
  it('has nowhere to go with no stops', () => {
    expect(stepIndex(null, 1, 0)).toBeNull()
  })
})
