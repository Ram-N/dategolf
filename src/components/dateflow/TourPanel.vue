<template>
  <aside class="tour-panel" role="region" :aria-label="title">
    <!-- Header: what's being toured, and the player -->
    <header class="head">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h2 class="title">{{ title }}</h2>
          <p class="sub">
            {{ countText }}<template v-if="stops.length > 1"> · {{ formatYear(first) }} → {{ formatYear(last) }}</template>
            <template v-if="hidden > 0"> · {{ hidden }} more hidden by your filters</template>
          </p>
        </div>
        <button class="icon" aria-label="Close (Esc)" @click="emit('close')">✕</button>
      </div>

      <template v-if="stops.length">
        <div class="controls">
          <button class="play" :aria-label="playing ? 'Pause' : 'Play'" @click="emit('play')">
            {{ playing ? '❚❚ Pause' : '▶ Play' }}
          </button>
          <button class="icon" aria-label="Stop: back to the overview" title="Stop" @click="emit('stop')">■</button>
          <button class="icon" aria-label="Previous (←)" @click="emit('step', -1)">‹</button>
          <span class="counter" aria-live="polite">{{ step === null ? 'Overview' : `${step + 1} / ${stops.length}` }}</span>
          <button class="icon" aria-label="Next (→)" @click="emit('step', 1)">›</button>
        </div>
        <div class="controls">
          <!-- Scrub: drag to any stop -->
          <input
            v-if="stops.length > 1"
            type="range"
            class="scrub"
            min="0"
            :max="stops.length - 1"
            :value="step ?? 0"
            :aria-label="`Scrub through ${stops.length} stops`"
            :aria-valuetext="current ? `${when(current)}: ${current.name}` : 'Overview'"
            @input="emit('goTo', Number(($event.target as HTMLInputElement).value))"
          />
          <div class="seg ml-auto" role="group" aria-label="Speed">
            <button v-for="s in TOUR_SPEEDS" :key="s.id" :class="{ on: speed === s.id }" :aria-pressed="speed === s.id"
                    @click="emit('speed', s.id)">{{ s.label }}</button>
          </div>
        </div>
      </template>
    </header>

    <div class="body">
      <!-- The current stop, in full -->
      <section v-if="current" class="now" aria-live="polite">
        <p class="now-when">{{ when(current) }} · {{ current.region }}</p>
        <h3 class="now-name">{{ current.name }}</h3>
        <p v-if="current.approximate" class="approx">
          ≈ Approximate date<template v-if="current.dateDisplay"> · historians' dates: {{ current.dateDisplay }}</template>
        </p>
        <p class="now-text">{{ current.description }}</p>
        <p v-if="current.significance" class="now-why"><strong>Why it matters:</strong> {{ current.significance }}</p>
        <button class="more" @click="emit('open', step!)">Open the full card</button>
      </section>

      <div v-if="!stops.length" class="empty">
        <p v-if="hidden > 0">All {{ hidden }} matches are hidden by your filters.</p>
        <p v-else-if="source === 'search'">Nothing matches “{{ query }}”.</p>
        <p v-else>Nothing to play: the filters let nothing through.</p>
        <p class="tip">{{ HINT }}</p>
      </div>

      <!-- Every stop, in time order (scrolls on its own, so the current stop above stays in view) -->
      <div v-else class="list-wrap">
      <ol class="list">
        <li v-for="(s, i) in stops" :key="s.id" :ref="(el) => (rows[i] = el as HTMLElement)"
            class="row" :class="{ current: step === i }">
          <button class="row-btn" @click="emit('goTo', i)">
            <span class="dot" :class="s.kind" aria-hidden="true" />
            <span class="when">{{ when(s) }}</span>
            <span class="name">{{ s.name }}</span>
          </button>
          <span v-if="s.via" class="via">part of {{ s.via }}</span>
        </li>
      </ol>
      <p v-if="source === 'search'" class="tip">{{ HINT }}</p>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { TOUR_SPEEDS, type TourSpeed, type TourStop } from '@/engine/dateflow/tour'
import { formatEventYear, formatYear } from '@/utils/formatYear'

const props = defineProps<{
  source: 'search' | 'filters'
  query: string
  stops: TourStop[]
  hidden: number // search matches the filters hide
  step: number | null
  playing: boolean
  speed: TourSpeed
}>()
const emit = defineEmits<{
  close: []
  play: []
  stop: []
  step: [delta: 1 | -1]
  goTo: [i: number]
  speed: [s: TourSpeed]
  open: [i: number]
}>()

const HINT = 'Search looks at event and span names (and other names they go by), not descriptions. ' +
  'Try a person, a place or an empire.'

const title = computed(() => (props.source === 'search' ? `“${props.query}”` : 'Watch history'))
const current = computed(() => (props.step === null ? null : (props.stops[props.step] ?? null)))
const first = computed(() => props.stops[0]?.year ?? 0)
const last = computed(() => Math.max(...props.stops.map((s) => s.endYear ?? s.year)))
const countText = computed(() => {
  const n = props.stops.length
  const noun = props.source === 'search' ? 'match' : 'stop'
  return `${n.toLocaleString()} ${noun}${n === 1 ? '' : noun === 'match' ? 'es' : 's'}`
})

