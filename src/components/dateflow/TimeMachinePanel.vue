<template>
  <aside class="tm-panel" role="region" aria-label="Time Machine">
    <header class="head">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="kicker">Time Machine</div>
          <h2 class="title">{{ title }}</h2>
        </div>
        <button class="icon" aria-label="Close the Time Machine (Esc)" @click="emit('close')">✕</button>
      </div>
      <div class="tabs" role="tablist" aria-label="What to explore">
        <button v-for="t in TABS" :key="t.id" role="tab" :aria-selected="tm.mode === t.id" :class="{ on: tm.mode === t.id }"
                @click="emit('set', { mode: t.id })">{{ t.label }}</button>
      </div>
    </header>

    <div class="body">
      <!-- ── A year ─────────────────────────────────────────────────── -->
      <template v-if="tm.mode === 'year'">
        <div class="controls">
          <button v-for="d in [-100, -10, -1]" :key="d" class="step" :aria-label="`${d} years`" @click="emit('step', d)">{{ d }}</button>
          <input class="year" :value="formatYear(tm.year)" aria-label="Year (e.g. 1250 or 500 BCE)"
                 @change="setYearFrom(($event.target as HTMLInputElement).value, 'year')" />
          <button v-for="d in [1, 10, 100]" :key="d" class="step" :aria-label="`+${d} years`" @click="emit('step', d)">+{{ d }}</button>
        </div>
        <input type="range" class="slider" :min="range[0]" :max="range[1]" :value="tm.year" aria-label="Year slider"
               @change="emit('set', { year: Number(($event.target as HTMLInputElement).value) })" />
        <div class="row-between">
          <span class="hint">{{ world.spanCount }} empires and periods · {{ world.eventCount }} events within ±{{ tm.window }} years</span>
          <select class="window" :value="tm.window" aria-label="Events within"
                  @change="emit('set', { window: Number(($event.target as HTMLSelectElement).value) }, false)">
            <option v-for="w in [10, 25, 50, 100]" :key="w" :value="w">±{{ w }} yrs</option>
          </select>
        </div>
        <p class="honest">What's in DateFlow, not everything that happened. An empty region means we haven't added it yet.</p>

        <section v-for="r in world.regions" :key="r.lane" class="region" :class="{ empty: !r.spans.length && !r.events.length }">
          <h3 class="region-name">{{ r.label }}</h3>
          <p v-if="!r.spans.length && !r.events.length" class="hint">Nothing in DateFlow yet.</p>
          <div v-if="r.spans.length" class="chips">
            <button v-for="s in r.spans" :key="s.span.id" class="chip" :class="s.span.kind" @click="emit('open', s.span.id, 'span')">
              <span class="chip-name">{{ s.span.name }}</span>
              <span class="chip-meta">{{ spanMeta(s) }}</span>
              <span v-if="s.uncertain" class="tag">dates uncertain</span>
            </button>
          </div>
          <ul v-if="r.events.length" class="events">
            <li v-for="e in r.events" :key="e.id">
              <button class="ev" @click="emit('open', e.id, 'event')">
                <span class="ev-year">{{ formatEventYear(e.year, e.approximate) }}</span>{{ e.name }}
              </button>
            </li>
          </ul>
        </section>
      </template>

      <!-- ── Two years ──────────────────────────────────────────────── -->
      <template v-else-if="tm.mode === 'compare' && compare">
        <div class="two">
          <label><span class="lbl">From</span>
            <input class="year" :value="formatYear(tm.year)" @change="setYearFrom(($event.target as HTMLInputElement).value, 'year')" /></label>
          <span class="arrow" aria-hidden="true">→</span>
          <label><span class="lbl">To</span>
            <input class="year" :value="formatYear(tm.compare)" @change="setYearFrom(($event.target as HTMLInputElement).value, 'compare')" /></label>
        </div>
        <p class="summary">
          In {{ yearsText(compare.from, compare.to) }}: <strong>{{ compare.totals.gone }}</strong> empires and periods ended,
          <strong>{{ compare.totals.new }}</strong> began, <strong>{{ compare.totals.continuing }}</strong> carried on<template
            v-if="compare.totals.cameAndWent">, and <strong>{{ compare.totals.cameAndWent }}</strong> came and went in between</template>.
        </p>
        <p class="honest">Counts what's in DateFlow, not everything that happened.</p>
        <section v-for="r in compare.regions.filter(hasChange)" :key="r.lane" class="region">
          <h3 class="region-name">{{ r.label }}</h3>
          <div v-for="g in GROUPS" :key="g.key">
            <template v-if="r[g.key].length">
              <div class="group" :class="g.key">{{ g.label }}</div>
              <div class="chips">
                <button v-for="d in r[g.key]" :key="d.id" class="chip" :class="d.kind" @click="emit('open', d.id, 'span')">
                  <span class="chip-name">{{ d.name }}</span><span class="chip-meta">{{ spanYears(d) }}</span>
                </button>
              </div>
            </template>
          </div>
        </section>
      </template>

      <!-- ── Two empires or periods ─────────────────────────────────── -->
      <template v-else-if="tm.mode === 'overlap'">
        <div class="pickers">
          <EntityPicker :options="spanOptions" :model-value="tm.spanA" label="First empire or period"
                        placeholder="e.g. Roman Empire" @update:model-value="(id) => emit('set', { spanA: id })" />
          <EntityPicker :options="spanOptions" :model-value="tm.spanB" label="Second"
                        placeholder="e.g. Han Dynasty" @update:model-value="(id) => emit('set', { spanB: id })" />
        </div>
        <template v-if="overlapResult && spans.a && spans.b">
          <p class="result">
            <template v-if="overlapResult.kind === 'overlap'">
              <strong>{{ spans.a.name }}</strong> and <strong>{{ spans.b.name }}</strong> coexisted for
              <strong>{{ about(overlapResult.approximate) }}{{ overlapResult.years.toLocaleString() }} years</strong>
              ({{ formatYear(overlapResult.start) }} – {{ formatYear(overlapResult.end) }}).
            </template>
            <template v-else>
              <strong>{{ spans.a.name }}</strong> and <strong>{{ spans.b.name }}</strong> never coexisted:
              {{ overlapResult.first.name }} ended {{ about(overlapResult.approximate) }}{{ overlapResult.years.toLocaleString() }}
              years before {{ overlapResult.second.name }} began.
            </template>
          </p>
          <section v-for="side in overlapSides" :key="side.span.id" class="region">
            <h3 class="region-name">{{ side.title }}</h3>
            <p v-if="!side.events.length" class="hint">No events in DateFlow for these years yet.</p>
            <ul class="events">
              <li v-for="e in side.events" :key="e.id">
                <button class="ev" @click="emit('open', e.id, 'event')">
                  <span class="ev-year">{{ formatEventYear(e.year, e.approximate) }}</span>{{ e.name }}
                </button>
              </li>
            </ul>
          </section>
        </template>
        <p v-else class="hint">Choose two empires, dynasties or periods to see how long they coexisted.</p>
      </template>

      <!-- ── Two events ─────────────────────────────────────────────── -->
      <template v-else-if="tm.mode === 'distance'">
        <div class="pickers">
          <EntityPicker :options="eventOptions" :model-value="tm.eventA" label="First event"
                        placeholder="e.g. Great Pyramid" @update:model-value="(id) => emit('set', { eventA: id })" />
          <EntityPicker :options="eventOptions" :model-value="tm.eventB" label="Second event"
                        placeholder="e.g. Julius Caesar" @update:model-value="(id) => emit('set', { eventB: id })" />
        </div>
        <template v-if="distanceResult">
          <p class="big">{{ about(distanceResult.approximate) }}{{ distanceResult.years.toLocaleString() }} years apart</p>
          <p class="result">
            From <strong>{{ distanceResult.earlier.name }}</strong> ({{ formatEventYear(distanceResult.earlier.year, distanceResult.earlier.approximate) }})
            to <strong>{{ distanceResult.later.name }}</strong> ({{ formatEventYear(distanceResult.later.year, distanceResult.later.approximate) }}).
            {{ distanceResult.between.toLocaleString() }} DateFlow events lie in between.
          </p>
          <p v-if="distanceResult.surprise" class="surprise">
            <span class="wow">Did you know?</span>
            {{ distanceResult.surprise.subject.name }} is closer in time to
            <strong>{{ distanceResult.surprise.near.name }}</strong>
            ({{ approxFor(distanceResult.surprise.subject, distanceResult.surprise.near) }}{{ distanceResult.surprise.toNear.toLocaleString() }} years)
            than to <strong>{{ distanceResult.surprise.far.name }}</strong>
            ({{ approxFor(distanceResult.surprise.subject, distanceResult.surprise.far) }}{{ distanceResult.surprise.toFar.toLocaleString() }} years).
          </p>
        </template>
        <p v-else class="hint">Choose two events to see how far apart they really were.</p>
      </template>

      <button class="link" @click="copyLink">{{ copied ? 'Link copied ✓' : 'Copy link' }}</button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Event } from '@/types'
