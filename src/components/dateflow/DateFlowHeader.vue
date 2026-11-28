<template>
  <!-- Band 1, the header (doc 20): what you can do. Its contents never depend on the layout or a panel. -->
  <div class="header flex flex-wrap items-center gap-2 px-4 py-2.5 border-b">
    <h1 class="text-xl font-black tracking-tight mr-2 title" data-help="dateflow">DateFlow</h1>

    <button class="df-btn icon df-phone-only" :class="{ on: searchOpen }" aria-label="Search, or jump to a year"
            data-help="search" @click="searchOpen = !searchOpen">🔍</button>
    <form class="search items-center gap-2" :class="searchOpen ? 'flex' : 'hidden sm:flex'" role="search"
          data-help="search" @submit.prevent="submit">
      <input
        v-model="query"
        type="search"
        placeholder="Search, or a year (500 BC)"
        aria-label="Search events, or jump to a year"
        class="flex-1 min-w-0 px-3 py-1.5 rounded-lg border text-sm outline-none jump"
        :class="{ error: queryError }"
        @input="queryError = false"
      />
      <button type="submit" class="df-btn">Go</button>
    </form>

    <!-- Guided paths: Journeys and Chains side by side, then the other ways to explore -->
    <div class="flex items-center gap-1">
      <JourneysMenu v-if="journeys.length" data-help="journeys" :journeys="journeys" :progress="journeyProgress"
                    @open="(id, from) => emit('openJourney', id, from)" @gallery="emit('gallery')" />
      <StoriesMenu data-help="stories" :stories="stories" :today="todaysChain" @open="(id) => emit('openStory', id)"
                   @gallery="emit('gallery')" />
      <button class="df-btn df-wide-only" data-help="play-through" :title="HINT.play" @click="emit('watch')">Play through</button>
      <button class="df-btn df-not-phone" data-help="time-machine" :title="HINT.tm" @click="emit('timeMachine')">Time Machine</button>
      <button class="df-btn df-not-phone" data-help="what-happened" :title="HINT.what" @click="emit('summarize')">What happened?</button>
      <button class="df-btn df-wide-only" data-help="surprise" :title="HINT.surprise" @click="emit('surprise')">Surprise Me</button>
      <!-- Laptop: the two left out above, in a menu with a fixed place -->
      <BandMenu class="df-laptop-down df-not-phone" label="More ▾" data-help="more" :width="200">
        <div class="flex flex-col gap-1">
          <button class="df-btn" data-help="play-through" :title="HINT.play" @click="emit('watch')">Play through</button>
          <button class="df-btn" data-help="surprise" :title="HINT.surprise" @click="emit('surprise')">Surprise Me</button>
        </div>
      </BandMenu>
    </div>

    <div class="ml-auto flex items-center gap-1">
      <RouterLink to="/dateflow/play" class="df-btn play df-not-phone" data-help="games" title="The DateFlow games">▶ Games</RouterLink>
      <BandMenu class="df-not-phone" label="Display ▾" data-help="display" title="Colours, and light or dark" :width="240">
        <DisplaySettings :color-mode="colorMode" :theme="theme" @toggle-colors="emit('toggleColors')"
                         @toggle-theme="emit('toggleTheme')" />
      </BandMenu>
      <button
        class="df-btn icon help-toggle df-not-phone"
        :class="{ on: helpOn }"
        :aria-pressed="helpOn"
        aria-label="What's this? Click, then click anything to learn what it is"
        title="What's this? (?)"
        data-help-toggle
        @click="emit('toggleHelp')"
      >
        ?
      </button>
      <!-- Phone: everything else in one menu -->
      <BandMenu class="df-phone-only" icon aria-label="More" data-help="more" :width="260">
        <template #label>☰</template>
        <div class="flex flex-col gap-1">
          <button class="df-btn" data-help="play-through" @click="emit('watch')">Play through</button>
          <button class="df-btn" data-help="time-machine" @click="emit('timeMachine')">Time Machine</button>
          <button class="df-btn" data-help="what-happened" @click="emit('summarize')">What happened?</button>
          <button class="df-btn" data-help="surprise" @click="emit('surprise')">Surprise Me</button>
          <RouterLink to="/dateflow/play" class="df-btn play" data-help="games">▶ Games</RouterLink>
          <DisplaySettings :color-mode="colorMode" :theme="theme" @toggle-colors="emit('toggleColors')"
                           @toggle-theme="emit('toggleTheme')" />
          <button class="df-btn" :class="{ on: helpOn }" data-help-toggle @click="emit('toggleHelp')">? What's this?</button>
        </div>
      </BandMenu>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import type { ColorMode, Theme } from '@/stores/dateflow'
import type { FeaturedStory } from '@/engine/dateflow/stories'
import type { Journey, JourneyProgress } from '@/engine/dateflow/journeys'
import type { GalleryCard } from '@/engine/dateflow/gallery'
import { parseYear } from '@/utils/formatYear'
import { MIN_QUERY } from '@/engine/dateflow/tour'
import JourneysMenu from './JourneysMenu.vue'
import StoriesMenu from './StoriesMenu.vue'
import BandMenu from './BandMenu.vue'
import DisplaySettings from './DisplaySettings.vue'

defineProps<{
  theme: Theme
  colorMode: ColorMode
  helpOn: boolean
  stories: FeaturedStory[]
  todaysChain: GalleryCard | null
  journeys: Journey[]
  journeyProgress: Record<string, JourneyProgress>
}>()
const emit = defineEmits<{
  jump: [year: number]
  search: [query: string]
  watch: []
  toggleTheme: []
  toggleColors: []
  summarize: []
  openStory: [id: string]
  openJourney: [id: string, from: 'start' | 'resume']
  gallery: []
  timeMachine: []
  toggleHelp: []
  surprise: []
}>()

const HINT = {
  play: 'Play through the events your filters show, one at a time',
  tm: 'See the whole world in one year, compare two years, two empires or periods, or two events',
  what: 'What happened in the years in view (or shift-drag across the timeline)',
  surprise: 'Open a random event and explore from there',
}

const searchOpen = ref(false)
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
.header {
  border-color: var(--df-border-soft);
}
.title {
  color: var(--df-text);
}
.search {
  width: 18rem;
}
@media (max-width: 639px) {
  /* Opened by 🔍: the search takes a row of its own */
  .search {
    order: 10;
    width: 100%;
  }
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
.help-toggle {
  font-weight: 800;
}
</style>
