<template>
  <div class="dateflow flex flex-col h-[calc(100dvh-40px)]" :class="{ 'help-mode': helpOn }" :data-theme="store.theme"
       :data-colors="store.colorMode">
    <DateFlowToolbar
      :view="store.view"
      :theme="store.theme"
      :color-mode="store.colorMode"
      :density="store.density"
      :mode="store.mode"
      :lane-state="store.laneState"
      :track-axis="store.trackAxis"
      :filters="store.filters"
      :hidden-regions="store.hiddenRegions"
      :help-on="helpOn"
      :categories="store.categories"
      :stories="store.featured"
      :journeys="store.journeys"
      :journey-progress="store.journeyProgress"
      :eras="store.eras"
      :active-era="store.activeEra"
      @open-story="(id) => store.openStory(id)"
      @open-journey="(id, from) => store.openJourney(id, from)"
      @time-machine="store.openTimeMachine()"
      @surprise="store.surprise()"
      @zoom-in="store.zoomIn()"
      @zoom-out="store.zoomOut()"
      @reset="store.reset()"
      @show-era="store.showEra"
      @jump="store.jumpTo"
      @search="store.searchFor"
      @watch="store.watchFilters()"
      @toggle-theme="store.toggleTheme()"
      @toggle-colors="store.toggleColorMode()"
      @set-density="store.setDensity"
      @set-mode="store.setMode"
      @set-track-axis="store.setTrackAxis"
      @toggle-lane="store.toggleLane"
      @move-lane="store.moveLane"
      @reset-lanes="store.resetLanes()"
      @toggle-category="store.toggleCategory"
      @toggle-region="store.toggleRegion"
      @clear-filters="store.clearFilters()"
      @summarize="store.openSummary(store.view.start, store.view.end)"
      @toggle-help="toggleHelp"
    />

    <DateFlowMinimap v-if="!store.isLoading" data-help="minimap" :years="eventYears" :view="store.view" @center-at="store.centerAt" />

    <div v-if="store.isLoading" class="flex-1 flex items-center justify-center text-sm muted">
      Loading…
    </div>
    <div v-else class="flex-1 min-h-[320px] flex">
      <div class="flex-1 min-w-0 relative">
      <DateFlowTimeline
        ref="timeline"
        :events="store.timelineEvents"
        :all-events="store.events"
        :durations="store.timelineDurations"
        :span-parents="store.subSpanParents"
        :currents="store.currentSpans"
        :detail="store.detailLevel"
        :density="store.density"
        :view="store.view"
        :mode="store.mode"
        :lanes="store.lanes"
        :track-axis="store.trackAxis"
        :hidden-tracks="store.trackSwitches"
        :event-states="store.eventStates"
        :state-spans="store.stateSpans"
        :selected-id="store.selectedEvent?.id ?? (store.tourCurrent?.kind === 'event' ? store.tourCurrent.id : null)"
        :selected-duration-id="store.selectedDuration?.id ?? (store.tourCurrent?.kind === 'span' ? store.tourCurrent.id : null)"
        :highlight-ids="store.highlightIds"
        :spotlight-ids="store.spotlightIds"
        :marks="store.tmMarks"
        :story="store.currentStory"
        :focus-family="store.focusFamily"
        :step-id="store.storyStep === null ? null : (store.currentStops[store.storyStep]?.node.id ?? null)"
        @zoom-at="store.zoomAt"
        @pan-by="store.panBy"
        @select="store.select"
        @select-duration="store.selectDuration"
        @select-range="store.openSummary"
        @toggle-track="store.toggleTrack"
        @background-click="store.clearRinged()"
        @select-stop="(id) => store.goToStep(store.currentStops.findIndex((s) => s.node.id === id), false)"
      />
      <JourneyInvite
        v-if="showInvite"
        data-help="journeys"
        :journeys="store.journeys"
        @open="(id) => store.openJourney(id)"
        @dismiss="store.inviteDismissed = true"
      />
      </div>
      <TimeMachinePanel
        v-if="store.timeMachine && store.tmWorld"
        data-help="time-machine"
        :tm="store.timeMachine"
        :world="store.tmWorld"
        :compare="store.tmCompare"
        :overlap-result="store.tmOverlap"
        :spans="store.tmSpans"
        :distance-result="store.tmDistance"
        :events="store.events"
        :durations="store.durations"
        :range="yearRange"
        @close="store.closeTimeMachine()"
        @set="(patch, frame) => store.setTimeMachine(patch, frame)"
        @step="store.stepYear"
        @open="(id, kind) => (kind === 'span' ? store.selectDuration(id) : store.select(id))"
      />
      <TourPanel
        v-if="store.tour"
        :data-help="store.tour.source === 'search' ? 'search-results' : 'play-through'"
        :source="store.tour.source"
        :query="store.tour.query"
        :stops="store.tourStops"
        :hidden="store.tourHidden"
        :step="store.tourStep"
        :playing="store.tourPlaying"
        :speed="store.tourSpeed"
        @close="store.closeTour()"
        @play="store.toggleTourPlay()"
        @stop="store.stopTour()"
        @step="store.stepTour"
        @go-to="store.goToTourStop"
        @speed="store.setTourSpeed"
        @open="store.openTourStop"
      />
      <JourneyPanel
        v-if="store.currentJourney"
        data-help="journeys"
        :journey="store.currentJourney"
        :step="store.journeyStep"
        :off-view="store.journeyOffView"
        :life-cycles="store.lifeCycles"
        @close="store.closeJourney()"
        @step="store.stepJourney"
        @go-to="store.goToJourneyStep"
        @show-years="store.showSpan"
        @open="(id, kind) => (kind === 'span' ? store.selectDuration(id) : store.select(id))"
      />
      <StoryPanel
        v-if="store.currentStory"
        data-help="stories"
        :story="store.currentStory"
        :stops="store.currentStops"
        :step="store.storyStep"
        :playing="store.playing"
        @close="store.closeStory()"
        @direction="store.setStoryDirection"
        @play="store.togglePlay()"
        @step="store.stepStory"
        @go-to="store.goToStep"
        @open="(id, kind) => (kind === 'span' ? store.selectDuration(id) : store.select(id))"
        @reroot="(id) => store.openStory(id, store.story?.direction ?? 'back')"
        @extend="store.extendStory()"
      />
    </div>

    <div v-if="store.ringedName && store.highlightIds === store.ringedIds" data-help="connections" class="focus flex items-center justify-center gap-3 px-4 py-1.5 border-t text-sm">
      <span>Connections of <strong>{{ store.ringedName }}</strong> are ringed</span>
      <button class="underline font-semibold" @click="store.clearRinged()">Clear</button>
    </div>
    <div class="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2 border-t text-[11px] footer">
      <button
        v-for="f in FAMILIES"
        :key="f.id"
        class="family flex items-center gap-1.5 secondary"
        data-help="family"
        :class="{ on: store.focusFamily === f.id, off: store.focusFamily && store.focusFamily !== f.id }"
        :aria-pressed="store.focusFamily === f.id"
        :title="store.focusFamily === f.id ? 'Show all families again (Esc)' : `Focus on ${f.label}: the rest fade`"
        @click="store.setFocusFamily(f.id)"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path :d="shapePath(f.shape, 6, 6, 4)" :fill="`var(--df-f-${f.id})`" />
        </svg>
        {{ f.label }}
      </button>
      <button v-if="store.focusFamily" data-help="family" class="secondary underline" @click="store.setFocusFamily(null)">Show all</button>
      <template v-if="store.mode !== 'constellation' && store.density !== 'simple'">
        <span class="flex items-center gap-1.5 secondary" data-help="state">
          <span class="inline-block w-4 h-2.5 rounded-sm kind-state" /> Empire or state
        </span>
        <span class="flex items-center gap-1.5 secondary" data-help="period">
          <span class="inline-block w-4 h-2.5 rounded-sm kind-period" /> Period
        </span>
      </template>
      <span v-else-if="store.mode === 'constellation'" class="secondary" data-help="dot">Bigger dot = more important</span>
      <span v-if="filterSummary" class="secondary" data-help="filters">
        · Showing: <strong>{{ filterSummary }}</strong>
        <button class="underline ml-1" @click="store.clearFilters()">Clear</button>
      </span>
      <span v-if="filterSummary && store.filteredEvents.length === 0" class="secondary">— nothing matches these filters</span>
      <span v-if="hiddenCount > 0" class="secondary" data-help="hidden-dot">· {{ hiddenCount }} more in view — zoom in to reveal</span>
      <span class="ml-auto muted hidden sm:inline" data-help="zoom">Scroll to zoom · drag to move · shift-drag: What happened? · ← → pan · + − zoom</span>
    </div>

    <EventInfoCard v-if="store.selectedEvent" data-help="event-card" :event="store.selectedEvent" @close="store.closeCard()">
      <EventConnections
        :groups="store.connections"
        @open-event="store.goToEvent"
        @open-duration="store.selectDuration"
        @show-on-timeline="store.showConnections(store.selectedEvent.id)"
        :counts="store.openStoryCounts"
        @story="(d) => store.openStory(store.selectedEvent!.id, d)"
      />
      <EventMeanwhile
        :event="store.selectedEvent"
        :events="store.filteredEvents"
        :durations="store.durations"
        @open-event="store.goToEvent"
        @open-duration="store.selectDuration"
        @show-surrounding="store.showSurrounding(store.selectedEvent.year)"
        @time-machine="store.openTimeMachine({ mode: 'year', year: store.selectedEvent!.year })"
      />
    </EventInfoCard>
    <WhatHappenedCard
      v-if="summary"
      data-help="what-happened"
      :summary="summary"
      :filtered="isFiltering(store.filters, store.hiddenRegions)"
      @close="store.closeSummary()"
      @open-event="store.goToEvent"
      @open-duration="store.selectDuration"
      @zoom-to="zoomToSummary"
    />
    <DurationInfoCard
      v-if="store.selectedDuration"
      data-help="span-card"
      :duration="store.selectedDuration"
      :durations="store.durations"
      :events="store.events"
      :connections="store.connections"
      @close="store.closeCard()"
      @open-event="store.goToEvent"
      @open-duration="store.selectDuration"
      @show-on-timeline="showSelectedDuration"
      @show-connections="store.showConnections(store.selectedDuration.id)"
      @time-machine="store.openTimeMachine({ mode: 'year', year: store.selectedDuration!.startYear })"
      @compare-with="store.openTimeMachine({ mode: 'overlap', spanA: store.selectedDuration!.id, spanB: null })"
      :story-counts="store.openStoryCounts"
      @story="(d) => store.openStory(store.selectedDuration!.id, d)"
    />
    <HelpCard v-if="helpOn" :help-key="helpKey" @show="(k) => (helpKey = k)" @close="closeHelp" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDateFlowStore } from '@/stores/dateflow'
