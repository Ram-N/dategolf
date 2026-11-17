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
