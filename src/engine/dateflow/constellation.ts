import { laneFor, LANES, type LaneId } from './lanes'

// Date Constellation (issues #5–#7): every event as a dot, no labels, on switchable Y-axis tracks.
// Geography reuses the regional lanes; Human activity groups events by their primary category.

export type TrackAxis = 'geography' | 'activity'

export const TRACK_AXES: { id: TrackAxis; label: string }[] = [
  { id: 'geography', label: 'Geography' },
  { id: 'activity', label: 'Human activity' },
]

export interface ConstellationTrack {
  id: string
  label: string
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

export function tracksFor(axis: TrackAxis): ConstellationTrack[] {
  if (axis === 'activity') return ACTIVITY_TRACKS
  return GEO_ORDER.map((id) => ({ id, label: LANE_LABEL.get(id) ?? id }))
}

/** The track an event sits on: its region's lane, or its primary category's activity (unknown → Society). */
export function trackOf(e: { region: string; categories: string[] }, axis: TrackAxis): string {
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

/** Stack an axis's tracks from `top` down through `height` px: off tracks get a thin strip, on tracks share the rest. */
export function layoutTracks(axis: TrackAxis, hidden: HiddenTracks, top: number, height: number): TrackRow[] {
  const off = new Set(hidden[axis] ?? [])
  const defs = tracksFor(axis)
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

/** Switch one track on or off; ids that no longer belong to the axis are dropped. */
export function toggleTrack(hidden: HiddenTracks, axis: TrackAxis, id: string): HiddenTracks {
  const valid = new Set(tracksFor(axis).map((t) => t.id))
  const cur = (hidden[axis] ?? []).filter((x) => valid.has(x))
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : valid.has(id) ? [...cur, id] : cur
  return { ...hidden, [axis]: next }
}
