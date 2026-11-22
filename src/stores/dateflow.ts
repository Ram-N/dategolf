import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Event } from '@/types'
import type { Duration, RelationshipData } from '@/types/dateflow'
import { connectedIds, connectionsFor } from '@/engine/dateflow/connections'
import { spanParents } from '@/engine/dateflow/durations'
import { buildStory, featuredStories, frameYears, storyCounts, storyStops, type Direction } from '@/engine/dateflow/stories'
import { compareYears, distance, overlap, worldAt } from '@/engine/dateflow/contemporaries'
import { pickSurprise, rememberPick } from '@/engine/dateflow/surprise'
import erasData from '@/data/eras.json'
import type { TrackAxis } from '@/engine/dateflow/constellation'
import type { Family } from '@/engine/dateflow/categoryGroups'
import { eventStop, searchStops, sortStops, spanStop, stepIndex, type TourSpeed } from '@/engine/dateflow/tour'
import { journeyIds, resolveJourney, stepJourneyIndex, type Journey, type JourneyData } from '@/engine/dateflow/journeys'
import milestoneIds from '@/data/milestones.json'
import {
  FULL_VIEW,
  eraInView,
  eraView,
  type Era,
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
  effectiveDetail,
  importanceThreshold,
  matchesFilters,
  toggleIn,
  type Density,
  type Filters,
} from '@/engine/dateflow/filters'

const VIEW_KEY = 'dateflow:view'
const THEME_KEY = 'dateflow:theme'
const MODE_KEY = 'dateflow:mode'
const LANES_KEY = 'dateflow:lanes'
const FILTERS_KEY = 'dateflow:filters'
const TRACKS_KEY = 'dateflow:tracks'
const COLORS_KEY = 'dateflow:colors'
const DENSITY_KEY = 'dateflow:density'
const JUMP_SPAN = 100 // "Jump to year" opens a 100-year window, the spec's default zoom
const SURPRISE_SPAN = 40 // narrow enough that every importance level shows (visibility.ts)
const TOUR_SPAN = 100 // a tour frames each event in a century, like "Jump to year"
const ANIM_MS = 350

// Step 5: a first visit (nothing remembered) opens Date Constellation on the Medieval era, so every
// region shows at once ("what was happening around 1200?", issue #6). Returning visitors keep theirs.
const ERAS = erasData as Era[]
const ENTRY_ERA = 'medieval'

