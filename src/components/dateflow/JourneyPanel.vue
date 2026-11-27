<template>
  <aside class="journey-panel" role="region" :aria-label="`Journey: ${journey.title}`">
    <header class="head">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="kicker">Journey</p>
          <h2 class="title">{{ journey.title }}</h2>
          <p class="sub">{{ journey.stops.length }} stops · {{ formatYear(journey.start) }} → {{ formatYear(journey.end) }}</p>
        </div>
        <button class="icon" aria-label="Close the journey (Esc)" @click="emit('close')">✕</button>
      </div>
      <div class="controls">
        <button class="icon" aria-label="Back (←)" :disabled="step === null" @click="emit('step', -1)">‹</button>
        <span class="counter" aria-live="polite">{{ counter }}</span>
        <button class="icon" aria-label="Next (→)" :disabled="atEnd" @click="emit('step', 1)">›</button>
        <button class="link" @click="copyLink">{{ copied ? 'Link copied ✓' : 'Copy link' }}</button>
      </div>
    </header>

    <div ref="bodyEl" class="body">
      <!-- The intro -->
      <section v-if="step === null" class="now" aria-live="polite">
        <p class="text">{{ journey.intro }}</p>
        <button class="next" @click="emit('step', 1)">Start the journey ›</button>
      </section>

      <!-- A stop: how it follows the last one, what it shows, the narration -->
      <section v-else-if="stop" class="now" aria-live="polite">
        <div v-if="stop.bridge" class="bridge" :class="`by-${stop.bridge.kind}`">
          <template v-if="stop.bridge.kind === 'link'">
            <span class="verb">{{ stop.bridge.text }}</span>
            <span v-if="stop.bridge.debated" class="tag">debated</span>
            <span class="why">{{ stop.bridge.why }}</span>
          </template>
          <span v-else-if="stop.bridge.kind === 'overlap'" class="verb">At the same time as the last stop</span>
          <span v-else class="verb">Then · {{ stop.bridge.text }}</span>
        </div>
        <p class="stop-no">Stop {{ step + 1 }} of {{ journey.stops.length }}</p>
        <h3 class="stop-title">{{ stop.title }}</h3>
        <ul class="items">
          <li v-for="x in stop.items" :key="x.id">
            <span class="when">{{ when(x) }}</span>
            <!-- A one-item stop is already titled by its item: just offer its card -->
            <button class="item-name" :title="`Open the card for ${x.name}`" @click="emit('open', x.id, x.kind)">
              {{ stop.items.length > 1 ? x.name : 'Read more' }}
            </button>
            <p v-if="x.approximate" class="approx">
              ≈ Approximate<template v-if="x.dateDisplay"> · {{ x.dateDisplay }}</template>
            </p>
          </li>
        </ul>
        <p class="text">{{ stop.narration }}</p>
        <PhaseStrip
          v-for="x in stop.items.filter((x) => lifeCycles[x.id])"
          :id="x.id"
          :key="x.id"
          v-bind="lifeCycles[x.id]!"
          @show="(a, b) => emit('showYears', a, b)"
        />
        <p v-if="stop.question" class="question"><span class="q-label">Think about it</span>{{ stop.question }}</p>
        <div class="actions">
          <button v-if="offView" class="back" @click="emit('goTo', step)">↩ Back to the stop</button>
          <button class="next" @click="emit('step', 1)">
            {{ step + 1 < journey.stops.length ? `Next: ${journey.stops[step + 1]!.title} ›` : 'Finish ›' }}
          </button>
        </div>
      </section>

      <!-- The end -->
      <section v-else class="now" aria-live="polite">
        <p class="stop-no">The end of the journey</p>
        <p v-if="journey.closing" class="text">{{ journey.closing }}</p>
        <p v-if="journey.question" class="question"><span class="q-label">Think about it</span>{{ journey.question }}</p>
        <div class="actions">
          <button class="back" @click="emit('goTo', null)">↺ Back to the start</button>
          <button class="next" @click="emit('close')">Close</button>
        </div>
      </section>

      <!-- Every stop: jump anywhere -->
      <ol class="list" aria-label="Stops">
        <li v-for="(s, i) in journey.stops" :key="i"
            class="row" :class="{ current: step === i }">
          <button class="row-btn" @click="emit('goTo', i)">
            <span class="num">{{ i + 1 }}</span>
            <span class="row-when">{{ range(s) }}</span>
            <span class="row-name">{{ s.title }}</span>
          </button>
        </li>
      </ol>
      <p class="tip">Move around the timeline as you go: open anything to read more, then come back to the stop.</p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { stopRange, type Journey } from '@/engine/dateflow/journeys'
import type { TourStop } from '@/engine/dateflow/tour'
import type { Family } from '@/engine/dateflow/categoryGroups'
import type { Phase } from '@/types/dateflow'
import PhaseStrip from './PhaseStrip.vue'
import { formatEventYear, formatYear } from '@/utils/formatYear'
import { copyText } from '@/services/sharing'

const props = defineProps<{
  journey: Journey
  step: number | null // null = the intro, stops.length = the end
  offView: boolean // the student has moved away from the current stop
  lifeCycles: Record<string, { name: string; phases: Phase[]; start: number; end: number; family: Family }>
}>()
const emit = defineEmits<{
  close: []
  step: [delta: 1 | -1]
  goTo: [i: number | null]
  open: [id: string, kind: 'event' | 'span']
  showYears: [start: number, end: number] // frame a life-cycle phase
}>()

