import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Event } from '@/types'
import type { Duration, RelationshipData } from '@/types/dateflow'
import { connectedIds, connectionsFor } from '@/engine/dateflow/connections'
import { buildStory, featuredStories, frameYears, storyCounts, storyStops, type Direction } from '@/engine/dateflow/stories'
import { compareYears, distance, overlap, worldAt } from '@/engine/dateflow/contemporaries'
import milestoneIds from '@/data/milestones.json'
import {
  FULL_VIEW,
  centerOn,
  easeOutCubic,
  interpolateView,
  makeView,
  pan,
  span,
  zoomAround,
  type View,
} from '@/engine/dateflow/timeScale'
import {
  DEFAULT_LANES,
  LANES,
  moveLane as moveLaneIn,
  sanitizeLanes,
  toggleLane as toggleLaneIn,
  visibleLanes,
  type LaneId,
  type LaneState,
} from '@/engine/dateflow/lanes'
import {
  DETAIL_MAX,
  DETAIL_MIN,
  NO_FILTERS,
  categoriesByFrequency,
  matchesFilters,
  toggleIn,
  type Filters,
} from '@/engine/dateflow/filters'

const VIEW_KEY = 'dateflow:view'
const THEME_KEY = 'dateflow:theme'
const MODE_KEY = 'dateflow:mode'
const LANES_KEY = 'dateflow:lanes'
const FILTERS_KEY = 'dateflow:filters'
const JUMP_SPAN = 100 // "Jump to year" opens a 100-year window, the spec's default zoom
const ANIM_MS = 350

function loadView(): View {
  try {
    const raw = localStorage.getItem(VIEW_KEY)
    if (!raw) return FULL_VIEW
    const v = JSON.parse(raw) as View
    return makeView(v.start, v.end - v.start)
  } catch {
    return FULL_VIEW
  }
}

export type TimeMachineMode = 'year' | 'compare' | 'overlap' | 'distance'
export interface TimeMachine {
  mode: TimeMachineMode
  year: number
  compare: number
  window: number // years either side for "events nearby"
  spanA: string | null
  spanB: string | null
  eventA: string | null
  eventB: string | null
}

export type Theme = 'light' | 'dark'
export type ViewMode = 'world' | 'lanes'

function loadJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage unavailable — setting just won't persist
  }
}

function loadTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // fall through to the system preference
  }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

const LANE_IDS = new Set<string>(LANES.map((l) => l.id))

function loadFilters(): Filters {
  const raw = loadJson<Partial<Filters>>(FILTERS_KEY)
  const detail = Number(raw?.detail)
  return {
    categories: Array.isArray(raw?.categories) ? raw.categories.filter((c) => typeof c === 'string') : [],
    regions: Array.isArray(raw?.regions) ? raw.regions.filter((id) => LANE_IDS.has(id)) : [],
    detail: Number.isInteger(detail) ? Math.min(DETAIL_MAX, Math.max(DETAIL_MIN, detail)) : 0,
  }
}