import { FAMILIES, shapePath } from '@/engine/dateflow/categoryGroups'
import { LANES } from '@/engine/dateflow/lanes'
import DateFlowToolbar from '@/components/dateflow/DateFlowToolbar.vue'
import DateFlowTimeline from '@/components/dateflow/DateFlowTimeline.vue'
import DateFlowMinimap from '@/components/dateflow/DateFlowMinimap.vue'
import '@/assets/dateflow-theme.css'
import EventInfoCard from '@/components/EventInfoCard.vue'
import EventConnections from '@/components/dateflow/EventConnections.vue'
import StoryPanel from '@/components/dateflow/StoryPanel.vue'
import JourneyPanel from '@/components/dateflow/JourneyPanel.vue'
import JourneyInvite from '@/components/dateflow/JourneyInvite.vue'
import TimeMachinePanel from '@/components/dateflow/TimeMachinePanel.vue'
import TourPanel from '@/components/dateflow/TourPanel.vue'
import DurationInfoCard from '@/components/dateflow/DurationInfoCard.vue'
import EventMeanwhile from '@/components/dateflow/EventMeanwhile.vue'
import WhatHappenedCard from '@/components/dateflow/WhatHappenedCard.vue'
import HelpCard from '@/components/dateflow/HelpCard.vue'
import { helpKeyFor, type HelpKey } from '@/engine/dateflow/help'
import { summarizePeriod } from '@/engine/dateflow/explore'
import { isFiltering } from '@/engine/dateflow/filters'

