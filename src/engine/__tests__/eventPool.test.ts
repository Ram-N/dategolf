import { describe, it, expect } from 'vitest'
import { quizEvents } from '../eventPool'
import type { Event } from '@/types'

const make = (id: string, extra: Partial<Event> = {}): Event => ({
  id,
  name: id,
  year: 1000,
  categories: ['Politics'],
  region: 'Europe',
  aliases: [],
  description: '',
  difficulty: 'medium',
  importance: 4,
  ...extra,
})

describe('quizEvents()', () => {
  it('drops DateFlow-only events', () => {
    const events = [make('a'), make('b', { dateflowOnly: true }), make('c')]
    expect(quizEvents(events).map((e) => e.id)).toEqual(['a', 'c'])
  })

  it('keeps every event when none are DateFlow-only', () => {
    const events = [make('a'), make('b')]
    expect(quizEvents(events)).toEqual(events)
  })
})
