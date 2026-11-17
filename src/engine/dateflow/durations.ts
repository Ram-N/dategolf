import type { Event } from '@/types'
import type { Duration, Relationship } from '@/types/dateflow'

export interface BarItem {
  id: string
  x1: number
  x2: number
  priority: number
}

export type BarRows = [number, number][][]

/** Empty rows for `packBars`; pass the same rows to several calls to pack in rounds. */
export const emptyRows = (rows: number): BarRows => Array.from({ length: rows }, () => [])

/**
 * Gantt-style row packing: highest priority first, each bar takes the lowest row where
 * it overlaps no other bar (with `gapPx` between). Bars that fit in no row are dropped.
 * `occupied` (mutated) carries rows filled by an earlier round.
 */
export function packBars(items: BarItem[], rows: number, gapPx = 4, occupied: BarRows = emptyRows(rows)): { id: string; row: number }[] {
  const placed: { id: string; row: number }[] = []
  for (const item of [...items].sort((a, b) => b.priority - a.priority)) {
    const row = occupied.findIndex((spans) => spans.every(([a, b]) => item.x2 + gapPx <= a || item.x1 >= b + gapPx))
    if (row === -1) continue
    occupied[row]!.push([item.x1, item.x2])
    placed.push({ id: item.id, row })
  }
  return placed
}

/** The most important events in the same region during a duration, in date order. */
export function eventsDuring(events: Event[], d: Duration, limit = 8): Event[] {
  return events
    .filter((e) => e.region === d.region && e.year >= d.startYear && e.year <= d.endYear)
    .sort((a, b) => b.importance - a.importance)
    .slice(0, limit)
    .sort((a, b) => a.year - b.year)
}

/** "c. 320 – c. 550" style range for display. */
export function formatSpan(d: Duration, formatYear: (y: number) => string): string {
  const c = d.approximate ? 'c. ' : ''
  return `${c}${formatYear(d.startYear)} – ${c}${formatYear(d.endYear)}`
}

// ── Sub-spans (Phase 11): spans `part_of` another span nest inside its bar ─────────────

/** child span id → parent span id, from `part_of` links between two spans. */
export function spanParents(links: Relationship[], durations: Duration[]): Map<string, string> {
  const ids = new Set(durations.map((d) => d.id))
  const parents = new Map<string, string>()
  for (const l of links) if (l.type === 'part_of' && ids.has(l.source) && ids.has(l.target)) parents.set(l.source, l.target)
  return parents
}

/** Candidates that get a bar of their own: those with no ancestor among the candidates (it holds them). */
export function topLevelSpans(ids: string[], parents: Map<string, string>): string[] {
  const set = new Set(ids)
  const hasAncestorIn = (id: string) => {
    const seen = new Set<string>()
    for (let p = parents.get(id); p && !seen.has(p); p = parents.get(p)) {
      if (set.has(p)) return true
      seen.add(p)
    }
    return false
  }
  return ids.filter((id) => !hasAncestorIn(id))
}

/**
 * Sub-spans to draw inside a bar, nearest first: a child shows once `revealed` says so
 * (wide enough on screen), and a grandchild only inside a revealed child.
 */
export function revealedSubSpans(
  barId: string,
  parents: Map<string, string>,
  revealed: (id: string) => boolean,
  maxDepth = 2,
): { id: string; depth: number }[] {
  const children = new Map<string, string[]>()
  for (const [child, parent] of parents) children.set(parent, [...(children.get(parent) ?? []), child])
  const out: { id: string; depth: number }[] = []
  const walk = (id: string, depth: number) => {
    if (depth > maxDepth) return
    for (const c of children.get(id) ?? []) {
      if (!revealed(c)) continue
      out.push({ id: c, depth })
      walk(c, depth + 1)
    }
  }
  walk(barId, 1)
  return out
}