function when(s: TourStop): string {
  if (s.endYear !== undefined && s.endYear !== s.year) {
    return `${s.approximate ? 'c. ' : ''}${formatYear(s.year)}–${formatYear(s.endYear)}`
  }
  return formatEventYear(s.year, s.approximate)
}

const rows = ref<HTMLElement[]>([])
watch(
  () => props.step,
  async (i) => {
    await nextTick()
    if (i !== null) rows.value[i]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  },
)

// Auto-advance while playing, at the chosen speed.
let timer: ReturnType<typeof setInterval> | null = null
watch(
  () => [props.playing, props.speed] as const,
  ([on, speed]) => {
    if (timer) clearInterval(timer)
    const ms = TOUR_SPEEDS.find((s) => s.id === speed)!.ms
    timer = on ? setInterval(() => emit('step', 1), ms) : null
  },
  { immediate: true },
)
onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.tour-panel {
  display: flex;
  flex-direction: column;
  width: 400px;
  flex-shrink: 0;
  border-left: 1px solid var(--df-border-soft);
  background: var(--df-surface);
  color: var(--df-text);
  min-height: 0;
}
@media (max-width: 640px) {
  /* Phones: a bottom sheet over the timeline */
  .tour-panel {
    position: fixed;
    inset: auto 0 0 0;
    width: auto;
    max-height: 48vh;
    border-left: 0;
    border-top: 1px solid var(--df-border);
    border-radius: 1rem 1rem 0 0;
    box-shadow: 0 -10px 30px rgb(0 0 0 / 0.3);
    z-index: 40;
  }
}
.head {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--df-border-soft);
}
.body {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  padding: 0.75rem 1rem 0;
}
.list-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-bottom: 1rem;
}
.title {
  font-size: 1.125rem;
  font-weight: 800;
  line-height: 1.25;
}
.sub {
  font-size: 12px;
  color: var(--df-text-2);
  font-variant-numeric: tabular-nums;
}
.controls {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-top: 0.625rem;
}
.play {
  white-space: nowrap;
  padding: 0.375rem 0.75rem;
  border-radius: 0.5rem;
  background: var(--df-text);
  color: var(--df-bg);
  font-size: 0.8125rem;
  font-weight: 700;
}
.icon {
  min-width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  background: var(--df-btn);
  font-weight: 700;
}
.icon:hover {
  background: var(--df-btn-hover);
}
.counter {
  min-width: 4.5rem;
  text-align: center;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--df-text-2);
}
.seg {
  display: inline-flex;
  border-radius: 0.5rem;
  padding: 2px;
  background: var(--df-btn);
  font-size: 11px;
  font-weight: 600;
}
.seg button {
  padding: 0.2rem 0.45rem;
  border-radius: 0.375rem;
  color: var(--df-text-2);
}
.seg button.on {
  background: var(--df-surface);
  color: var(--df-text);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.2);
}
.scrub {
  flex: 1;
  min-width: 0;
  accent-color: var(--df-text);
}
.now {
  flex-shrink: 0;
  max-height: 45%;
  overflow-y: auto;
  padding: 0.625rem 0.75rem;
  margin-bottom: 0.75rem;
  border-radius: 0.75rem;
  background: var(--df-btn);
}
.now-when {
  font-family: ui-monospace, monospace;
  font-size: 12px;
  color: var(--df-text-2);
}
.now-name {
  font-size: 1rem;
  font-weight: 800;
  line-height: 1.3;
  margin-top: 0.125rem;
}
.approx {
  display: inline-block;
  margin-top: 0.375rem;
  padding: 0.125rem 0.5rem;
  border-radius: 0.375rem;
  border: 1px solid var(--df-approx-border);
  background: var(--df-approx-bg);
  color: var(--df-approx);
  font-size: 12px;
  font-weight: 700;
}
.now-text,
.now-why {
  margin-top: 0.375rem;
  font-size: 0.875rem;
  line-height: 1.45;
}
.now-why {
  color: var(--df-text-2);
}
.more {
  margin-top: 0.5rem;
  font-size: 12px;
  font-weight: 600;
  text-decoration: underline;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}
.row {
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
}
.row.current {
  background: var(--df-btn);
  box-shadow: inset 0 0 0 1.5px var(--df-text-2);
}
.row-btn {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  width: 100%;
  text-align: left;
}
.row-btn:hover .name {
  text-decoration: underline;
}
.dot {
  flex-shrink: 0;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 9999px;
  border: 2px solid var(--df-text);
}
.dot.span {
  border-radius: 0.15rem;
  width: 0.75rem;
}
.when {
  flex-shrink: 0;
  min-width: 5.5rem;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--df-text-2);
}
.name {
  font-size: 0.875rem;
  font-weight: 700;
}
.via {
  display: block;
  margin-left: 6.6rem;
  font-size: 11px;
  color: var(--df-muted);
}
.empty {
  font-size: 0.875rem;
}
.tip {
  margin-top: 0.75rem;
  font-size: 0.75rem;
  color: var(--df-text-2);
}
</style>