export const useDateFlowStore = defineStore('dateflow', () => {
  // ── State ──────────────────────────────────────────────────────────────────
  const events = ref<Event[]>([])
  const durations = ref<Duration[]>([])
  const relationships = ref<RelationshipData>({ types: {}, links: [] })
  const isLoading = ref(true)
  const view = ref<View>(loadView())
  const selectedEventId = ref<string | null>(null)
  const selectedDurationId = ref<string | null>(null)
  const summaryRange = ref<{ start: number; end: number } | null>(null)
  const focusId = ref<string | null>(null) // whose connections are highlighted on the timeline
  // Phase 9: the open story ("How did we get here?" / "What happened next?") and its playback.
  const story = ref<{ rootId: string; direction: Direction; depth: number } | null>(null)
  const storyStep = ref<number | null>(null) // index into storyStops during playback; null = the overview
  const playing = ref(false)
  // Phase 10: the Time Machine ("what was happening elsewhere at the same time?").
  const timeMachine = ref<TimeMachine | null>(null)
  const theme = ref<Theme>(loadTheme())
  const mode = ref<ViewMode>(loadJson<ViewMode>(MODE_KEY) === 'lanes' ? 'lanes' : 'world')
  const laneState = ref<LaneState>(sanitizeLanes(loadJson<LaneState>(LANES_KEY)))
  const filters = ref<Filters>(loadFilters())

  // ── Computed ───────────────────────────────────────────────────────────────
  const selectedEvent = computed(
    () => events.value.find((e) => e.id === selectedEventId.value) ?? null,
  )
  const selectedDuration = computed(
    () => durations.value.find((d) => d.id === selectedDurationId.value) ?? null,
  )
  /** The open card's entity: an event or a span (Connections work the same for both). */
  const openId = computed(() => selectedEventId.value ?? selectedDurationId.value)
  const connections = computed(() =>
    openId.value ? connectionsFor(openId.value, relationships.value, events.value, durations.value) : [],
  )
  /** Ids to ring on the timeline while a card is open. */
  const relatedIds = computed(() =>
    openId.value ? connectedIds(openId.value, relationships.value) : new Set<string>(),
  )
  /** The focused entity and everything linked to it, ringed on the timeline (empty = no highlight). */
  const focusIds = computed(() =>
    focusId.value ? new Set([focusId.value, ...connectedIds(focusId.value, relationships.value)]) : null,
  )
  const focusName = computed(() => {
    const id = focusId.value
    if (!id) return null
    return durations.value.find((d) => d.id === id)?.name ?? events.value.find((e) => e.id === id)?.name ?? id
  })
  const currentStory = computed(() =>
    story.value
      ? buildStory(story.value.rootId, relationships.value, events.value, durations.value, {
          direction: story.value.direction,
          depth: story.value.depth,
        })
      : null,
  )
  const currentStops = computed(() => (currentStory.value ? storyStops(currentStory.value) : []))
  /** Story steps to ring on the timeline (the story replaces any "show connections" highlight). */
  const storyIds = computed(() => (currentStory.value ? new Set(currentStory.value.nodes.map((n) => n.id)) : null))
  const featured = computed(() =>
    relationships.value.links.length ? featuredStories(relationships.value, events.value, durations.value) : [],
  )
  /** Story sizes for the open card's buttons ("How did we get here? (7)"). */
  const openStoryCounts = computed(() =>
    openId.value ? storyCounts(openId.value, relationships.value, events.value, durations.value) : { back: 0, forward: 0 },
  )
  // ── Time Machine (Phase 10) ──
  const tmWorld = computed(() =>
    timeMachine.value ? worldAt(timeMachine.value.year, events.value, durations.value, timeMachine.value.window) : null,
  )
  const tmCompare = computed(() =>
    timeMachine.value?.mode === 'compare' ? compareYears(timeMachine.value.year, timeMachine.value.compare, durations.value) : null,
  )
  const tmSpans = computed(() => {
    const tm = timeMachine.value
    const find = (id: string | null) => (id ? (durations.value.find((d) => d.id === id) ?? null) : null)
    return { a: find(tm?.spanA ?? null), b: find(tm?.spanB ?? null) }
  })
  const tmOverlap = computed(() => {
    const { a, b } = tmSpans.value
    return timeMachine.value?.mode === 'overlap' && a && b ? overlap(a, b) : null
  })
  const tmEvents = computed(() => {
    const tm = timeMachine.value
    const find = (id: string | null) => (id ? (events.value.find((e) => e.id === id) ?? null) : null)
    return { a: find(tm?.eventA ?? null), b: find(tm?.eventB ?? null) }
  })
  const tmDistance = computed(() => {
    const { a, b } = tmEvents.value
    return timeMachine.value?.mode === 'distance' && a && b ? distance(a, b, events.value, milestoneIds as string[]) : null
  })
  /** What the Time Machine rings on the timeline. */
  const tmIds = computed(() => {
    const tm = timeMachine.value
    if (!tm) return null
    if (tm.mode === 'year') {
      return new Set(tmWorld.value!.regions.flatMap((r) => [...r.spans.map((s) => s.span.id), ...r.events.map((e) => e.id)]))
    }
    if (tm.mode === 'compare') {
      return new Set(tmCompare.value!.regions.flatMap((r) => [...r.gone, ...r.new, ...r.continuing].map((d) => d.id)))
    }
    if (tm.mode === 'overlap') return new Set([tm.spanA, tm.spanB].filter((x): x is string => !!x))
    const d = tmDistance.value
    return new Set([tm.eventA, tm.eventB, d?.surprise?.near.id].filter((x): x is string => !!x))
  })
  /** Year lines, a shaded band or a bracket for the timeline. */
  const tmMarks = computed(() => {
    const tm = timeMachine.value
    if (!tm) return null
    const about = (approx: boolean) => (approx ? 'about ' : '')
    if (tm.mode === 'year') return { lines: [tm.year], band: null, bracket: null, label: '' }
    if (tm.mode === 'compare') return { lines: [tm.year, tm.compare], band: null, bracket: null, label: '' }
    const o = tmOverlap.value
    if (tm.mode === 'overlap') {
      return o?.kind === 'overlap'
        ? { lines: [], band: [o.start, o.end] as [number, number], bracket: null,
            label: `together ${about(o.approximate)}${o.years.toLocaleString()} years` }
        : { lines: [], band: null, bracket: null, label: '' }
    }
    const d = tmDistance.value
    return d
      ? { lines: [], band: null, bracket: [d.earlier.year, d.later.year] as [number, number],
          label: `${about(d.approximate)}${d.years.toLocaleString()} years apart` }
      : { lines: [], band: null, bracket: null, label: '' }
  })
  const viewSpan = computed(() => span(view.value))
  const lanes = computed(() => visibleLanes(laneState.value))

  // Region filtering is a World-mode control; in Lanes mode the lane picker decides regions.
  const applyRegions = computed(() => mode.value === 'world')
  const filteredEvents = computed(() =>
    events.value.filter((e) => matchesFilters(e, filters.value, applyRegions.value)),
  )
  const filteredDurations = computed(() =>
    durations.value.filter((d) => matchesFilters(d, filters.value, applyRegions.value)),
  )
  const categories = computed(() => categoriesByFrequency([...events.value, ...durations.value]))

  watch(filters, (f) => saveJson(FILTERS_KEY, f), { deep: true })
  watch(mode, (m) => saveJson(MODE_KEY, m))
  watch(laneState, (l) => saveJson(LANES_KEY, l))

  watch(view, (v) => {
    try {
      localStorage.setItem(VIEW_KEY, JSON.stringify(v))
    } catch {
      // storage unavailable — view just won't persist
    }
  })

  watch(theme, (t) => {
    try {
      localStorage.setItem(THEME_KEY, t)
    } catch {
      // storage unavailable — theme just won't persist
    }
  })

  // ── Actions ────────────────────────────────────────────────────────────────
  async function load() {
    const [eventsModule, durationsModule, relationshipsModule] = await Promise.all([
      import('@/data/events.json'),
      import('@/data/durations.json'),
      import('@/data/relationships.json'),
    ])
    events.value = eventsModule.default as Event[]
    durations.value = durationsModule.default as Duration[]
    relationships.value = relationshipsModule.default as RelationshipData
    isLoading.value = false
  }

  // ── View animation ─────────────────────────────────────────────────────────
  // Buttons, jump and reset ease to their target; direct input (wheel, drag, pinch)
  // applies instantly and cancels any animation in flight.
  let animFrame: number | null = null
  let animTarget: View | null = null

  function stopAnimation() {
    if (animFrame !== null) cancelAnimationFrame(animFrame)
    animFrame = null
    animTarget = null
  }

  function animateTo(target: View) {
    stopAnimation()
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      view.value = target
      return
    }
    const from = view.value
    const t0 = performance.now()
    animTarget = target
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / ANIM_MS)
      view.value = interpolateView(from, target, easeOutCubic(t))
      if (t < 1) {
        animFrame = requestAnimationFrame(step)
      } else {
        animFrame = null
        animTarget = null
      }
    }
    animFrame = requestAnimationFrame(step)
  }

  /** Where the view is heading — so repeated clicks build on the target, not a mid-animation frame. */
  const goal = () => animTarget ?? view.value
  const centerOf = (v: View) => (v.start + v.end) / 2

  // ── Direct input (instant) ───────────────────────────────────────────────
  function zoomAt(anchorYear: number, factor: number) {
    stopAnimation()
    view.value = zoomAround(view.value, anchorYear, factor)
  }

  function panBy(deltaYears: number) {
    stopAnimation()
    view.value = pan(view.value, deltaYears)
  }

  /** Move the view so `year` is centred, keeping the current zoom. */
  function centerAt(year: number, animate = false) {
    const target = centerOn(year, span(goal()))
    if (animate) return animateTo(target)
    stopAnimation()
    view.value = target
  }

  // ── Buttons (animated) ───────────────────────────────────────────────────
  const zoomIn = () => animateTo(zoomAround(goal(), centerOf(goal()), 0.5))
  const zoomOut = () => animateTo(zoomAround(goal(), centerOf(goal()), 2))

  function jumpTo(year: number) {
    animateTo(centerOn(year, Math.min(span(goal()), JUMP_SPAN)))
  }

  function reset() {
    animateTo(FULL_VIEW)
  }

  /** Frame a span of years with a little margin either side. */
  function showSpan(startYear: number, endYear: number) {
    const s = Math.max(endYear - startYear, 2)
    animateTo(makeView(startYear - s * 0.15, s * 1.3))
  }

  // Only one card shows at a time: event, duration, or period summary.
  function select(id: string | null) {
    selectedEventId.value = id
    if (id) {
      selectedDurationId.value = null
      summaryRange.value = null
    }
  }

  function selectDuration(id: string | null) {
    selectedDurationId.value = id
    if (id) {
      selectedEventId.value = null
      summaryRange.value = null
    }
  }

  function openSummary(start: number, end: number) {
    selectedEventId.value = null
    selectedDurationId.value = null
    summaryRange.value = { start: Math.min(start, end), end: Math.max(start, end) }
  }

  function closeSummary() {
    summaryRange.value = null
  }

  /** Open an event's card and glide the timeline to it (from Meanwhile / summary links). */
  function goToEvent(id: string) {
    const e = events.value.find((ev) => ev.id === id)
    if (!e) return
    select(id)
    centerAt(e.year, true)
  }

  /** Close the card, frame the entity and everything linked to it, and ring them on the timeline. */
  function showConnections(id: string) {
    const ids = new Set([id, ...connectedIds(id, relationships.value)])
    const years: number[] = []
    for (const e of events.value) if (ids.has(e.id)) years.push(e.year)
    for (const d of durations.value) if (ids.has(d.id)) years.push(d.startYear, d.endYear)
    select(null)
    selectDuration(null)
    focusId.value = id
    if (years.length) showSpan(Math.min(...years), Math.max(...years))
  }

  function clearFocus() {
    focusId.value = null
  }

  // ── Stories ──────────────────────────────────────────────────────────────
  function frameStory() {
    const s = currentStory.value
    if (!s) return
    const [a, b] = frameYears(s)
    showSpan(a, b)
  }

  function openStory(id: string, direction: Direction = 'back') {
    timeMachine.value = null
    select(null)
    selectDuration(null)
    summaryRange.value = null
    focusId.value = null
    playing.value = false
    storyStep.value = null
    story.value = { rootId: id, direction, depth: 4 }
    frameStory()
  }

  function closeStory() {
    story.value = null
    storyStep.value = null
    playing.value = false
  }

  function setStoryDirection(direction: Direction) {
    if (story.value) openStory(story.value.rootId, direction)
  }

  function extendStory() {
    if (!story.value) return
    story.value = { ...story.value, depth: story.value.depth + 4 }
    frameStory()
  }

  /** Go to one stop: frame it with the threads that lead into it, so the link being told is on screen. */
  /** Make stop i current; frame = also move the view to it (a clicked thread is already on screen). */
  function goToStep(i: number, frame = true) {
    const stop = currentStops.value[i]
    const s = currentStory.value
    if (!stop || !s) return
    storyStep.value = i
    if (!frame) return
    const [a, b] = frameYears(s, stop.node.id)
    const pad = Math.max(10, (b - a) * 0.15)
    showSpan(a - pad, b + pad)
  }

  /** Step through the story; past the last stop, back to the overview. */
  function stepStory(delta: 1 | -1) {
    const last = currentStops.value.length - 1
    const at = storyStep.value
    const next = at === null ? (delta > 0 ? 0 : last) : at + delta
    if (next < 0 || next > last) {
      storyStep.value = null
      playing.value = false
      frameStory()
      return
    }
    goToStep(next)
  }

  // ── Time Machine ───────────────────────────────────────────────────────────
  function frameTimeMachine() {
    const tm = timeMachine.value
    if (!tm) return
    if (tm.mode === 'year') showSpan(tm.year - 150, tm.year + 150)
    else if (tm.mode === 'compare') {
      const [a, b] = tm.year <= tm.compare ? [tm.year, tm.compare] : [tm.compare, tm.year]
      showSpan(a - 40, b + 40)
    } else if (tm.mode === 'overlap') {
      const { a, b } = tmSpans.value
      const ends = [a, b].filter((x): x is Duration => !!x).flatMap((d) => [d.startYear, d.endYear])
      if (ends.length) showSpan(Math.min(...ends), Math.max(...ends))
    } else {
      const d = tmDistance.value
      if (d) showSpan(d.earlier.year, d.later.year)
    }
  }

  /** Open the Time Machine (closing any card or story); by default on the year at the view's centre. */
  function openTimeMachine(patch: Partial<TimeMachine> = {}) {
    closeStory()
    select(null)
    selectDuration(null)
    summaryRange.value = null
    focusId.value = null
    const centre = Math.round((view.value.start + view.value.end) / 2) || 1 // never year 0
    const year = (patch.year ?? centre) || 1
    timeMachine.value = {
      mode: 'year', year, compare: year + 250, window: 25, spanA: null, spanB: null, eventA: null, eventB: null,
      ...timeMachine.value, ...patch, ...(patch.year !== undefined ? { year } : {}),
    }
    frameTimeMachine()
  }

  function closeTimeMachine() {
    timeMachine.value = null
  }

  /** Change the Time Machine; years skip 0 (from 1 CE, one step back is 1 BCE). */
  function setTimeMachine(patch: Partial<TimeMachine>, frame = true) {
    if (!timeMachine.value) return
    const fix = (y: number | undefined) => (y === 0 ? 1 : y)
    timeMachine.value = { ...timeMachine.value, ...patch,
      ...(patch.year !== undefined ? { year: fix(patch.year)! } : {}),
      ...(patch.compare !== undefined ? { compare: fix(patch.compare)! } : {}) }
    if (frame) frameTimeMachine()
  }

  /** Step the year, skipping year 0 both ways. */
  function stepYear(delta: number) {
    const tm = timeMachine.value
    if (!tm) return
    let y = tm.year + delta
    if (tm.year > 0 && y <= 0) y -= 1
    else if (tm.year < 0 && y >= 0) y += 1
    setTimeMachine({ year: y })
  }

  function togglePlay() {
    playing.value = !playing.value
    if (playing.value && storyStep.value === null) goToStep(0)
  }

  /** Close the card and frame the century around a year. */
  function showSurrounding(year: number) {
    select(null)
    showSpan(year - 50, year + 50)
  }

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  function setMode(m: ViewMode) {
    mode.value = m
  }

  function toggleLane(id: LaneId) {
    laneState.value = toggleLaneIn(laneState.value, id)
  }

  function moveLane(id: LaneId, dir: -1 | 1) {
    laneState.value = moveLaneIn(laneState.value, id, dir)
  }

  function resetLanes() {
    laneState.value = DEFAULT_LANES
  }

  function toggleCategory(c: string) {
    filters.value = { ...filters.value, categories: toggleIn(filters.value.categories, c) }
  }

  function toggleRegion(id: LaneId) {
    filters.value = { ...filters.value, regions: toggleIn(filters.value.regions, id) }
  }

  function setDetail(detail: number) {
    filters.value = { ...filters.value, detail: Math.min(DETAIL_MAX, Math.max(DETAIL_MIN, Math.round(detail))) }
  }

  function clearFilters() {
    filters.value = NO_FILTERS
  }

  return {
    events,
    durations,
    relationships,
    connections,
    relatedIds,
    focusId,
    focusIds,
    timeMachine,
    tmWorld,
    tmCompare,
    tmSpans,
    tmOverlap,
    tmEvents,
    tmDistance,
    tmIds,
    tmMarks,
    openTimeMachine,
    closeTimeMachine,
    setTimeMachine,
    stepYear,
    story,
    storyStep,
    playing,
    currentStory,
    currentStops,
    storyIds,
    featured,
    openStoryCounts,
    openStory,
    closeStory,
    setStoryDirection,
    extendStory,
    goToStep,
    stepStory,
    togglePlay,
    focusName,
    showConnections,
    clearFocus,
    isLoading,
    view,
    viewSpan,
    selectedEvent,
    selectedDuration,
    summaryRange,
    theme,
    mode,
    laneState,
    lanes,
    filters,
    filteredEvents,
    filteredDurations,
    categories,
    load,
    zoomAt,
    zoomIn,
    zoomOut,
    panBy,
    centerAt,
    jumpTo,
    reset,
    showSpan,
    select,
    selectDuration,
    openSummary,
    closeSummary,
    goToEvent,
    showSurrounding,
    toggleTheme,
    setMode,
    toggleLane,
    moveLane,
    resetLanes,
    toggleCategory,
    toggleRegion,
    setDetail,
    clearFilters,
  }
})
