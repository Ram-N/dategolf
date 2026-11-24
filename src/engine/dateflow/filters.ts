import { laneFor, type LaneId } from './lanes'
import { minImportanceForSpan } from './visibility'

// Category filters (an empty selection means "all") and the regions switched off, which are the
// lanes' shared on/off state (lanes.ts), not part of Filters.

export interface Filters {
  categories: string[]
}

export const NO_FILTERS: Filters = { categories: [] }

interface Filterable {
  categories: string[]
  region: string
}

/** Passes if it has any selected category and its region isn't switched off (AND across the two). */
export function matchesFilters(item: Filterable, f: Filters, hiddenRegions: LaneId[]): boolean {
  if (f.categories.length && !item.categories.some((c) => f.categories.includes(c))) return false
  if (hiddenRegions.length && hiddenRegions.includes(laneFor(item.region))) return false
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

export const isFiltering = (f: Filters, hiddenRegions: LaneId[]) => f.categories.length > 0 || hiddenRegions.length > 0

// ── Density presets (Phase 11, issue #1) ──────────────────────────────────────
// Simple / Standard / Detailed are the one detail control (doc 21 §6.8; the Filters slider is gone).
// Each shifts the zoom-driven importance threshold; Detailed also marks, unlabelled, every event
// that passes it but finds no room for a label.

export type Density = 'simple' | 'standard' | 'detailed'

export const DENSITIES: { id: Density; label: string; hint: string }[] = [
  { id: 'simple', label: 'Simple', hint: 'Only the bigger events; no span bars, milestone lines or currents' },
  { id: 'standard', label: 'Standard', hint: 'The usual timeline: zoom in to reveal more' },
  { id: 'detailed', label: 'Detailed', hint: 'More events at every zoom, a dot for each one without room for a label; an open card rings its connections' },
]

const DENSITY_SHIFT: Record<Density, number> = { simple: -1, standard: 0, detailed: 2 }

/** The detail level the timeline uses: how far the preset shifts the importance threshold. */
export function detailFor(density: Density): number {
  return DENSITY_SHIFT[density]
}