import type { Duration } from '@/types/dateflow'
import type { ActiveSpan, Distance, Overlap, RegionChange, WorldAt, YearComparison } from '@/engine/dateflow/contemporaries'
import type { TimeMachine, TimeMachineMode } from '@/stores/dateflow'
import { laneFor } from '@/engine/dateflow/lanes'
import { yearGap } from '@/engine/dateflow/stories'
import { formatEventYear, formatYear, parseYear } from '@/utils/formatYear'
import { copyText } from '@/services/sharing'
import EntityPicker from './EntityPicker.vue'

const props = defineProps<{
  tm: TimeMachine
  world: WorldAt
  compare: YearComparison | null
  overlapResult: Overlap | null
  spans: { a: Duration | null; b: Duration | null }
  distanceResult: Distance | null
  events: Event[]
  durations: Duration[]
  range: [number, number]
}>()
const emit = defineEmits<{
  close: []
  set: [patch: Partial<TimeMachine>, frame?: boolean]
  step: [delta: number]
  open: [id: string, kind: 'event' | 'span']
}>()

const TABS: { id: TimeMachineMode; label: string }[] = [
  { id: 'year', label: 'A year' },
  { id: 'compare', label: 'Two years' },
  { id: 'overlap', label: 'Two empires' },
  { id: 'distance', label: 'Two events' },
]
const GROUPS: { key: 'gone' | 'new' | 'continuing' | 'cameAndWent'; label: string }[] = [
  { key: 'gone', label: 'Gone' },
  { key: 'new', label: 'New' },
  { key: 'continuing', label: 'Still there' },
  { key: 'cameAndWent', label: 'Came and went' },
]