const store = useDateFlowStore()
const timeline = useTemplateRef<InstanceType<typeof DateFlowTimeline>>('timeline')
const hiddenCount = computed(() => timeline.value?.hiddenCount ?? 0)
// The minimap shows the density of whatever the filters let through — e.g. a history of science.
const eventYears = computed(() => store.filteredEvents.map((e) => e.year))
/** The "Take a journey" card (doc 18, 3a): until dismissed or a journey is under way, and only on a quiet screen. */
const showInvite = computed(
  () =>
    !store.inviteDismissed && store.journeys.length > 0 && !Object.keys(store.journeyProgress).length &&
    !store.currentJourney && !store.currentStory && !store.timeMachine && !store.tourCurrent &&
    !store.selectedEvent && !store.selectedDuration,
)

// Footer summary of active filters.
const filterSummary = computed(() => {
  const f = store.filters
  const parts = [...f.categories]
  const off = store.hiddenRegions.map((id) => LANES.find((l) => l.id === id)?.label ?? id)
  if (off.length) parts.push(`without ${off.join(', ')}`)
  return parts.join(' · ')
})

// ── "What's this?" help mode (doc 18, 5b) ──
// While it's on, a click anywhere in DateFlow shows the help for the nearest element tagged
// data-help (else DateFlow's own) and does nothing else; the ? button and the help card work as usual.
const helpOn = ref(false)
const helpKey = ref<HelpKey | null>(null)

