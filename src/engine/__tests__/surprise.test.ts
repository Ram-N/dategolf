import { describe, it, expect } from 'vitest'
import type { Event } from '@/types'
import type { Duration, RelationshipData } from '@/types/dateflow'
import eventsJson from '@/data/events.json'
import durationsJson from '@/data/durations.json'
import relationshipsJson from '@/data/relationships.json'
import { mulberry32 } from '../dateflow/games/random'
import { storyCounts } from '../dateflow/stories'
import { pickSurprise, rememberPick, SURPRISE_MEMORY } from '../dateflow/surprise'

const events = eventsJson as Event[]
const durations = durationsJson as Duration[]
const data = relationshipsJson as RelationshipData
const realHasStory = (id: string) => {
  const c = storyCounts(id, data, events, durations)
  return c.back + c.forward > 0
}

const ev = (id: string) =>
  ({ id, name: id, year: 1000, categories: [], region: 'Global', aliases: [], description: '', difficulty: 'easy',
     importance: 5 }) as Event
const small = (id: string) => id === 'a' || id === 'b'

describe('pickSurprise', () => {
  it('returns null for no events', () => {
    expect(pickSurprise([], small, Math.random)).toBeNull()
  })

  it('prefers events with a story', () => {
    const rng = mulberry32(1)
    const pool = [ev('a'), ev('b'), ev('lonely')]
    for (let i = 0; i < 50; i++) expect(pickSurprise(pool, small, rng)!.id).not.toBe('lonely')
  })

  it('falls back to story-less events once the others were all just seen', () => {
    expect(pickSurprise([ev('a'), ev('b'), ev('lonely')], small, Math.random, ['a', 'b'])!.id).toBe('lonely')
  })

  it('repeats a recent pick rather than return nothing', () => {
    expect(pickSurprise([ev('a')], small, Math.random, ['a'])!.id).toBe('a')
  })

  it('only picks from the events it was given (the filtered set)', () => {
    const rng = mulberry32(7)
    const subset = events.slice(0, 30)
    const ids = new Set(subset.map((e) => e.id))
    for (let i = 0; i < 50; i++) expect(ids.has(pickSurprise(subset, realHasStory, rng)!.id)).toBe(true)
  })

  it('does not repeat within the memory window on the real data', () => {
    const rng = mulberry32(42)
    let recent: string[] = []
    const picks: string[] = []
    for (let i = 0; i < SURPRISE_MEMORY; i++) {
      const id = pickSurprise(events, realHasStory, rng, recent)!.id
      expect(realHasStory(id)).toBe(true)
      picks.push(id)
      recent = rememberPick(recent, id)
    }
    expect(new Set(picks).size).toBe(SURPRISE_MEMORY)
  })
})

describe('rememberPick', () => {
  it('keeps the newest last, without duplicates, capped', () => {
    expect(rememberPick(['a', 'b'], 'a')).toEqual(['b', 'a'])
    const full = Array.from({ length: SURPRISE_MEMORY }, (_, i) => `e${i}`)
    expect(rememberPick(full, 'new')).toEqual([...full.slice(1), 'new'])
  })
})
