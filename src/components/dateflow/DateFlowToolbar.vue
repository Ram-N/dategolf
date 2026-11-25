<template>
  <div class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 border-b toolbar">
    <div class="mr-auto">
      <h1 class="text-xl font-black tracking-tight title" data-help="dateflow">DateFlow</h1>
      <p class="text-xs tabular-nums range" data-help="view-range">
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
          :title="`Layout: ${m.hint}`"
          :data-help="`layout-${m.help}`"
          @click="emit('setMode', m.id)"
        >
          {{ m.label }}
        </button>
      </div>
      <!-- On phones these fold behind "More" (the timeline needs the room) -->
      <div class="fold fold-sm" :class="{ open: moreOpen }">
      <div v-if="mode === 'constellation'" class="seg flex flex-wrap rounded-lg p-0.5" role="group" aria-label="Tracks" data-help="axis">
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
      <div class="seg flex rounded-lg p-0.5" role="group" aria-label="Detail preset" data-help="density">
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
        data-help="filters"
        :filters="filters"
        :categories="categories"
        :hidden-regions="hiddenRegions"
        @toggle-category="(c) => emit('toggleCategory', c)"
        @toggle-region="(id) => emit('toggleRegion', id)"
        @clear="emit('clearFilters')"
      />
      <DateFlowLanePicker
        v-if="mode === 'lanes'"
        data-help="lanes-menu"
        :state="laneState"
        :hidden="hiddenRegions"
        @toggle="(id) => emit('toggleLane', id)"
        @move="(id, dir) => emit('moveLane', id, dir)"
        @reset="emit('resetLanes')"
      />
      </div>
    </div>

    <form class="flex items-center gap-2" role="search" data-help="search" @submit.prevent="submit">
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
      <JourneysMenu v-if="journeys.length" data-help="journeys" :journeys="journeys" :progress="journeyProgress"
                    @open="(id, from) => emit('openJourney', id, from)" />
      <button class="btn w-9" aria-label="Zoom out" data-help="zoom" @click="emit('zoomOut')">−</button>
      <button class="btn w-9" aria-label="Zoom in" data-help="zoom" @click="emit('zoomIn')">+</button>
      <div class="seg flex flex-wrap rounded-lg p-0.5" role="group" aria-label="Show an era" data-help="era">
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
      <button
        class="btn more"
        :aria-expanded="moreOpen"
        aria-controls="dateflow-more"
        data-help="more"
        @click="moreOpen = !moreOpen"
      >
        {{ moreOpen ? 'Less ▴' : 'More ▾' }}
      </button>
      <!-- Help mode (doc 18, 5b): the next click on anything explains it -->
      <button
        class="btn w-9 help-toggle"
        :class="{ active: helpOn }"
        :aria-pressed="helpOn"
        aria-label="What's this? Click, then click anything to learn what it is"
        title="What's this? (?)"
        data-help-toggle
        @click="emit('toggleHelp')"
      >
        ?
      </button>
    </div>

    <!-- Below 1440px these fold behind "More"; choosing one closes it again (Stories stays open to pick) -->
    <div
      id="dateflow-more"
      class="fold fold-lg flex flex-wrap items-center gap-1"
      :class="{ open: moreOpen }"
      @click="closeAfterAction"
    >
      <button class="btn" data-help="time-machine" title="See the whole world in one year, compare two years, two empires or periods, or two events" @click="emit('timeMachine')">
        Time Machine
      </button>
      <button class="btn" data-help="surprise" title="Open a random event and explore from there" @click="emit('surprise')">
        Surprise Me
      </button>
      <button class="btn" data-help="play-through" title="Play through the events your filters show, one at a time" @click="emit('watch')">
        Play through
      </button>
      <StoriesMenu data-keep-open data-help="stories" :stories="stories" @open="(id) => { moreOpen = false; emit('openStory', id) }" />
      <button class="btn" data-help="what-happened" title="What happened in the years in view (or shift-drag across the timeline)" @click="emit('summarize')">
        What happened?
      </button>
      <RouterLink to="/dateflow/play" class="btn play" data-help="games" title="The DateFlow games">▶ Games</RouterLink>
      <div class="seg flex rounded-lg p-0.5" role="group" aria-label="Colours" data-help="colours">
        <button
          v-for="c in COLOR_MODES"
          :key="c.id"
          class="seg-btn"
          :class="{ active: colorMode === c.id }"
          :aria-pressed="colorMode === c.id"
          :title="c.hint"
          @click="colorMode !== c.id && emit('toggleColors')"
        >
          {{ c.label }}
        </button>
      </div>
      <button
        class="btn w-9"
        data-help="theme"
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
import JourneysMenu from './JourneysMenu.vue'
import type { FeaturedStory } from '@/engine/dateflow/stories'
import type { Journey, JourneyProgress } from '@/engine/dateflow/journeys'
import { DENSITIES, type Density, type Filters } from '@/engine/dateflow/filters'
import { formatYear, parseYear } from '@/utils/formatYear'
import { MIN_QUERY } from '@/engine/dateflow/tour'

// Both choices on show, like the detail presets (a single button labelled with the state but
// hinting the action read both ways round)
const COLOR_MODES: { id: ColorMode; label: string; hint: string }[] = [
  { id: 'colorful', label: 'Colorful', hint: 'Colorful: a colour for each family of events' },
  { id: 'subtle', label: 'Subtle', hint: 'Subtle: three colours, easier to tell apart for colour-blind eyes' },
]

defineProps<{
  view: View
  theme: Theme
  colorMode: ColorMode
  density: Density
  mode: ViewMode
  laneState: LaneState
  hiddenRegions: LaneId[]
  helpOn: boolean
  trackAxis: TrackAxis
  filters: Filters
  categories: string[]
  stories: FeaturedStory[]
  journeys: Journey[]
  journeyProgress: Record<string, JourneyProgress>
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
  clearFilters: []
  summarize: []
  openStory: [id: string]
  openJourney: [id: string, from: 'start' | 'resume']
  timeMachine: []
  toggleHelp: []
  surprise: []
}>()

// "Layout" in hints and docs; "view" means only the years on screen (doc 21 §6.11)
const MODES: { id: ViewMode; label: string; hint: string; help: 'timeline' | 'lanes' | 'constellation' }[] = [
  { id: 'world', label: 'Timeline', hint: 'one road through history', help: 'timeline' },
  { id: 'lanes', label: 'Lanes', hint: 'a lane for each region, side by side', help: 'lanes' },
  { id: 'constellation', label: 'Constellation', hint: 'every event a star', help: 'constellation' },
]

const moreOpen = ref(false)
function closeAfterAction(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.closest('button, a') && !target.closest('[data-keep-open]')) moreOpen.value = false
}

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
.help-toggle {
  padding: 0;
  font-weight: 800;
}
.help-toggle.active {
  background: var(--df-text);
  color: var(--df-bg);
}
.seg {
  background: var(--df-btn);
}
.seg-btn {
  white-space: nowrap;
  height: 2rem;
  padding: 0 0.75rem;
  border-radius: 0.375rem;
  color: var(--df-text-2);
  font-size: 0.875rem;
  font-weight: 600;
}
/* Folding (small screens): "More" shows on narrow screens only, and opens the folded groups in place */
.fold-sm {
  display: contents;
}
.more {
  display: none;
}
@media (max-width: 1439px) {
  .more {
    display: inline-flex;
    align-items: center;
  }
  .fold-lg:not(.open) {
    display: none;
  }
}
@media (max-width: 639px) {
  .fold-sm:not(.open) {
    display: none;
  }
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