function toggleHelp() {
  helpOn.value = !helpOn.value
  helpKey.value = null
}

function closeHelp() {
  helpOn.value = false
  helpKey.value = null
}

/** The click (or press) belongs to help mode: inside DateFlow, not on the ? button or the help card. */
function helpTarget(e: Event): Element | null {
  if (!helpOn.value || !(e.target instanceof Element)) return null
  const t = e.target
  if (!t.closest('.dateflow') || t.closest('[data-help-toggle], [data-help-card]')) return null
  return t
}

function onHelpPress(e: PointerEvent) {
  // Stops a drag or a menu opening; the click that follows shows the help
  if (helpTarget(e)) e.stopPropagation()
}

function onHelpClick(e: MouseEvent) {
  const t = helpTarget(e)
  if (!t) return
  e.preventDefault()
  e.stopPropagation()
  helpKey.value = helpKeyFor(t.closest('[data-help]')?.getAttribute('data-help'))
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && helpOn.value) return closeHelp()
  if (e.key === '?' && !(e.target instanceof HTMLInputElement)) return toggleHelp()
  if (e.target instanceof HTMLInputElement || store.selectedEvent || store.selectedDuration || store.summaryRange) return
  if (e.key === 'Escape' && store.ringedId) return store.clearRinged()
  if (e.key === 'Escape' && store.focusFamily) return store.setFocusFamily(null)
  if (store.timeMachine) {
    if (e.key === 'Escape') return store.closeTimeMachine()
    if (store.timeMachine.mode === 'year' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      const step = (e.shiftKey ? 10 : 1) * (e.key === 'ArrowRight' ? 1 : -1)
      return store.stepYear(step)
    }
  }
  if (store.currentJourney) {
    if (e.key === 'Escape') return store.closeJourney()
    if (e.key === 'ArrowRight') return store.stepJourney(1)
    if (e.key === 'ArrowLeft') return store.stepJourney(-1)
  }
  if (store.tour) {
    if (e.key === 'Escape') return store.closeTour()
    if (e.key === 'ArrowRight') return store.stepTour(1)
    if (e.key === 'ArrowLeft') return store.stepTour(-1)
    if (e.key === ' ' && store.tourStops.length) {
      e.preventDefault()
      return store.toggleTourPlay()
    }
  }
  if (store.currentStory) {
    if (e.key === 'Escape') return store.closeStory()
    if (e.key === 'ArrowRight') return store.stepStory(1)
    if (e.key === 'ArrowLeft') return store.stepStory(-1)
    if (e.key === ' ') {
      e.preventDefault()
      return store.togglePlay()
    }
  }
  if (e.key === 'ArrowLeft') store.panBy(-store.viewSpan * 0.1)
  else if (e.key === 'ArrowRight') store.panBy(store.viewSpan * 0.1)
  else if (e.key === '+' || e.key === '=') store.zoomIn()
  else if (e.key === '-') store.zoomOut()
}

const summary = computed(() => {
  const r = store.summaryRange
  return r ? summarizePeriod(store.filteredEvents, store.filteredDurations, r.start, r.end) : null
})

function zoomToSummary() {
  const r = store.summaryRange
  if (!r) return
  store.closeSummary()
  store.showSpan(r.start, r.end)
}

