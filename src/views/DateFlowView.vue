<template>
  <div class="dateflow flex flex-col h-[calc(100dvh-40px)]" :data-theme="store.theme">
    <DateFlowToolbar
      :view="store.view"
      :theme="store.theme"
      :mode="store.mode"
      :lane-state="store.laneState"
      :filters="store.filters"
      :categories="store.categories"
      :stories="store.featured"
      @open-story="(id) => store.openStory(id)"
      @time-machine="store.openTimeMachine()"
      @zoom-in="store.zoomIn()"
      @zoom-out="store.zoomOut()"
      @reset="store.reset()"
      @jump="store.jumpTo"
      @toggle-theme="store.toggleTheme()"
      @set-mode="store.setMode"
      @toggle-lane="store.toggleLane"
      @move-lane="store.moveLane"
      @reset-lanes="store.resetLanes()"
      @toggle-category="store.toggleCategory"
      @toggle-region="store.toggleRegion"
      @set-detail="store.setDetail"
      @clear-filters="store.clearFilters()"
      @summarize="store.openSummary(store.view.start, store.view.end)"
    />

    <DateFlowMinimap v-if="!store.isLoading" :years="eventYears" :view="store.view" @center-at="store.centerAt" />

    <div v-if="store.isLoading" class="flex-1 flex items-center justify-center text-sm muted">
      Loading…
    </div>
    <div v-else class="flex-1 min-h-[320px] flex">
      <div class="flex-1 min-w-0">
      <DateFlowTimeline
        ref="timeline"
        :events="store.filteredEvents"
        :all-events="store.events"
        :durations="store.filteredDurations"
        :detail="store.filters.detail"
        :view="store.view"
        :mode="store.mode"
        :lanes="store.lanes"
        :selected-id="store.selectedEvent?.id ?? null"
        :selected-duration-id="store.selectedDuration?.id ?? null"
        :highlight-ids="store.storyIds ?? store.tmIds ?? store.focusIds"
        :marks="store.tmMarks"
        :story="store.currentStory"
        :step-id="store.storyStep === null ? null : (store.currentStops[store.storyStep]?.node.id ?? null)"
        @zoom-at="store.zoomAt"
        @pan-by="store.panBy"
        @select="store.select"
        @select-duration="store.selectDuration"
        @select-range="store.openSummary"
        @select-stop="(id) => store.goToStep(store.currentStops.findIndex((s) => s.node.id === id), false)"
      />
      </div>
      <TimeMachinePanel
        v-if="store.timeMachine && store.tmWorld"
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
      <StoryPanel
        v-if="store.currentStory"
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

    <div v-if="store.focusName" class="focus flex items-center justify-center gap-3 px-4 py-1.5 border-t text-sm">
      <span>Connections of <strong>{{ store.focusName }}</strong> are ringed</span>
      <button class="underline font-semibold" @click="store.clearFocus()">Clear</button>
    </div>
    <div class="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2 border-t text-[11px] footer">
      <span v-for="g in CATEGORY_GROUPS" :key="g.id" class="flex items-center gap-1.5 secondary">
        <span class="inline-block w-2.5 h-2.5 rounded-full" :style="{ background: `var(--df-${g.id})` }" />
        {{ g.label }}
      </span>
      <span class="flex items-center gap-1.5 secondary">
        <span class="inline-block w-4 h-2.5 rounded-sm kind-empire" /> Empire
      </span>
      <span class="flex items-center gap-1.5 secondary">
        <span class="inline-block w-4 h-2.5 rounded-sm kind-period" /> Period
      </span>
      <span v-if="filterSummary" class="secondary">
        · Showing: <strong>{{ filterSummary }}</strong>
        <button class="underline ml-1" @click="store.clearFilters()">Clear</button>
      </span>
      <span v-if="filterSummary && store.filteredEvents.length === 0" class="secondary">— nothing matches these filters</span>
      <span v-if="hiddenCount > 0" class="secondary">· {{ hiddenCount }} more in view — zoom in to reveal</span>
      <span class="ml-auto muted hidden sm:inline">Scroll to zoom · drag to move · shift-drag to summarise · ← → pan · + − zoom</span>
    </div>

    <EventInfoCard v-if="store.selectedEvent" :event="store.selectedEvent" @close="store.select(null)">
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
    <PeriodSummaryCard
      v-if="summary"
      :summary="summary"
      :filtered="isFiltering(store.filters)"
      @close="store.closeSummary()"
      @open-event="store.goToEvent"
      @open-duration="store.selectDuration"
      @zoom-to="zoomToSummary"
    />
    <DurationInfoCard
      v-if="store.selectedDuration"
      :duration="store.selectedDuration"
      :events="store.events"
      :connections="store.connections"
      @close="store.selectDuration(null)"
      @open-event="store.goToEvent"
      @open-duration="store.selectDuration"
      @show-on-timeline="showSelectedDuration"
      @show-connections="store.showConnections(store.selectedDuration.id)"
      @time-machine="store.openTimeMachine({ mode: 'year', year: store.selectedDuration!.startYear })"
      @compare-with="store.openTimeMachine({ mode: 'overlap', spanA: store.selectedDuration!.id, spanB: null })"
      :story-counts="store.openStoryCounts"
      @story="(d) => store.openStory(store.selectedDuration!.id, d)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, useTemplateRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDateFlowStore } from '@/stores/dateflow'
