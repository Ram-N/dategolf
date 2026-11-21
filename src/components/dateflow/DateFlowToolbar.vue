<template>
  <div class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 border-b toolbar">
    <div class="mr-auto">
      <h1 class="text-xl font-black tracking-tight title">DateFlow</h1>
      <p class="text-xs tabular-nums range">
        {{ formatYear(Math.round(view.start)) }} – {{ formatYear(Math.round(view.end)) }}
        · {{ Math.round(view.end - view.start).toLocaleString() }} years
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <div class="seg flex rounded-lg p-0.5" role="group" aria-label="Timeline layout">
        <button
          v-for="m in MODES"
          :key="m.id"
          class="seg-btn"
          :class="{ active: mode === m.id }"
          :aria-pressed="mode === m.id"
          @click="emit('setMode', m.id)"
        >
          {{ m.label }}
        </button>
      </div>
      <div v-if="mode === 'constellation'" class="seg flex rounded-lg p-0.5" role="group" aria-label="Tracks">
        <button
          v-for="t in TRACK_AXES"
          :key="t.id"
          class="seg-btn"
          :class="{ active: trackAxis === t.id }"
          :aria-pressed="trackAxis === t.id"
          @click="emit('setTrackAxis', t.id)"
        >
          {{ t.label }}
        </button>
      </div>
      <div class="seg flex rounded-lg p-0.5" role="group" aria-label="Detail preset">
        <button
          v-for="d in DENSITIES"
          :key="d.id"
          class="seg-btn"
          :class="{ active: density === d.id }"
          :aria-pressed="density === d.id"
          :title="d.hint"
          @click="emit('setDensity', d.id)"
        >
          {{ d.label }}
        </button>
      </div>
      <DateFlowFilters
        :filters="filters"
        :categories="categories"
        :mode="mode"
        @toggle-category="(c) => emit('toggleCategory', c)"
        @toggle-region="(id) => emit('toggleRegion', id)"
        @set-detail="(d) => emit('setDetail', d)"
        @clear="emit('clearFilters')"
      />
      <DateFlowLanePicker
        v-if="mode === 'lanes'"
        :state="laneState"
        @toggle="(id) => emit('toggleLane', id)"
        @move="(id, dir) => emit('moveLane', id, dir)"
        @reset="emit('resetLanes')"
      />
    </div>

    <form class="flex items-center gap-2" role="search" @submit.prevent="submit">
      <input
        v-model="query"
        type="search"
        placeholder="Search (Mughal) or a year (500 BC)"
        aria-label="Search events, or jump to a year"
        class="w-64 px-3 py-1.5 rounded-lg border text-sm outline-none jump"
        :class="{ error: queryError }"
        @input="queryError = false"
      />
      <button type="submit" class="btn">Go</button>
    </form>

    <div class="flex flex-wrap items-center gap-1">
      <button class="btn w-9" aria-label="Zoom out" @click="emit('zoomOut')">−</button>
      <button class="btn w-9" aria-label="Zoom in" @click="emit('zoomIn')">+</button>
      <div class="seg flex flex-wrap rounded-lg p-0.5" role="group" aria-label="Show an era">
        <button
          v-for="e in eras"
          :key="e.id"
          class="seg-btn era"
          :class="{ active: activeEra === e.id }"
          :aria-pressed="activeEra === e.id"
          :title="`${formatYear(e.start)} – ${formatYear(e.end)}`"
          @click="emit('showEra', e.id)"
        >
          {{ e.name }}
        </button>
        <button
          class="seg-btn era"
          :class="{ active: activeEra === 'all' }"
          :aria-pressed="activeEra === 'all'"
          title="All of history"
          @click="emit('reset')"
        >
          All
        </button>
      </div>
      <button class="btn" title="See the whole world in one year, compare two years, or two empires" @click="emit('timeMachine')">
        Time Machine
      </button>
      <button class="btn" title="Open a random event and explore from there" @click="emit('surprise')">
        Surprise Me
      </button>
      <button class="btn" title="Play through the events your filters show, one at a time" @click="emit('watch')">
        Watch
      </button>
      <StoriesMenu :stories="stories" @open="(id) => emit('openStory', id)" />
      <button class="btn" title="Summarise the period in view (or shift-drag across the timeline)" @click="emit('summarize')">
        What happened?
      </button>
      <RouterLink to="/dateflow/play" class="btn play">▶ Play</RouterLink>
      <button
        class="btn"
        :aria-pressed="colorMode === 'colorful'"
        :title="colorMode === 'colorful' ? 'Switch to subtle colours (3 hues)' : 'Switch to colourful (a hue per family)'"
        @click="emit('toggleColors')"
      >
        {{ colorMode === 'colorful' ? 'Colorful' : 'Subtle' }}
      </button>
      <button
        class="btn w-9"
        :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
        :title="theme === 'dark' ? 'Light mode' : 'Dark mode'"
        @click="emit('toggleTheme')"
      >
        {{ theme === 'dark' ? '☀' : '☾' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import type { Era, View } from '@/engine/dateflow/timeScale'
import type { ColorMode, Theme, ViewMode } from '@/stores/dateflow'
import type { LaneId, LaneState } from '@/engine/dateflow/lanes'
import { TRACK_AXES, type TrackAxis } from '@/engine/dateflow/constellation'
import DateFlowLanePicker from './DateFlowLanePicker.vue'
import DateFlowFilters from './DateFlowFilters.vue'
import StoriesMenu from './StoriesMenu.vue'
import type { FeaturedStory } from '@/engine/dateflow/stories'
import { DENSITIES, type Density, type Filters } from '@/engine/dateflow/filters'
import { formatYear, parseYear } from '@/utils/formatYear'
import { MIN_QUERY } from '@/engine/dateflow/tour'

defineProps<{
  view: View
  theme: Theme
  colorMode: ColorMode
  density: Density
  mode: ViewMode
  laneState: LaneState
  trackAxis: TrackAxis
  filters: Filters
  categories: string[]
  stories: FeaturedStory[]
  eras: Era[]
  activeEra: string | null
}>()
const emit = defineEmits<{
  zoomIn: []
  zoomOut: []
  reset: []
  showEra: [id: string]
  jump: [year: number]
  search: [query: string]
  watch: []
  toggleTheme: []
  toggleColors: []
  setDensity: [density: Density]
  setMode: [mode: ViewMode]
  setTrackAxis: [axis: TrackAxis]
  toggleLane: [id: LaneId]
  moveLane: [id: LaneId, dir: -1 | 1]
  resetLanes: []
  toggleCategory: [c: string]
  toggleRegion: [id: LaneId]
  setDetail: [detail: number]
  clearFilters: []
  summarize: []
  openStory: [id: string]
  timeMachine: []
  surprise: []
}>()

const MODES: { id: ViewMode; label: string }[] = [
  { id: 'world', label: 'World' },
  { id: 'lanes', label: 'Lanes' },
  { id: 'constellation', label: 'Constellation' },
]

const query = ref('')
const queryError = ref(false)

/** A year jumps (years are never searched); anything else is a search. */
function submit() {
  const year = parseYear(query.value)
  if (year !== null && year !== 0) return emit('jump', year)
  if (query.value.trim().length < MIN_QUERY || year === 0) {
    queryError.value = true
    return
  }
  // Leave the box so ← → and Space step and play the matches straight away.
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  emit('search', query.value)
}
</script>

<style scoped>
.toolbar {
  border-color: var(--df-border-soft);
}
.title {
  color: var(--df-text);
}
.range {
  color: var(--df-text-2);
}
.jump {
  background: var(--df-surface);
  border-color: var(--df-border);
  color: var(--df-text);
}
.jump::placeholder {
  color: var(--df-muted);
}
.jump:focus {
  border-color: var(--df-text-2);
}
.jump.error {
  border-color: #e66767;
}
.btn {
  white-space: nowrap;
  height: 2.25rem;
  padding: 0 0.75rem;
  border-radius: 0.5rem;
  background: var(--df-btn);
  color: var(--df-text);
  font-size: 0.875rem;
  font-weight: 600;
  transition: background 0.15s;
}
.btn:hover {
  background: var(--df-btn-hover);
}
.btn.play {
  display: inline-flex;
  align-items: center;
  background: var(--df-text);
  color: var(--df-bg);
}
.btn.play:hover {
  opacity: 0.9;
}
.seg {
  background: var(--df-btn);
}
.seg-btn {
  height: 2rem;
  padding: 0 0.75rem;
  border-radius: 0.375rem;
  color: var(--df-text-2);
  font-size: 0.875rem;
  font-weight: 600;
}
.seg-btn.era {
  padding: 0 0.5rem; /* six chips: keeps the toolbar to two rows on a laptop screen */
}
.seg-btn.active {
  background: var(--df-surface);
  color: var(--df-text);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.2);
}
</style>
