<template>
  <!-- Band 3, the view (doc 20): how it's drawn and what's shown. The layout's own controls sit in a slot that
       starts right after the layout switch, and "What's shown" is right-aligned, so switching layout moves
       nothing else. Where a row would overflow, those groups move into View ▾ instead (≥1280px all inline;
       ≥1024px the slot inline; below that both in View ▾). -->
  <div class="viewbar border-b">
    <div class="row flex items-center gap-3 px-4 py-2">
      <div class="df-seg shrink-0" role="group" aria-label="Timeline layout">
        <button
          v-for="m in MODES"
          :key="m.id"
          class="df-seg-btn"
          :class="{ active: mode === m.id }"
          :aria-pressed="mode === m.id"
          :title="`Layout: ${m.hint}`"
          :data-help="`layout-${m.help}`"
          @click="emit('setMode', m.id)"
        >
          {{ m.label }}
        </button>
      </div>

      <!-- The layout's own slot -->
      <div class="df-desk-only flex items-center">
        <template v-if="mode === 'constellation'">
          <div class="df-seg" role="group" aria-label="Tracks" data-help="axis">
            <button
              v-for="t in TRACK_AXES"
              :key="t.id"
              class="df-seg-btn"
              :class="{ active: trackAxis === t.id }"
              :aria-pressed="trackAxis === t.id"
              @click="emit('setTrackAxis', t.id)"
            >
              {{ t.label }}
            </button>
          </div>
        </template>
        <DateFlowLanePicker
          v-else-if="mode === 'lanes'"
          data-help="lanes-menu"
          :state="laneState"
          :hidden="hiddenRegions"
          @toggle="(id) => emit('toggleLane', id)"
          @move="(id, dir) => emit('moveLane', id, dir)"
          @reset="emit('resetLanes')"
        />
      </div>

      <!-- What's shown: inline on a wide screen, behind View ▾ on a narrow one -->
      <div class="ml-auto flex items-center gap-2 shrink-0">
        <div class="df-xl-only flex items-center gap-2">
          <div class="df-seg" role="group" aria-label="Detail preset" data-help="density">
            <button
              v-for="d in DENSITIES"
              :key="d.id"
              class="df-seg-btn"
              :class="{ active: density === d.id }"
              :aria-pressed="density === d.id"
              :title="d.hint"
              @click="emit('setDensity', d.id)"
            >
              {{ d.label }}
            </button>
          </div>
          <DateFlowFilters
            data-help="filters"
            :filters="filters"
            :categories="categories"
            :hidden-regions="hiddenRegions"
            @toggle-category="(c) => emit('toggleCategory', c)"
            @toggle-region="(id) => emit('toggleRegion', id)"
            @clear="emit('clearFilters')"
          />
        </div>
        <button class="df-btn df-below-xl" :class="{ on: viewOpen }" :aria-expanded="viewOpen" data-help="view-menu"
                @click="viewOpen = !viewOpen">
          View{{ activeCount ? ` (${activeCount})` : '' }} {{ viewOpen ? '▴' : '▾' }}
        </button>
      </div>
    </div>

    <!-- View ▾ opens in place (so the Filters and Lanes menus inside it can open fully) -->
    <div v-if="viewOpen" class="drawer df-below-xl flex flex-wrap items-center gap-2 px-4 pb-2">
      <template v-if="mode === 'constellation'">
        <div class="df-seg df-narrow-only flex-wrap" role="group" aria-label="Tracks" data-help="axis">
          <button
            v-for="t in TRACK_AXES"
            :key="t.id"
            class="df-seg-btn"
            :class="{ active: trackAxis === t.id }"
            :aria-pressed="trackAxis === t.id"
            @click="emit('setTrackAxis', t.id)"
          >
            {{ t.label }}
          </button>
        </div>
      </template>
      <DateFlowLanePicker
        v-else-if="mode === 'lanes'"
        class="df-narrow-only"
        data-help="lanes-menu"
        :state="laneState"
        :hidden="hiddenRegions"
        @toggle="(id) => emit('toggleLane', id)"
        @move="(id, dir) => emit('moveLane', id, dir)"
        @reset="emit('resetLanes')"
      />
      <div class="df-seg" role="group" aria-label="Detail preset" data-help="density">
        <button
          v-for="d in DENSITIES"
          :key="d.id"
          class="df-seg-btn"
          :class="{ active: density === d.id }"
          :aria-pressed="density === d.id"
          :title="d.hint"
          @click="emit('setDensity', d.id)"
        >
          {{ d.label }}
        </button>
      </div>
      <DateFlowFilters
        data-help="filters"
        :filters="filters"
        :categories="categories"
        :hidden-regions="hiddenRegions"
        @toggle-category="(c) => emit('toggleCategory', c)"
        @toggle-region="(id) => emit('toggleRegion', id)"
        @clear="emit('clearFilters')"
      />
    </div>

    <!-- Everything that hides or fades events, in one line (filters and the legend's Focus) -->
    <div v-if="summary" class="summary flex flex-wrap items-center justify-end gap-x-2 px-4 pb-1.5 text-xs" data-help="filters">
      <span>Showing: <strong>{{ summary }}</strong></span>
      <span v-if="nothingMatches">— nothing matches these filters</span>
      <button class="underline font-semibold" @click="emit('clearFilters'); emit('clearFocus')">Clear</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ViewMode } from '@/stores/dateflow'
import { LANES, type LaneId, type LaneState } from '@/engine/dateflow/lanes'
import { TRACK_AXES, type TrackAxis } from '@/engine/dateflow/constellation'
import { DENSITIES, type Density, type Filters } from '@/engine/dateflow/filters'
import DateFlowLanePicker from './DateFlowLanePicker.vue'
import DateFlowFilters from './DateFlowFilters.vue'

const props = defineProps<{
  mode: ViewMode
  trackAxis: TrackAxis
  laneState: LaneState
  density: Density
  filters: Filters
  categories: string[]
  hiddenRegions: LaneId[]
  focusLabel: string | null
  nothingMatches: boolean
}>()
const emit = defineEmits<{
  setMode: [mode: ViewMode]
  setTrackAxis: [axis: TrackAxis]
  toggleLane: [id: LaneId]
  moveLane: [id: LaneId, dir: -1 | 1]
  resetLanes: []
  setDensity: [density: Density]
  toggleCategory: [c: string]
  toggleRegion: [id: LaneId]
  clearFilters: []
  clearFocus: []
}>()

// "Layout" in hints and docs; "view" means only the years on screen (doc 21 §6.11)
const MODES: { id: ViewMode; label: string; hint: string; help: 'timeline' | 'lanes' | 'constellation' }[] = [
  { id: 'world', label: 'Timeline', hint: 'one road through history', help: 'timeline' },
  { id: 'lanes', label: 'Lanes', hint: 'a lane for each region, side by side', help: 'lanes' },
  { id: 'constellation', label: 'Constellation', hint: 'every event a star', help: 'constellation' },
]

const viewOpen = ref(false)
const activeCount = computed(() => props.filters.categories.length + props.hiddenRegions.length)

const summary = computed(() => {
  const parts = [...props.filters.categories]
  const off = props.hiddenRegions.map((id) => LANES.find((l) => l.id === id)?.label ?? id)
  if (off.length) parts.push(`without ${off.join(', ')}`)
  if (props.focusLabel) parts.push(`focus on ${props.focusLabel}`)
  return parts.join(' · ')
})
</script>

<style scoped>
.viewbar {
  border-color: var(--df-border-soft);
}
.summary {
  color: var(--df-text-2);
}
</style>