import { CATEGORY_GROUPS } from '@/engine/dateflow/categoryGroups'
import { LANES } from '@/engine/dateflow/lanes'
import DateFlowToolbar from '@/components/dateflow/DateFlowToolbar.vue'
import DateFlowTimeline from '@/components/dateflow/DateFlowTimeline.vue'
import DateFlowMinimap from '@/components/dateflow/DateFlowMinimap.vue'
import '@/assets/dateflow-theme.css'
import EventInfoCard from '@/components/EventInfoCard.vue'
import EventConnections from '@/components/dateflow/EventConnections.vue'
import StoryPanel from '@/components/dateflow/StoryPanel.vue'
import TimeMachinePanel from '@/components/dateflow/TimeMachinePanel.vue'
import DurationInfoCard from '@/components/dateflow/DurationInfoCard.vue'
import EventMeanwhile from '@/components/dateflow/EventMeanwhile.vue'
import PeriodSummaryCard from '@/components/dateflow/PeriodSummaryCard.vue'
import { summarizePeriod } from '@/engine/dateflow/explore'
import { isFiltering } from '@/engine/dateflow/filters'

const store = useDateFlowStore()
const timeline = useTemplateRef<InstanceType<typeof DateFlowTimeline>>('timeline')
const hiddenCount = computed(() => timeline.value?.hiddenCount ?? 0)
// The minimap shows the density of whatever the filters let through — e.g. a history of science.
const eventYears = computed(() => store.filteredEvents.map((e) => e.year))

// Footer summary of active filters.
const filterSummary = computed(() => {
  const f = store.filters
  const parts = [...f.categories]
  if (store.mode === 'world') parts.push(...f.regions.map((id) => LANES.find((l) => l.id === id)?.label ?? id))
  if (f.detail) parts.push(f.detail > 0 ? `more detail (+${f.detail})` : `less detail (${f.detail})`)
  return parts.join(' · ')
})

function onKey(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement || store.selectedEvent || store.selectedDuration || store.summaryRange) return
  if (e.key === 'Escape' && store.focusId) return store.clearFocus()
  if (store.timeMachine) {
    if (e.key === 'Escape') return store.closeTimeMachine()
    if (store.timeMachine.mode === 'year' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      const step = (e.shiftKey ? 10 : 1) * (e.key === 'ArrowRight' ? 1 : -1)
      return store.stepYear(step)
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

// Shareable stories: /dateflow?story=<id>&dir=back|forward opens one, and the URL follows the open story.
const route = useRoute()
const router = useRouter()
function openFromUrl() {
  const id = typeof route.query.story === 'string' ? route.query.story : null
  if (id && id !== store.story?.rootId) store.openStory(id, route.query.dir === 'forward' ? 'forward' : 'back')
}
// One sync for the whole URL, built from the current state: two separate watchers each rewrote it
// from a stale copy and left the other's keys behind.
const OWN_KEYS = [...TM_KEYS, 'story', 'dir']
const storyQuery = (): Record<string, string> =>
  store.story ? { story: store.story.rootId, dir: store.story.direction } : {}
watch(
  () => JSON.stringify({ ...storyQuery(), ...tmQuery() }),
  (q) => {
    const rest = Object.fromEntries(Object.entries(route.query).filter(([k]) => !OWN_KEYS.includes(k)))
    const next = { ...rest, ...JSON.parse(q) }
    if (JSON.stringify(next) !== JSON.stringify(route.query)) router.replace({ query: next })
  },
)

onMounted(async () => {
  window.addEventListener('keydown', onKey)
  if (store.isLoading) await store.load()
  openFromUrl()
  openTimeMachineFromUrl()
})
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>
