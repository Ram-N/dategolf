import { describe, it, expect } from 'vitest'
import type { Event } from '@/types'
import type { Span, RelationshipData } from '@/types/dateflow'
import eventsJson from '@/data/events.json'
import durationsJson from '@/data/durations.json'
import relationshipsJson from '@/data/relationships.json'
import journeysJson from '@/data/journeys.json'
import { cardYears, chainLine, chainOfTheDay, dayNumber, DAILY_MIN_STEPS, galleryChains, journeyCard } from '../dateflow/gallery'
import { featuredStories } from '../dateflow/stories'
import { resolveJourney, type JourneyData } from '../dateflow/journeys'

const events = eventsJson as Event[]
const durations = durationsJson as Span[]
const data = relationshipsJson as RelationshipData
const chains = galleryChains(data, events, durations)

/** n consecutive dates from a start date, as "YYYY-MM-DD". */
const dates = (from: string, n: number) =>
  Array.from({ length: n }, (_, i) => new Date(Date.UTC(2026, 0, 1) + (dayNumber(from) - dayNumber('2026-01-01') + i) * 86_400_000)
    .toISOString().slice(0, 10))

describe('gallery — chains', () => {
  it('lists distinct chains, earliest first', () => {
    expect(chains.length).toBeGreaterThan(8) // more than the menu's 8
    expect(new Set(chains.map((c) => c.id)).size).toBe(chains.length)
    for (let i = 1; i < chains.length; i++) expect(chains[i]!.start).toBeGreaterThanOrEqual(chains[i - 1]!.start)
  })

  it("a card's line names only the chain's own items", () => {
    const names = new Set([...events.map((e) => e.name), ...durations.map((d) => d.name)])
    for (const f of featuredStories(data, events, durations, Infinity)) {
      const nodes = f.story.nodes
      const [first, last] = [nodes[0]!.name, nodes[nodes.length - 1]!.name]
      expect(chainLine(f)).toBe(`${nodes.length} steps from ${first} to ${last}`)
      expect(names.has(first) && names.has(last)).toBe(true)
    }
    for (const c of chains) expect(c.points.length).toBe(c.count)
  })

  it('shows c. on an end that comes from an approximate item', () => {
    const maya = chains.find((c) => c.title === 'Classic Maya') // from the Olmec, c. 1200 BCE
    expect(maya && cardYears(maya)).toMatch(/^c\. /)
    const exact = chains.filter((c) => !c.startApprox && !c.endApprox)
    expect(exact.length).toBeGreaterThan(0)
    expect(exact.every((c) => !cardYears(c).includes('c.'))).toBe(true)
  })

  it('an exact event at an end wins over an approximate span ending there', () => {
    const india = chains.find((c) => c.title === 'India Gains Independence')
    expect(india && cardYears(india)).toBe('1757 → 1947')
  })
})

describe('gallery — chain of the day', () => {
  const pool = chains.filter((c) => c.count >= DAILY_MIN_STEPS)

  it('same date → same chain, whatever order the cards arrive in', () => {
    const a = chainOfTheDay('2026-11-27', chains)
    expect(a).not.toBeNull()
    expect(chainOfTheDay('2026-11-27', [...chains].reverse())?.id).toBe(a!.id)
    expect(a!.count).toBeGreaterThanOrEqual(DAILY_MIN_STEPS)
  })

  it('no repeat within a cycle, and not on two days running across cycles', () => {
    const n = pool.length
    const days = dates('2026-03-01', n * 4).map((d) => chainOfTheDay(d, chains)!.id)
    // Each full cycle starts on a day number divisible by n
    const first = days.findIndex((_, i) => (dayNumber('2026-03-01') + i) % n === 0)
    for (let k = 0; k < 3; k++) expect(new Set(days.slice(first + k * n, first + (k + 1) * n)).size).toBe(n)
    for (let i = 1; i < days.length; i++) expect(days[i]).not.toBe(days[i - 1])
  })

  it('no chains, no chain of the day', () => {
    expect(chainOfTheDay('2026-11-27', [])).toBeNull()
  })
})

describe('gallery — journeys', () => {
  it('every journey has a card with its intro and one point per stop', () => {
    for (const jd of journeysJson as JourneyData[]) {
      const j = resolveJourney(jd, events, durations, data)!
      const card = journeyCard(j)
      expect(card.line).toBe(jd.intro)
      expect(card.points.length).toBe(jd.stops.length)
      expect(card.lanes.length).toBeGreaterThan(0)
    }
  })
})