function remembers(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null
  } catch {
    return false
  }
}

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
export type ColorMode = 'colorful' | 'subtle'
export type ViewMode = 'world' | 'lanes' | 'constellation'
const MODES: ViewMode[] = ['world', 'lanes', 'constellation']

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
  // Nothing remembered at all: a first visit
  const firstVisit = !remembers(MODE_KEY) && !remembers(VIEW_KEY)
  const view = ref<View>(firstVisit ? eraView(ERAS.find((e) => e.id === ENTRY_ERA)!) : loadView())
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
  // Step 4 (issues #3, #4, #9): a tour steps or plays through a search's matches, or through what
  // the filters let through. tourStep indexes tourStops; null = the overview.
  const tour = ref<{ source: 'search' | 'filters'; query: string } | null>(null)
  const tourStep = ref<number | null>(null)
  const tourPlaying = ref(false)
  const tourSpeed = ref<TourSpeed>('normal')
  // Phase 14: a curated journey. journeyStep: null = the intro, 0…n-1 the stops, n the end. A journey
  // needs span bars, so it switches Constellation or Simple to World / Standard and switches back on close.
  const journeyData = ref<JourneyData[]>([])
  const journey = ref<{ id: string; restore: { mode: ViewMode; density: Density } | null } | null>(null)
  const journeyStep = ref<number | null>(null)
  const theme = ref<Theme>(loadTheme())
  // Phase 11: Colorful (8 family hues, the default) or Subtle (the 3 group hues), remembered per viewer
  // Phase 11 Focus: one family vivid, the rest faded. Per visit, not remembered.
  const focusFamily = ref<Family | null>(null)
  // Simple / Standard / Detailed (#1), remembered per viewer
  const savedDensity = loadJson<Density>(DENSITY_KEY)
  const density = ref<Density>(savedDensity === 'simple' || savedDensity === 'detailed' ? savedDensity : 'standard')
  const colorMode = ref<ColorMode>(loadJson<ColorMode>(COLORS_KEY) === 'subtle' ? 'subtle' : 'colorful')
  const savedMode = loadJson<ViewMode>(MODE_KEY)
  const mode = ref<ViewMode>(savedMode && MODES.includes(savedMode) ? savedMode : firstVisit ? 'constellation' : 'world')
  // Date Constellation's Y-axis (issue #7)
  const trackAxis = ref<TrackAxis>(loadJson<TrackAxis>(TRACKS_KEY) === 'activity' ? 'activity' : 'geography')
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
  /** Every published journey, its items looked up (for the Stories menu). */
  const journeys = computed<Journey[]>(() =>
    journeyData.value
      .map((j) => resolveJourney(j, events.value, durations.value, relationships.value))
      .filter((j): j is Journey => !!j),
  )
  const currentJourney = computed(() => journeys.value.find((j) => j.id === journey.value?.id) ?? null)
  /** The journey's current stop (null at the intro and the end). */
  const journeyStop = computed(() =>
    currentJourney.value && journeyStep.value !== null ? (currentJourney.value.stops[journeyStep.value] ?? null) : null,
  )
  const journeyRing = computed(() => (currentJourney.value ? journeyIds(currentJourney.value, journeyStep.value) : null))
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
  /** Sub-span → parent span (part_of), for nesting bars on the timeline. */
  const subSpanParents = computed(() => spanParents(relationships.value.links, durations.value))
  /** The detail level the timeline draws with: the Filters slider shifted by the density preset. */
  const detailLevel = computed(() => effectiveDetail(filters.value.detail, density.value))
  /** Detailed: an open card rings its connections on the timeline, as "Show connections" does. */
  const cardIds = computed(() =>
    density.value === 'detailed' && openId.value ? new Set([openId.value, ...relatedIds.value]) : null,
  )
  const lanes = computed(() => visibleLanes(laneState.value))
  /**
   * Historical Currents (step 3d) are context, like eras: drawn from every span, whatever the filters.
   * Off in Simple and Constellation, and while a story or the Time Machine draws its own overlay.
   */
  const currentSpans = computed(() =>
    density.value === 'simple' || mode.value === 'constellation' || story.value || timeMachine.value || journey.value
      ? []
      : durations.value.filter((d) => d.current),
  )

  // Region filtering is a World / Constellation control; in Lanes mode the lane picker decides regions.
  const applyRegions = computed(() => mode.value !== 'lanes')
  const filteredEvents = computed(() =>
    events.value.filter((e) => matchesFilters(e, filters.value, applyRegions.value)),
  )
  const filteredDurations = computed(() =>
    durations.value.filter((d) => matchesFilters(d, filters.value, applyRegions.value)),
  )
  const categories = computed(() => categoriesByFrequency([...events.value, ...durations.value]))
  /** What the timeline draws: the filtered items, plus a journey's own items even if the filters hide them. */
  const timelineEvents = computed(() => withJourneyItems(filteredEvents.value, events.value))
  const timelineDurations = computed(() => withJourneyItems(filteredDurations.value, durations.value))
  function withJourneyItems<T extends { id: string }>(shown: T[], all: T[]): T[] {
    const ids = journeyRing.value
    if (!ids) return shown
    const have = new Set(shown.map((x) => x.id))
    const extra = all.filter((x) => ids.has(x.id) && !have.has(x.id))
    return extra.length ? [...shown, ...extra] : shown
  }
  /** The student has panned or zoomed away from the current stop: offer "Back to the stop". */
  const journeyOffView = computed(() => {
    const s = journeyStop.value
    if (!s) return false
    const v = view.value
    const width = Math.max(s.end - s.start, TOUR_SPAN)
    return s.start < v.start || s.end > v.end || span(v) > width * 4
  })

  // ── Tour (step 4) ──
  /** Every search match, before the filters. */
  const tourMatches = computed(() =>
    tour.value?.source === 'search'
      ? searchStops(tour.value.query, events.value, durations.value, relationships.value.links)
      : [],
  )
  /** The tour's stops, in time order. Both kinds respect the filters (issue #3). */
  const tourStops = computed(() => {
    const t = tour.value
    if (!t) return []
    if (t.source === 'search') {
      const shown = new Set([...filteredEvents.value, ...filteredDurations.value].map((x) => x.id))
      return tourMatches.value.filter((s) => shown.has(s.id))
    }
    // Watching the filters plays what a century-wide view would show at the current detail level.
    const minImp = importanceThreshold(TOUR_SPAN, detailLevel.value)
    return sortStops([
      ...filteredEvents.value.filter((e) => e.importance >= minImp).map((e) => eventStop(e)),
      ...filteredDurations.value.filter((d) => d.importance >= minImp).map((d) => spanStop(d)),
    ])
  })
  const tourHidden = computed(() => tourMatches.value.length - (tour.value?.source === 'search' ? tourStops.value.length : 0))
  const tourCurrent = computed(() => (tourStep.value === null ? null : (tourStops.value[tourStep.value] ?? null)))
  /** A search rings its matches; watching the filters rings nothing (every dot would be lit). */
  const tourIds = computed(() => (tour.value?.source === 'search' ? new Set(tourStops.value.map((s) => s.id)) : null))
  // The filters can change under an open tour: don't point past its end.
  watch(
    () => tourStops.value.length,
    (n) => {
      if (tourStep.value !== null && tourStep.value >= n) {
        tourStep.value = null
        tourPlaying.value = false
      }
    },
  )

  watch(filters, (f) => saveJson(FILTERS_KEY, f), { deep: true })
  watch(mode, (m) => saveJson(MODE_KEY, m))
  watch(laneState, (l) => saveJson(LANES_KEY, l))
  watch(trackAxis, (t) => saveJson(TRACKS_KEY, t))
  watch(colorMode, (c) => saveJson(COLORS_KEY, c))
  watch(density, (d) => saveJson(DENSITY_KEY, d))

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
    const [eventsModule, durationsModule, relationshipsModule, journeysModule] = await Promise.all([
      import('@/data/events.json'),
      import('@/data/durations.json'),
      import('@/data/relationships.json'),
      import('@/data/journeys.json'),
    ])
    journeyData.value = journeysModule.default as JourneyData[]
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

  /** Era chips: show one era's years exactly. */
  function showEra(id: string) {
    const era = ERAS.find((e) => e.id === id)
    if (era) animateTo(eraView(era))
  }
  /** The chip to light up: an era the view matches, 'all' for the whole of history, else null. */
  const activeEra = computed(() =>
    eraInView(view.value, ERAS)?.id ?? (eraInView(view.value, [{ id: 'all', name: 'All', ...FULL_VIEW }]) ? 'all' : null),
  )

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

  /**
   * Close the event or span card. In Detailed, its connections stay ringed afterwards (the card's
   * backdrop hides them while it's open) until Esc, Clear, or a click on empty timeline.
   */
  function closeCard() {
    const id = openId.value
    const keepRings = density.value === 'detailed' && !!id && relatedIds.value.size > 0
    select(null)
    selectDuration(null)
    if (keepRings) focusId.value = id
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

  // Surprise Me (issue #2): a random event from what the filters let through, framed and opened.
  let recentSurprises: string[] = []
  function surprise() {
    const hasStory = (id: string) => {
      const c = storyCounts(id, relationships.value, events.value, durations.value)
      return c.back + c.forward > 0
    }
    const e = pickSurprise(filteredEvents.value, hasStory, Math.random, recentSurprises)
    if (!e) return
    recentSurprises = rememberPick(recentSurprises, e.id)
    closeJourney()
    closeTour()
    closeStory()
    closeTimeMachine()
    clearFocus()
    select(e.id)
    animateTo(centerOn(e.year, SURPRISE_SPAN))
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
    closeJourney()
    closeTour()
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

  // ── Journeys (Phase 14) ─────────────────────────────────────────────────────
  function openJourney(id: string) {
    if (!journeys.value.some((j) => j.id === id)) return
    const restore = journey.value?.restore ??
      (mode.value === 'constellation' || density.value === 'simple' ? { mode: mode.value, density: density.value } : null)
    closeStory()
    closeTour()
    closeTimeMachine()
    select(null)
    selectDuration(null)
    summaryRange.value = null
    focusId.value = null
    if (mode.value === 'constellation') mode.value = 'world'
    if (density.value === 'simple') density.value = 'standard'
    journey.value = { id, restore }
    goToJourneyStep(null)
  }

  function closeJourney() {
    const r = journey.value?.restore
    journey.value = null
    journeyStep.value = null
    if (r) {
      mode.value = r.mode
      density.value = r.density
    }
  }

  /** Make a step current and frame it: a stop's items (an event in a century around it), else the whole journey. */
  function goToJourneyStep(i: number | null) {
    const j = currentJourney.value
    if (!j) return
    journeyStep.value = i
    const s = i === null ? undefined : j.stops[i]
    if (!s) showSpan(j.start, j.end)
    else if (s.end === s.start) animateTo(centerOn(s.start, TOUR_SPAN))
    else showSpan(s.start, s.end)
  }

  function stepJourney(delta: 1 | -1) {
    const j = currentJourney.value
    if (j) goToJourneyStep(stepJourneyIndex(journeyStep.value, delta, j.stops.length))
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
    closeJourney()
    closeTour()
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

  // ── Tour (step 4) ────────────────────────────────────────────────────────
  function startTour(t: { source: 'search' | 'filters'; query: string }) {
    closeJourney()
    closeStory()
    closeTimeMachine()
    select(null)
    selectDuration(null)
    summaryRange.value = null
    focusId.value = null
    tour.value = t
    tourStep.value = null
    tourPlaying.value = false
    frameTour()
  }

  /** Free-text search (issue #9): ring the matches and list them in the tour panel. */
  const searchFor = (query: string) => startTour({ source: 'search', query: query.trim() })
  /** Play through what the filters let through (issue #3). */
  const watchFilters = () => startTour({ source: 'filters', query: '' })

  function closeTour() {
    tour.value = null
    tourStep.value = null
    tourPlaying.value = false
  }

  /** The overview: frame every stop. */
  function frameTour() {
    const ys = tourStops.value.flatMap((s) => [s.year, s.endYear ?? s.year])
    if (ys.length) showSpan(Math.min(...ys), Math.max(...ys))
  }

  /** Make stop i current and frame it: an event in a century around it, a span end to end. */
  function goToTourStop(i: number) {
    const s = tourStops.value[i]
    if (!s) return
    tourStep.value = i
    if (s.endYear !== undefined) showSpan(s.year, s.endYear)
    else animateTo(centerOn(s.year, TOUR_SPAN))
  }

  /** Step through the tour; past either end, back to the overview (and playback stops). */
  function stepTour(delta: 1 | -1) {
    const next = stepIndex(tourStep.value, delta, tourStops.value.length)
    if (next === null) {
      tourStep.value = null
      tourPlaying.value = false
      frameTour()
      return
    }
    goToTourStop(next)
  }

  /** Stop: pause and go back to the overview. */
  function stopTour() {
    tourPlaying.value = false
    tourStep.value = null
    frameTour()
  }

  function toggleTourPlay() {
    if (!tourStops.value.length) return
    tourPlaying.value = !tourPlaying.value
    if (tourPlaying.value && tourStep.value === null) goToTourStop(0)
  }

  function setTourSpeed(s: TourSpeed) {
    tourSpeed.value = s
  }

  /** Open the current stop's full card; playback pauses (the card covers the timeline). */
  function openTourStop(i: number) {
    const s = tourStops.value[i]
    if (!s) return
    tourPlaying.value = false
    tourStep.value = i
    if (s.kind === 'span') selectDuration(s.id)
    else select(s.id)
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

  /** Focus a family; focusing the one already focused (or null) clears it. */
  function setFocusFamily(f: Family | null) {
    focusFamily.value = f === focusFamily.value ? null : f
  }

  function setDensity(d: Density) {
    density.value = d
    if (journey.value) journey.value.restore = null // the student chose; closing keeps it
  }

  function toggleColorMode() {
    colorMode.value = colorMode.value === 'colorful' ? 'subtle' : 'colorful'
  }

  function setMode(m: ViewMode) {
    mode.value = m
    if (journey.value) journey.value.restore = null // the student chose; closing keeps it
  }

  function setTrackAxis(t: TrackAxis) {
    trackAxis.value = t
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
    tour,
    tourStep,
    tourPlaying,
    tourSpeed,
    tourStops,
    tourHidden,
    tourCurrent,
    tourIds,
    searchFor,
    watchFilters,
    closeTour,
    goToTourStop,
    stepTour,
    stopTour,
    toggleTourPlay,
    setTourSpeed,
    openTourStop,
    journeys,
    journey,
    journeyStep,
    currentJourney,
    journeyStop,
    journeyRing,
    journeyOffView,
    openJourney,
    closeJourney,
    goToJourneyStep,
    stepJourney,
    timelineEvents,
    timelineDurations,
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
    colorMode,
    toggleColorMode,
    focusFamily,
    setFocusFamily,
    density,
    setDensity,
    subSpanParents,
    currentSpans,
    detailLevel,
    cardIds,
    mode,
    laneState,
    lanes,
    trackAxis,
    setTrackAxis,
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
    showEra,
    activeEra,
    eras: ERAS,
    firstVisit,
    showSpan,
    select,
    selectDuration,
    closeCard,
    openSummary,
    closeSummary,
    goToEvent,
    surprise,
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
