import Fuse, { type IFuseOptions } from 'fuse.js'
import type { Event } from '@/types'

// Index only name + aliases — NEVER year
const FUSE_OPTIONS: IFuseOptions<Event> = {
  keys: [
    { name: 'name', weight: 2 },
    { name: 'aliases', weight: 1 },
  ],
  threshold: 0.35,
  distance: 100,
  minMatchCharLength: 2,
  includeScore: true,
}

let fuseInstance: Fuse<Event> | null = null

export function initSearch(events: Event[]): void {
  fuseInstance = new Fuse(events, FUSE_OPTIONS)
}

function getFuse(events: Event[]): Fuse<Event> {
  if (!fuseInstance) initSearch(events)
  return fuseInstance!
}

export function search(
  query: string,
  events: Event[],
  usedIds: string[],
  categoryFilter?: string,
): Event[] {
  const fuse = getFuse(events)
  const trimmed = query.trim()

  let results: Event[]

  if (trimmed.length === 0) {
    results = browseAlphabetical(events, usedIds)
  } else {
    const fuseResults = fuse.search(trimmed)
    results = fuseResults.map(r => r.item)
  }

  results = results.filter(e => !usedIds.includes(e.id))

  if (categoryFilter) {
    results = filterByCategory(results, categoryFilter)
  }

  return results
}

export function filterByCategory(events: Event[], category: string): Event[] {
  const cat = category.toLowerCase()
  return events.filter(e => e.categories.some(c => c.toLowerCase() === cat))
}

export function browseAlphabetical(events: Event[], usedIds: string[]): Event[] {
  return events
    .filter(e => !usedIds.includes(e.id))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function getCategories(events: Event[]): string[] {
  const set = new Set<string>()
  for (const e of events) {
    for (const c of e.categories) set.add(c)
  }
  return Array.from(set).sort()
}

export function getRegions(events: Event[]): string[] {
  const set = new Set<string>()
  for (const e of events) set.add(e.region)
  return Array.from(set).sort()
}
