import { laneFor, LANES, type LaneId } from './lanes'

// Date Constellation (issues #5–#7): every event as a dot, no labels, on switchable Y-axis tracks.
// Geography reuses the regional lanes; Human activity groups events by their primary category;
// Empires & states (doc 18, 2a) gives a row to each state in view, from states.json.

export type TrackAxis = 'geography' | 'activity' | 'states'

export const TRACK_AXES: { id: TrackAxis; label: string }[] = [
  { id: 'geography', label: 'Geography' },
  { id: 'activity', label: 'Human activity' },
  { id: 'states', label: 'Empires & states' },
]

export interface ConstellationTrack {
  id: string
  label: string
  start?: number // a state's years, drawn as a band behind its row
  end?: number
}

// Roughly west to east across the Old World, then the Americas; Global last.
const GEO_ORDER: LaneId[] = ['europe', 'africa', 'middle-east', 'south-asia', 'east-asia', 'americas', 'global']
const LANE_LABEL = new Map(LANES.map((l) => [l.id, l.label]))

export const ACTIVITY_TRACKS: ConstellationTrack[] = [
  { id: 'politics', label: 'Politics' },
  { id: 'war', label: 'Warfare' },
  { id: 'science', label: 'Science & Technology' },
  { id: 'belief', label: 'Religion & Thought' },
  { id: 'culture', label: 'Arts & Culture' },
  { id: 'society', label: 'Society & Economy' },
]

const ACTIVITY_BY_CATEGORY: Record<string, string> = {
  Politics: 'politics',
  War: 'war',
  Science: 'science',
  Technology: 'science',
  Medicine: 'science',
  Exploration: 'science',
  Religion: 'belief',
  Philosophy: 'belief',
  Culture: 'culture',
  Arts: 'culture',
  Sports: 'culture',
  Social: 'society',
  Economy: 'society',
  Disasters: 'society',
}

/** The fixed tracks of an axis (Empires & states has none: its rows come from the view, see stateTracks). */
export function tracksFor(axis: TrackAxis): ConstellationTrack[] {
  if (axis === 'states') return []
  if (axis === 'activity') return ACTIVITY_TRACKS
  return GEO_ORDER.map((id) => ({ id, label: LANE_LABEL.get(id) ?? id }))
}

/** The track an event sits on: its region's lane, or its primary category's activity (unknown → Society). */
export function trackOf(e: { region: string; categories: string[] }, axis: 'geography' | 'activity'): string {
  if (axis === 'geography') return laneFor(e.region)
  return ACTIVITY_BY_CATEGORY[e.categories[0] ?? ''] ?? 'society'
}

/**
 * Dot radius in px, logarithmic in importance (2–9): small events stay visible,
 * major ones stand out without swamping their neighbours.
 */
export function dotRadius(importance: number): number {
  const imp = Math.min(9, Math.max(2, importance))
  return 1.5 + (5.5 * Math.log(imp / 2)) / Math.log(4.5)
}

/** Lowest importance shown. Every event shows by default; "less detail" (−1, −2) thins to the bigger ones. */
export function constellationThreshold(detail: number): number {
  return detail < 0 ? 4 - detail : 0
}

/** Stable vertical scatter in [−1, 1] from an id (FNV-1a), so dots don't jump as the view pans or zooms. */
export function scatter(id: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return ((h >>> 0) / 0xffffffff) * 2 - 1
}

/** Tracks switched off, per axis (#5, #7): an off track shows no dots and shrinks to a thin strip. */
export type HiddenTracks = Partial<Record<TrackAxis, string[]>>

export const OFF_TRACK_H = 22

export interface TrackRow extends ConstellationTrack {
  index: number
  top: number
  h: number
  on: boolean
}

/** Stack tracks from `top` down through `height` px: off tracks get a thin strip, on tracks share the rest. */
export function layoutTracks(defs: ConstellationTrack[], hidden: string[], top: number, height: number): TrackRow[] {
  const off = new Set(hidden)
  const nOff = defs.filter((t) => off.has(t.id)).length
  const nOn = defs.length - nOff
  const onH = nOn ? Math.max(0, height - nOff * OFF_TRACK_H) / nOn : 0
  let y = top
  return defs.map((t, index) => {
    const on = !off.has(t.id)
    const h = on ? onH : OFF_TRACK_H
    const row = { ...t, index, top: y, h, on }
    y += h
    return row
  })
}

/** Switch one track on or off; on a fixed axis, ids that don't belong to it are dropped (state rows vary with the view). */
export function toggleTrack(hidden: HiddenTracks, axis: TrackAxis, id: string): HiddenTracks {
  const fixed = tracksFor(axis)
  const valid = (x: string) => !fixed.length || fixed.some((t) => t.id === x)
  const cur = (hidden[axis] ?? []).filter(valid)
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : valid(id) ? [...cur, id] : cur
  return { ...hidden, [axis]: next }
}

// ── Empires & states (doc 18, 2a) ───────────────────────────────────────────

export const OTHER_STATES = 'other'
export const MAX_STATE_ROWS = 8

export interface StateSpan {
  id: string
  name: string
  startYear: number
  endYear: number
  importance: number
}

/** A state's top state: a sub-state (Khalji Dynasty, British Raj) rides on its parent's row. */
export function rollUp(id: string, parents: Map<string, string>, states: Map<string, StateSpan>): string {
  const seen = new Set<string>()
  let cur = id
  for (let p = parents.get(cur); p && states.has(p) && !seen.has(p); p = parents.get(cur)) {
    seen.add(cur)
    cur = p
  }
  return cur
}

/**
 * The rows for the events in view: the states with the most of them (at most `max`, ties to the more
 * important state), oldest first so rise and fall read down the axis, then "Other" for the rest
 * (no state, or one without a row). An event of two states sits on both rows.
 */
export function stateTracks(
  events: { id: string }[],
  eventStates: Record<string, string[]>,
  states: Map<string, StateSpan>,
  parents: Map<string, string>,
  max = MAX_STATE_ROWS,
): { tracks: ConstellationTrack[]; of: (eventId: string) => string[] } {
  const own = new Map<string, string[]>()
  const count = new Map<string, number>()
  for (const e of events) {
    const ss = [...new Set((eventStates[e.id] ?? []).filter((s) => states.has(s)).map((s) => rollUp(s, parents, states)))]
    own.set(e.id, ss)
    for (const s of ss) count.set(s, (count.get(s) ?? 0) + 1)
  }
  const rows = [...count.keys()]
    .sort((a, b) => count.get(b)! - count.get(a)! || states.get(b)!.importance - states.get(a)!.importance || (a < b ? -1 : 1))
    .slice(0, max)
    .map((id) => states.get(id)!)
    .sort((a, b) => a.startYear - b.startYear || a.endYear - b.endYear)
  const shown = new Set(rows.map((r) => r.id))
  const tracks: ConstellationTrack[] = rows.map((r) => ({ id: r.id, label: r.name, start: r.startYear, end: r.endYear }))
  tracks.push({ id: OTHER_STATES, label: 'Other' })
  const of = (id: string) => {
    const on = (own.get(id) ?? []).filter((s) => shown.has(s))
    return on.length ? on : [OTHER_STATES]
  }
  return { tracks, of }
}