const title = computed(() => {
  const t = props.tm
  if (t.mode === 'year') return `The world in ${formatYear(t.year)}`
  if (t.mode === 'compare') return `${formatYear(t.year)} → ${formatYear(t.compare)}`
  if (t.mode === 'overlap') return 'When did they coexist?'
  return 'How far apart?'
})

const about = (approx: boolean) => (approx ? 'about ' : '')
const approxFor = (...es: Event[]) => (es.some((e) => e.approximate) ? 'about ' : '')
const yearsText = (a: number, b: number) => `${Math.abs(yearGap(a, b)).toLocaleString()} years`
const hasChange = (r: RegionChange) => r.gone.length + r.new.length + r.cameAndWent.length > 0
const spanYears = (d: Duration) => `${d.approximate ? 'c. ' : ''}${formatYear(d.startYear)}–${formatYear(d.endYear)}`

/** "since 960 · ends 1279", "its first year", "its last 8 years". */
function spanMeta(s: ActiveSpan): string {
  const c = s.span.approximate ? 'c. ' : ''
  if (s.since === 0) return `its first year (${c}${formatYear(s.span.startYear)})`
  if (s.until === 0) return `its last year`
  if (s.until <= 25) return `its last ${s.until} years (ends ${c}${formatYear(s.span.endYear)})`
  if (s.since <= 25) return `founded ${s.since} years ago (${c}${formatYear(s.span.startYear)})`
  return `since ${c}${formatYear(s.span.startYear)} · ends ${formatYear(s.span.endYear)}`
}

function setYearFrom(text: string, key: 'year' | 'compare') {
  const y = parseYear(text)
  if (y !== null && y !== 0) emit('set', { [key]: y })
}

// Two empires: events from each one's region during the shared years.
const overlapSides = computed(() => {
  const o = props.overlapResult
  const { a, b } = props.spans
  if (!o || o.kind !== 'overlap' || !a || !b) return []
  return [a, b].map((span) => ({
    span,
    title: `${span.name}'s world, ${formatYear(o.start)} – ${formatYear(o.end)}`,
    events: props.events
      .filter((e) => laneFor(e.region) === laneFor(span.region) && e.year >= o.start && e.year <= o.end)
      .sort((x, y) => y.importance - x.importance)
      .slice(0, 4)
      .sort((x, y) => x.year - y.year),
  }))
})

const spanOptions = computed(() =>
  props.durations.map((d) => ({ id: d.id, label: `${d.name} (${spanYears(d)})` })).sort((x, y) => x.label.localeCompare(y.label)),
)
const eventOptions = computed(() =>
  props.events.map((e) => ({ id: e.id, label: `${e.name} (${formatEventYear(e.year, e.approximate)})` }))
    .sort((x, y) => x.label.localeCompare(y.label)),
)

const copied = ref(false)
async function copyLink() {
  copied.value = await copyText(location.href)
  setTimeout(() => (copied.value = false), 2000)
}
</script>