function showSelectedDuration() {
  const d = store.selectedDuration
  if (!d) return
  store.selectDuration(null)
  store.showSpan(d.startYear, d.endYear)
}

/** The slider's range: the data's first to last year. */
const yearRange = computed<[number, number]>(() => {
  const ys = store.events.map((e) => e.year)
  return ys.length ? [Math.min(...ys), Math.max(...ys)] : [-3500, 2025]
})

// Shareable Time Machine links: ?year=1250[&compare=1500], ?tm=overlap&a=<span>&b=<span>, ?tm=distance&a=<event>&b=<event>
const TM_KEYS = ['year', 'compare', 'tm', 'a', 'b'] as const
function tmQuery(): Record<string, string> {
  const t = store.timeMachine
  if (!t) return {}
  if (t.mode === 'year') return { year: String(t.year) }
  if (t.mode === 'compare') return { year: String(t.year), compare: String(t.compare) }
  const [a, b] = t.mode === 'overlap' ? [t.spanA, t.spanB] : [t.eventA, t.eventB]
  return { tm: t.mode, ...(a ? { a } : {}), ...(b ? { b } : {}) }
}
function openTimeMachineFromUrl() {
  const q = route.query
  const num = (v: unknown) => (typeof v === 'string' && /^-?\d+$/.test(v) && Number(v) !== 0 ? Number(v) : null)
  const str = (v: unknown) => (typeof v === 'string' ? v : null)
  if (q.tm === 'overlap') store.openTimeMachine({ mode: 'overlap', spanA: str(q.a), spanB: str(q.b) })
  else if (q.tm === 'distance') store.openTimeMachine({ mode: 'distance', eventA: str(q.a), eventB: str(q.b) })
  else if (num(q.year) !== null) {
    const compare = num(q.compare)
    store.openTimeMachine(compare !== null ? { mode: 'compare', year: num(q.year)!, compare } : { mode: 'year', year: num(q.year)! })
  }
}

// Shareable chains of events: /dateflow?chain=<id>&dir=back|forward opens one, and the URL follows the open chain.
const route = useRoute()
const router = useRouter()
/** A chain of events in the URL: ?chain=, or ?story= from links shared before the rename. */
function chainParam(): string | null {
  const q = route.query.chain ?? route.query.story
  return typeof q === 'string' ? q : null
}
function openFromUrl() {
  const id = chainParam()
  if (id && id !== store.story?.rootId) store.openStory(id, route.query.dir === 'forward' ? 'forward' : 'back')
}
// One sync for the whole URL, built from the current state: two separate watchers each rewrote it
// from a stale copy and left the other's keys behind.
// Searches too: /dateflow?q=Mughal (issue #9), and journeys: /dateflow?journey=history-of-ideas (Phase 14).
const OWN_KEYS = [...TM_KEYS, 'chain', 'story', 'dir', 'q', 'journey']
const journeyQuery = (): Record<string, string> => (store.journey ? { journey: store.journey.id } : {})
const storyQuery = (): Record<string, string> =>
  store.story ? { chain: store.story.rootId, dir: store.story.direction } : {}
const searchQuery = (): Record<string, string> =>
  store.tour?.source === 'search' ? { q: store.tour.query } : {}
watch(
  () => JSON.stringify({ ...storyQuery(), ...tmQuery(), ...searchQuery(), ...journeyQuery() }),
  (q) => {
    const rest = Object.fromEntries(Object.entries(route.query).filter(([k]) => !OWN_KEYS.includes(k)))
    const next = { ...rest, ...JSON.parse(q) }
    if (JSON.stringify(next) !== JSON.stringify(route.query)) router.replace({ query: next })
  },
)

onMounted(async () => {
  window.addEventListener('keydown', onKey)
  window.addEventListener('pointerdown', onHelpPress, true)
  window.addEventListener('click', onHelpClick, true)
  if (store.isLoading) await store.load()
  // Every visit opens on Date Constellation, but a shared chain needs its threads (World and Lanes only)
  if (chainParam()) store.setMode('world')
  openFromUrl()
  openTimeMachineFromUrl()
  if (typeof route.query.q === 'string' && route.query.q.trim()) store.searchFor(route.query.q)
  if (typeof route.query.journey === 'string') store.openJourney(route.query.journey)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('pointerdown', onHelpPress, true)
  window.removeEventListener('click', onHelpClick, true)
})
</script>
