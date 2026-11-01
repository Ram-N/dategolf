import { laneFor, type LaneId } from './lanes'
import { minImportanceForSpan } from './visibility'

// Category / region filters and the detail control. An empty selection means "all".

export interface Filters {
  categories: string[]
  regions: LaneId[]
  /** −2 (fewer) … +2 (more): shifts the zoom-driven importance threshold. */
  detail: number
}

export const NO_FILTERS: Filters = { categories: [], regions: [], detail: 0 }
export const DETAIL_MIN = -2
export const DETAIL_MAX = 2

interface Filterable {
  categories: string[]
  region: string
}

/** Passes if it has any selected category and sits in any selected region (AND across the two). */
export function matchesFilters(item: Filterable, f: Filters, applyRegions: boolean): boolean {
  if (f.categories.length && !item.categories.some((c) => f.categories.includes(c))) return false
  if (applyRegions && f.regions.length && !f.regions.includes(laneFor(item.region))) return false
  return true
}

/** Importance threshold for the visible span, shifted by the detail setting (more detail → lower). */
export function importanceThreshold(spanYears: number, detail: number): number {
  return Math.max(0, minImportanceForSpan(spanYears) - detail)
}

/** Every category in use, most common first (ties alphabetical). */
export function categoriesByFrequency(items: { categories: string[] }[]): string[] {
  const counts = new Map<string, number>()
  for (const it of items) for (const c of it.categories) counts.set(c, (counts.get(c) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([c]) => c)
}

export function toggleIn<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

export const isFiltering = (f: Filters) => f.categories.length > 0 || f.regions.length > 0
