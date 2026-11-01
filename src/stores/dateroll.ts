import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Event } from '@/types'
import type { Duration } from '@/types/dateroll'
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
} from '@/engine/dateroll/timeScale'
import {
  DEFAULT_LANES,
  LANES,
  moveLane as moveLaneIn,
  sanitizeLanes,
  toggleLane as toggleLaneIn,
  visibleLanes,
  type LaneId,
  type LaneState,
} from '@/engine/dateroll/lanes'
import {
  DETAIL_MAX,
  DETAIL_MIN,
  NO_FILTERS,
  categoriesByFrequency,
  matchesFilters,
  toggleIn,
  type Filters,
} from '@/engine/dateroll/filters'

const VIEW_KEY = 'dateroll:view'
const THEME_KEY = 'dateroll:theme'
const MODE_KEY = 'dateroll:mode'
const LANES_KEY = 'dateroll:lanes'
const FILTERS_KEY = 'dateroll:filters'
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

export const useDateRollStore = defineStore('dateroll', () => {
  // ── State ──────────────────────────────────────────────────────────────────
  const events = ref<Event[]>([])
  const durations = ref<Duration[]>([])
  const isLoading = ref(true)
  const view = ref<View>(loadView())
  const selectedEventId = ref<string | null>(null)
  const selectedDurationId = ref<string | null>(null)
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
    const [eventsModule, durationsModule] = await Promise.all([
      import('@/data/events.json'),
      import('@/data/durations.json'),
    ])
    events.value = eventsModule.default as Event[]
    durations.value = durationsModule.default as Duration[]
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

  // An event card and a duration card never show at once.
  function select(id: string | null) {
    selectedEventId.value = id
    if (id) selectedDurationId.value = null
  }

  function selectDuration(id: string | null) {
    selectedDurationId.value = id
    if (id) selectedEventId.value = null
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
    isLoading,
    view,
    viewSpan,
    selectedEvent,
    selectedDuration,
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
