<template>
  <div class="dateflow flex flex-col h-[calc(100dvh-40px)]" :data-theme="store.theme">
    <DateFlowToolbar
      :view="store.view"
      :theme="store.theme"
      :mode="store.mode"
      :lane-state="store.laneState"
      :filters="store.filters"
      :categories="store.categories"
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
    <div v-else class="flex-1 min-h-[320px]">
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
        @zoom-at="store.zoomAt"
        @pan-by="store.panBy"
        @select="store.select"
        @select-duration="store.selectDuration"
        @select-range="store.openSummary"
      />
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
      <EventMeanwhile
        :event="store.selectedEvent"
        :events="store.filteredEvents"
        :durations="store.durations"
        @open-event="store.goToEvent"
        @open-duration="store.selectDuration"
        @show-surrounding="store.showSurrounding(store.selectedEvent.year)"
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
      @close="store.selectDuration(null)"
      @open-event="store.goToEvent"
      @show-on-timeline="showSelectedDuration"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, useTemplateRef } from 'vue'
import { useDateFlowStore } from '@/stores/dateflow'
import { CATEGORY_GROUPS } from '@/engine/dateflow/categoryGroups'
import { LANES } from '@/engine/dateflow/lanes'
import DateFlowToolbar from '@/components/dateflow/DateFlowToolbar.vue'
import DateFlowTimeline from '@/components/dateflow/DateFlowTimeline.vue'
import DateFlowMinimap from '@/components/dateflow/DateFlowMinimap.vue'
import '@/assets/dateflow-theme.css'
import EventInfoCard from '@/components/EventInfoCard.vue'
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

onMounted(() => {
  if (store.isLoading) store.load()
  window.addEventListener('keydown', onKey)
})
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>
