import { describe, it, expect } from 'vitest'
import events from '@/data/events.json'
import durations from '@/data/durations.json'
import regionLanes from '@/data/regions.json'
import { LANES, laneFor } from '../dateflow/lanes'

// laneFor() falls back to Global for an unknown label, which would hide a data mistake.
describe('regions.json', () => {
  const known = new Set(Object.keys(regionLanes))

  it('covers every region label used by events and durations', () => {
    const used = new Set([...events, ...durations].map((r) => r.region))
    expect([...used].filter((r) => !known.has(r))).toEqual([])
  })

  it('maps every label to a real lane', () => {
    const laneIds = new Set(LANES.map((l) => l.id))
    for (const lane of Object.values(regionLanes)) expect(laneIds.has(lane as never)).toBe(true)
  })

  it('drives laneFor()', () => {
    expect(laneFor('Southeast Asia')).toBe('east-asia')
    expect(laneFor('North America')).toBe('americas')
    expect(laneFor('Antarctica')).toBe('global')
  })
})