<style scoped>
.tm-panel {
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
  .tm-panel {
    position: fixed;
    inset: auto 0 0 0;
    width: auto;
    max-height: 52vh;
    border-left: 0;
    border-top: 1px solid var(--df-border);
    border-radius: 1rem 1rem 0 0;
    box-shadow: 0 -10px 30px rgb(0 0 0 / 0.3);
    z-index: 40;
  }
}
.head {
  padding: 0.75rem 1rem 0.5rem;
  border-bottom: 1px solid var(--df-border-soft);
}
.body {
  overflow-y: auto;
  padding: 0.75rem 1rem 1rem;
}
.kicker {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--df-approx);
}
.title {
  font-size: 1.25rem;
  font-weight: 800;
  line-height: 1.2;
  margin-top: 0.125rem;
  font-variant-numeric: tabular-nums;
}
.tabs {
  display: flex;
  gap: 0.25rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
}
.tabs button {
  padding: 0.3rem 0.6rem;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  background: var(--df-btn);
  color: var(--df-text-2);
}
.tabs button.on {
  background: var(--df-text);
  color: var(--df-bg);
}
.icon {
  min-width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  background: var(--df-btn);
  font-weight: 700;
}
.controls {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.step {
  height: 2rem;
  padding: 0 0.4rem;
  border-radius: 0.4rem;
  background: var(--df-btn);
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.step:hover,
.icon:hover,
.link:hover {
  background: var(--df-btn-hover);
}
.year {
  width: 6.5rem;
  height: 2rem;
  text-align: center;
  border-radius: 0.5rem;
  border: 1px solid var(--df-border);
  background: var(--df-bg);
  color: var(--df-text);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.slider {
  width: 100%;
  margin: 0.5rem 0 0.25rem;
  accent-color: var(--df-approx-border);
}
.row-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.window {
  height: 1.75rem;
  border-radius: 0.4rem;
  border: 1px solid var(--df-border);
  background: var(--df-bg);
  color: var(--df-text);
  font-size: 12px;
}
.hint {
  font-size: 12px;
  color: var(--df-muted);
}
.honest {
  font-size: 11px;
  color: var(--df-muted);
  margin: 0.375rem 0 0.75rem;
  font-style: italic;
}
.region {
  padding: 0.625rem 0;
  border-top: 1px solid var(--df-border-soft);
}
.region.empty {
  opacity: 0.7;
}
.region-name {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--df-text-2);
  margin-bottom: 0.375rem;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-bottom: 0.375rem;
}
.chip {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  padding: 0.3rem 0.6rem;
  border-radius: 0.6rem;
  background: var(--df-btn);
  border: 1px solid var(--df-border);
}
.chip.period {
  border-style: dashed;
}
.chip:hover {
  background: var(--df-btn-hover);
}
.chip-name {
  font-size: 0.8125rem;
  font-weight: 700;
}
.chip-meta {
  font-size: 11px;
  color: var(--df-text-2);
  font-variant-numeric: tabular-nums;
}
.tag {
  margin-top: 0.15rem;
  font-size: 10px;
  font-weight: 700;
  color: var(--df-approx);
}
.events {
  display: grid;
  gap: 0.125rem;
}
.ev {
  display: flex;
  width: 100%;
  text-align: left;
  font-size: 0.8125rem;
  padding: 0.2rem 0.375rem;
  border-radius: 0.4rem;
}
.ev:hover {
  background: var(--df-btn-hover);
}
.ev-year {
  flex-shrink: 0;
  min-width: 5.5rem;
  margin-right: 0.5rem;
  font-family: ui-monospace, monospace;
  color: var(--df-text-2);
  font-variant-numeric: tabular-nums;
}
.two {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
}
.lbl {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--df-text-2);
  margin-bottom: 0.2rem;
}
.arrow {
  padding-bottom: 0.4rem;
  font-weight: 800;
}
.summary,
.result {
  font-size: 0.875rem;
  line-height: 1.5;
  margin-top: 0.75rem;
}
.group {
  font-size: 11px;
  font-weight: 700;
  margin: 0.25rem 0 0.25rem;
  color: var(--df-text-2);
}
.group.gone {
  color: var(--df-arc-trigger);
}
.group.new {
  color: var(--df-arc-enable);
}
.pickers {
  display: grid;
  gap: 0.5rem;
}
.big {
  font-size: 1.75rem;
  font-weight: 900;
  margin-top: 0.75rem;
  font-variant-numeric: tabular-nums;
  color: var(--df-approx);
}
.surprise {
  margin-top: 0.75rem;
  padding: 0.625rem 0.75rem;
  border-radius: 0.75rem;
  background: var(--df-approx-bg);
  border: 1px solid var(--df-approx-border);
  font-size: 0.875rem;
  line-height: 1.5;
}
.wow {
  display: block;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--df-approx);
}
.link {
  margin-top: 1rem;
  padding: 0.375rem 0.6rem;
  border-radius: 0.5rem;
  font-size: 12px;
  font-weight: 600;
  background: var(--df-btn);
}
</style>
