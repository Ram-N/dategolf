import type { Event } from '@/types'
import type { Duration, Phase, PhaseKind, Relationship } from '@/types/dateflow'

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

// ── Life-cycle phases (Phase 12): segments of an empire's bar ──────────────────────────
export const PHASE_KIND_LABEL: Record<PhaseKind, string> = {
  foundation: 'Foundation',
  expansion: 'Expansion',
  consolidation: 'Consolidation',
  height: 'Height',
  transformation: 'Transformation',
  contraction: 'Contraction',
  end: 'End',
}

/** A phase's years as students should read them: "c. 1299 – 1326" when it is approximate. */
export function formatPhase(p: Phase, formatYear: (y: number) => string): string {
  const c = p.approximate ? 'c. ' : ''
  return `${c}${formatYear(p.start)} – ${formatYear(p.end)}`
}

/**
 * Where each phase falls within a bar drawn from barX1 to barX2, given a year → x function.
 * Phases outside the bar (or under a pixel wide) are dropped.
 */
export function phaseSegments(
  phases: Phase[],
  toX: (year: number) => number,
  barX1: number,
  barX2: number,
): { phase: Phase; x: number; w: number }[] {
  return phases.flatMap((phase) => {
    const x = Math.max(toX(phase.start), barX1)
    const w = Math.min(toX(phase.end), barX2) - x
    return w >= 1 ? [{ phase, x, w }] : []
  })
}

// ── People (Phase 13) ─────────────────────────────────────────────────────────────────
/** Years between two signed years, allowing for the missing year 0. */
export const yearsBetween = (a: number, b: number) => b - a - (a < 0 && b > 0 ? 1 : 0)

/**
 * Other people alive at the same time as `person`, longest shared stretch first: the years their
 * lives overlapped. Only people, and only overlaps of at least a year.
 */
export function aliveTogether(person: Duration, durations: Duration[]): { d: Duration; from: number; to: number; years: number }[] {
  return durations
    .filter((d) => d.person && d.id !== person.id)
    .map((d) => {
      const from = Math.max(d.startYear, person.startYear)
      const to = Math.min(d.endYear, person.endYear)
      return { d, from, to, years: yearsBetween(from, to) }
    })
    .filter((x) => x.years >= 1)
    .sort((a, b) => b.years - a.years || a.from - b.from)
}

// ── Sub-spans (Phase 11): spans `part_of` another span nest inside its bar ─────────────

/** child span id → parent span id, from `part_of` links between two spans. */
export function spanParents(links: Relationship[], durations: Duration[]): Map<string, string> {
  // A person's life never nests, nor holds other spans: it has its own People row (Phase 13)
  const ids = new Set(durations.filter((d) => !d.person).map((d) => d.id))
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
