import type { Event } from '@/types'

/** Events fair to use in year-guessing games (DateGolf, DatePick): drops DateFlow-only events. */
export function quizEvents(events: Event[]): Event[] {
  return events.filter((e) => !e.dateflowOnly)
}
