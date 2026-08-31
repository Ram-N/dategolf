import datelinks from '@/data/datelinks.json'
import type { DateLinkEntry, DateLinksMap } from '@/types/datelinks'

const map = datelinks as DateLinksMap

export function getDateLinks(eventId: string): DateLinkEntry | null {
  return map[eventId] ?? null
}
