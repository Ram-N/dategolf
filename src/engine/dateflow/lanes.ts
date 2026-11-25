import regionLanes from '@/data/regions.json'

// Regional lanes. Which region label (e.g. "Southeast Asia", "Oceania") sits in which lane
// comes from the db's regions table, exported as src/data/regions.json.

export type LaneId = 'south-asia' | 'east-asia' | 'europe' | 'middle-east' | 'africa' | 'americas' | 'global'

export const LANES: { id: LaneId; label: string }[] = [
  { id: 'south-asia', label: 'South Asia' },
  { id: 'east-asia', label: 'East Asia' },
  { id: 'europe', label: 'Europe' },
  { id: 'middle-east', label: 'Middle East' },
  { id: 'africa', label: 'Africa' },
  { id: 'americas', label: 'Americas' },
  { id: 'global', label: 'Global' },
]

const BY_REGION = new Map(Object.entries(regionLanes as Record<string, LaneId>))

/** Lane for a region string; anything unrecognised is treated as Global. */
export function laneFor(region: string): LaneId {
  return BY_REGION.get(region) ?? 'global'
}

/** The Lanes layout's rows: which regions get a lane (4 by default, so lanes have room for labels) and in what order. */
export interface LaneState {
  order: LaneId[]
  visible: LaneId[]
}

export const DEFAULT_LANES: LaneState = {
  order: LANES.map((l) => l.id),
  visible: ['south-asia', 'east-asia', 'europe', 'global'],
}

/** Visible lanes in display order. */
export function visibleLanes(state: LaneState): LaneId[] {
  return state.order.filter((id) => state.visible.includes(id))
}

/**
 * Regions switched off everywhere (doc 21 §6.10): one state behind the Filters region chips and the
 * Constellation's Geography tracks. At least one region stays on.
 */
export function toggleRegionOff(hidden: LaneId[], id: LaneId): LaneId[] {
  if (hidden.includes(id)) return hidden.filter((h) => h !== id)
  return hidden.length >= LANES.length - 1 ? hidden : [...hidden, id]
}

/** The lanes the Lanes layout draws: its chosen rows minus regions switched off, or else the first regions still on. */
export function lanesShown(state: LaneState, hidden: LaneId[]): LaneId[] {
  const on = (id: LaneId) => !hidden.includes(id)
  const chosen = visibleLanes(state).filter(on)
  return chosen.length ? chosen : state.order.filter(on).slice(0, DEFAULT_LANES.visible.length)
}

/** Show or hide a lane; the last visible lane can't be hidden. */
export function toggleLane(state: LaneState, id: LaneId): LaneState {
  if (state.visible.includes(id)) {
    if (state.visible.length === 1) return state
    return { ...state, visible: state.visible.filter((v) => v !== id) }
  }
  return { ...state, visible: [...state.visible, id] }
}

/** Move a lane one place up (-1) or down (+1) in the order. */
export function moveLane(state: LaneState, id: LaneId, dir: -1 | 1): LaneState {
  const order = [...state.order]
  const i = order.indexOf(id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= order.length) return state
  ;[order[i], order[j]] = [order[j]!, order[i]!]
  return { ...state, order }
}

/** Repair a saved state: drop unknown ids, append lanes added since, keep one visible. */
export function sanitizeLanes(raw: Partial<LaneState> | null | undefined): LaneState {
  const known = new Set(LANES.map((l) => l.id))
  const order = (raw?.order ?? []).filter((id): id is LaneId => known.has(id as LaneId))
  for (const lane of LANES) if (!order.includes(lane.id)) order.push(lane.id)
  const visible = (raw?.visible ?? []).filter((id): id is LaneId => known.has(id as LaneId))
  return { order, visible: visible.length ? visible : [...DEFAULT_LANES.visible] }
}

/**
 * The lanes to draw while a journey or chain of events is open: the usual ones plus any lane its items
 * need, in lane order, so no stop sits in a lane that isn't drawn.
 */
export function lanesWith(shown: LaneId[], order: LaneId[], needed: Iterable<LaneId>): LaneId[] {
  const want = new Set([...shown, ...needed])
  return want.size === shown.length ? shown : order.filter((id) => want.has(id))
}