const stop = computed(() => (props.step === null ? null : (props.journey.stops[props.step] ?? null)))
const atEnd = computed(() => props.step === props.journey.stops.length)
const counter = computed(() =>
  props.step === null ? 'Intro' : atEnd.value ? 'End' : `${props.step + 1} / ${props.journey.stops.length}`,
)

function when(s: TourStop): string {
  if (s.endYear !== undefined && s.endYear !== s.year) {
    return `${s.approximate ? 'c. ' : ''}${formatYear(s.year)}–${formatYear(s.endYear)}`
  }
  return formatEventYear(s.year, s.approximate)
}

const range = stopRange

// Each step starts at the top of the panel: the link from the last stop, then the stop itself.
const bodyEl = ref<HTMLElement | null>(null)
watch(
  () => props.step,
  async () => {
    await nextTick()
    bodyEl.value?.scrollTo({ top: 0 })
  },
)

const copied = ref(false)
async function copyLink() {
  const url = `${location.origin}${location.pathname}?journey=${encodeURIComponent(props.journey.id)}`
  copied.value = await copyText(url)
  setTimeout(() => (copied.value = false), 2000)
}
</script>

<style scoped>
.journey-panel {
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
  .journey-panel {
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
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0.75rem 1rem 1rem;
}
.kicker {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--df-muted);
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
.icon {
  min-width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  background: var(--df-btn);
  font-weight: 700;
}
.icon:hover:not(:disabled) {
  background: var(--df-btn-hover);
}
.icon:disabled {
  opacity: 0.4;
}
.counter {
  min-width: 4rem;
  text-align: center;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--df-text-2);
}
.link {
  margin-left: auto;
  font-size: 12px;
  font-weight: 600;
  text-decoration: underline;
  color: var(--df-text-2);
}
.now {
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  border-radius: 0.75rem;
  background: var(--df-btn);
}
.bridge {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.25rem 0.5rem;
  margin-bottom: 0.625rem;
  padding-left: 0.625rem;
  border-left: 3px solid var(--df-text-2);
  font-size: 12px;
}
.bridge.by-gap,
.bridge.by-overlap {
  border-left-color: var(--df-border);
  color: var(--df-text-2);
}
.verb {
  font-weight: 700;
}
.why {
  flex-basis: 100%;
  color: var(--df-text-2);
}
.tag {
  padding: 0 0.375rem;
  border-radius: 0.25rem;
  border: 1px dashed var(--df-text-2);
  font-size: 10px;
  font-weight: 600;
}
.stop-no {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--df-muted);
}
.stop-title {
  font-size: 1.0625rem;
  font-weight: 800;
  line-height: 1.3;
  margin-top: 0.125rem;
}
.items {
  margin-top: 0.375rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.when {
  font-family: ui-monospace, monospace;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--df-text-2);
  margin-right: 0.5rem;
}
.item-name {
  font-size: 0.875rem;
  font-weight: 600;
  text-align: left;
  text-decoration: underline;
  text-decoration-color: var(--df-border);
}
.item-name:hover {
  text-decoration-color: currentColor;
}
.approx {
  display: inline-block;
  margin-top: 0.125rem;
  padding: 0.0625rem 0.5rem;
  border-radius: 0.375rem;
  border: 1px solid var(--df-approx-border);
  background: var(--df-approx-bg);
  color: var(--df-approx);
  font-size: 12px;
  font-weight: 700;
}
.text {
  margin-top: 0.625rem;
  font-size: 0.9375rem;
  line-height: 1.55;
}
.question {
  margin-top: 0.75rem;
  padding: 0.5rem 0.625rem;
  border-radius: 0.5rem;
  background: var(--df-surface);
  font-size: 0.875rem;
  font-style: italic;
  line-height: 1.45;
}
.q-label {
  display: block;
  font-style: normal;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--df-muted);
  margin-bottom: 0.125rem;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}
.next {
  margin-top: 0.75rem;
  padding: 0.375rem 0.75rem;
  border-radius: 0.5rem;
  background: var(--df-text);
  color: var(--df-bg);
  font-size: 0.8125rem;
  font-weight: 700;
  text-align: left;
}
.actions .next {
  margin-top: 0;
}
.back {
  padding: 0.375rem 0.75rem;
  border-radius: 0.5rem;
  background: var(--df-surface);
  border: 1px solid var(--df-border);
  font-size: 0.8125rem;
  font-weight: 600;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}
.row {
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
  padding: 0.25rem 0.5rem;
  text-align: left;
}
.row-btn:hover .row-name {
  text-decoration: underline;
}
.num {
  flex-shrink: 0;
  width: 1.25rem;
  font-size: 11px;
  font-weight: 700;
  color: var(--df-muted);
  font-variant-numeric: tabular-nums;
}
.row-when {
  flex-shrink: 0;
  min-width: 7.5rem;
  font-family: ui-monospace, monospace;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--df-text-2);
}
.row-name {
  font-size: 0.8125rem;
  font-weight: 700;
}
.tip {
  margin-top: 0.75rem;
  font-size: 0.75rem;
  color: var(--df-text-2);
}
</style>
