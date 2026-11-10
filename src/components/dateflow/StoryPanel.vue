<template>
  <aside class="story-panel" role="region" :aria-label="`Story: ${rootName}`">
    <!-- Header: what this story is, and the controls -->
    <header class="head">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="seg" role="group" aria-label="Direction">
            <button :class="{ on: story.direction === 'back' }" :aria-pressed="story.direction === 'back'"
                    @click="emit('direction', 'back')">How did we get here?</button>
            <button :class="{ on: story.direction === 'forward' }" :aria-pressed="story.direction === 'forward'"
                    @click="emit('direction', 'forward')">What happened next?</button>
          </div>
          <h2 class="title">{{ rootName }}</h2>
          <p class="sub">
            {{ formatYear(story.start) }} → {{ formatYear(story.end) }} · {{ spanText }} · {{ stops.length }} stops<template
              v-if="regionCount > 1"> · {{ regionCount }} regions</template>
          </p>
        </div>
        <button class="icon" aria-label="Close the story (Esc)" @click="emit('close')">✕</button>
      </div>

      <div class="controls">
        <button class="play" :aria-label="playing ? 'Pause' : 'Play the story'" @click="emit('play')">
          {{ playing ? '❚❚ Pause' : '▶ Play the story' }}
        </button>
        <button class="icon" aria-label="Previous stop (←)" @click="emit('step', -1)">‹</button>
        <span class="counter" aria-live="polite">{{ step === null ? 'Overview' : `${step + 1} / ${stops.length}` }}</span>
        <button class="icon" aria-label="Next stop (→)" @click="emit('step', 1)">›</button>
        <button class="link" @click="copyLink">{{ copied ? 'Link copied ✓' : 'Copy link' }}</button>
      </div>
    </header>

    <div class="body">
      <!-- The story in words, built only from the links themselves -->
      <p v-if="narration" class="narration">{{ narration }}</p>

      <!-- Legend: only the kinds of thread this story uses -->
      <ul class="legend" aria-label="What the threads mean">
        <li v-for="k in legend" :key="k.kind"><span class="swatch" :class="k.kind" />{{ k.label }}</li>
        <li v-if="hasDebated"><span class="swatch debated" />debated (one view among several)</li>
      </ul>

      <!-- The stops, in time order: a "subway line" -->
      <ol class="line">
        <li v-for="(s, i) in stops" :key="s.node.id" :ref="(el) => (rows[i] = el as HTMLElement)"
            class="stop" :class="{ current: step === i, root: s.node.id === story.rootId }">
          <!-- How it got here: one connector per link in (several = a fan of causes) -->
          <div v-for="e in s.incoming" :key="`${e.from}>${e.to}`" class="connector" :class="KIND[e.type] ?? 'then'">
            <span class="verb">{{ connectorText(e) }}</span>
            <span v-if="e.debated" class="tag">debated</span>
            <span v-if="e.crossesRegion" class="tag">{{ laneLabel(byId.get(e.from)?.lane) }} → {{ laneLabel(s.node.lane) }}</span>
            <span class="why">{{ e.why }}</span>
          </div>

          <div class="stop-row">
            <span class="dot" :class="s.node.kind" aria-hidden="true" />
            <button class="when" :aria-label="`Go to ${s.node.name}`" @click="emit('goTo', i)">{{ when(s.node) }}</button>
            <button class="name" @click="emit('open', s.node.id, s.node.kind)">{{ s.node.name }}</button>
          </div>
          <div class="stop-meta">
            <span class="chip">{{ laneLabel(s.node.lane) }}</span>
            <button v-if="s.node.id !== story.rootId" class="reroot" @click="emit('reroot', s.node.id)">
              Story from here ↺
            </button>
          </div>
        </li>
      </ol>

      <button v-if="story.truncated" class="extend" @click="emit('extend')">
        {{ story.direction === 'back' ? 'Go further back' : 'Go further ahead' }} (+4 steps)
      </button>
      <p class="foot">Built from {{ story.edges.length }} reviewed links. A thin grey "then" is a sequence, not a cause.</p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { gapText, narrate, yearGap, type Direction, type Story, type StoryEdge, type StoryNode } from '@/engine/dateflow/stories'
import { LANES, type LaneId } from '@/engine/dateflow/lanes'
import { formatEventYear, formatYear } from '@/utils/formatYear'
import { copyText } from '@/services/sharing'

const props = defineProps<{
  story: Story
  stops: { node: StoryNode; incoming: StoryEdge[] }[]
  step: number | null
  playing: boolean
}>()
const emit = defineEmits<{
  close: []
  direction: [d: Direction]
  play: []
  step: [delta: 1 | -1]
  goTo: [i: number]
  open: [id: string, kind: 'event' | 'span']
  reroot: [id: string]
  extend: []
}>()

const KIND: Record<string, string> = {
  triggered: 'trigger', caused: 'trigger', contributed_to: 'contrib', enabled: 'enable', influenced: 'influence',
  began: 'frame', ended: 'frame', preceded: 'then',
}
// A list, not an object: a key named "then" would make it look like a Promise.
const LEGEND: [kind: string, label: string][] = [
  ['trigger', 'triggered (the immediate spark)'], ['contrib', 'contributed to (one cause of several)'],
  ['enable', 'made possible'], ['influence', 'influenced (ideas)'], ['frame', 'began or ended'],
  ['then', 'then (came next, not a cause)'],
]

const byId = computed(() => new Map(props.story.nodes.map((n) => [n.id, n])))
const rootName = computed(() => byId.value.get(props.story.rootId)?.name ?? '')
const regionCount = computed(() => new Set(props.story.nodes.map((n) => n.lane)).size)
const spanText = computed(() => {
  const n = Math.abs(yearGap(props.story.start, props.story.end))
  return n === 1 ? '1 year' : `${n.toLocaleString()} years`
})
const narration = computed(() => narrate(props.story, 8))
const legend = computed(() => {
  const kinds = new Set(props.story.edges.map((e) => KIND[e.type] ?? 'then'))
  return LEGEND.filter(([k]) => kinds.has(k)).map(([kind, label]) => ({ kind, label }))
})
const hasDebated = computed(() => props.story.edges.some((e) => e.debated))

const laneLabel = (id?: LaneId) => LANES.find((l) => l.id === id)?.label ?? ''

function when(n: StoryNode): string {
  if (n.endYear !== undefined && n.endYear !== n.year) {
    return `${n.approximate ? 'c. ' : ''}${formatYear(n.year)}–${formatYear(n.endYear)}`
  }
  return formatEventYear(n.year, n.approximate)
}

/** The connector reads into the stop below it: "The Great Depression contributed to ↓". */
function connectorText(e: StoryEdge): string {
  const from = byId.value.get(e.from)
  const to = byId.value.get(e.to)
  if (!from || !to) return e.label
  if (e.role === 'sequence') {
    const gap = gapText(from.year, to.year, !!(from.approximate || to.approximate))
    return gap.endsWith('later') ? `${gap.replace(' later', '')} after ${from.name}` : `${gap}, after ${from.name}`
  }
  return `${from.name} ${e.label}`
}

// Keep the current stop in view during playback.
const rows = ref<HTMLElement[]>([])
watch(
  () => props.step,
  async (i) => {
    await nextTick()
    if (i !== null) rows.value[i]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  },
)

// Auto-advance while playing: one stop every 4 seconds.
let timer: ReturnType<typeof setInterval> | null = null
watch(
  () => props.playing,
  (on) => {
    if (timer) clearInterval(timer)
    timer = on ? setInterval(() => emit('step', 1), 4000) : null
  },
  { immediate: true },
)
onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const copied = ref(false)
async function copyLink() {
  const url = `${location.origin}${location.pathname}?story=${encodeURIComponent(props.story.rootId)}&dir=${props.story.direction}`
  copied.value = await copyText(url)
  setTimeout(() => (copied.value = false), 2000)
}
</script>

<style scoped>
.story-panel {
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
  .story-panel {
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
  overflow-y: auto;
  padding: 0.75rem 1rem 1rem;
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
  padding: 0.2rem 0.5rem;
  border-radius: 0.375rem;
  color: var(--df-text-2);
}
.seg button.on {
  background: var(--df-surface);
  color: var(--df-text);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.2);
}
.title {
  font-size: 1.125rem;
  font-weight: 800;
  line-height: 1.25;
  margin-top: 0.375rem;
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
.play,
.link {
  white-space: nowrap;
}
.play {
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
.icon:hover,
.link:hover {
  background: var(--df-btn-hover);
}
.counter {
  min-width: 4.5rem;
  text-align: center;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--df-text-2);
}
.link {
  margin-left: auto;
  padding: 0.375rem 0.5rem;
  border-radius: 0.5rem;
  font-size: 12px;
  font-weight: 600;
  background: var(--df-btn);
}
.narration {
  font-size: 0.875rem;
  line-height: 1.5;
  padding: 0.625rem 0.75rem;
  border-radius: 0.75rem;
  background: var(--df-btn);
}
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.75rem;
  margin: 0.75rem 0;
  font-size: 11px;
  color: var(--df-text-2);
}
.legend li {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
.swatch {
  display: inline-block;
  width: 1.1rem;
  height: 0;
  border-top: 3px solid var(--df-arc-then);
}
.swatch.trigger { border-color: var(--df-arc-trigger); }
.swatch.contrib { border-color: var(--df-arc-contrib); }
.swatch.enable { border-color: var(--df-arc-enable); }
.swatch.influence { border-top-style: dotted; border-color: var(--df-arc-influence); }
.swatch.frame { border-color: var(--df-arc-frame); }
.swatch.then { border-top-width: 2px; }
.swatch.debated { border-top-style: dashed; border-color: var(--df-text-2); }

/* The subway line: a vertical rule with a dot per stop */
.line {
  position: relative;
  margin-left: 0.4rem;
  border-left: 2px solid var(--df-border);
  padding-left: 1rem;
}
.stop {
  position: relative;
  padding: 0.25rem 0.5rem 0.625rem;
  margin-left: -0.5rem;
  border-radius: 0.625rem;
}
.stop.current {
  background: var(--df-btn);
  box-shadow: inset 0 0 0 1.5px var(--df-text-2);
}
.connector {
  font-size: 12px;
  margin: 0.25rem 0 0.375rem;
  padding-left: 0.5rem;
  border-left: 3px solid var(--df-arc-then);
}
.connector.trigger { border-color: var(--df-arc-trigger); }
.connector.contrib { border-color: var(--df-arc-contrib); }
.connector.enable { border-color: var(--df-arc-enable); }
.connector.influence { border-left-style: dotted; border-color: var(--df-arc-influence); }
.connector.frame { border-color: var(--df-arc-frame); }
.verb {
  font-weight: 600;
  color: var(--df-text-2);
}
.verb::after {
  content: ' ↓';
}
.why {
  display: block;
  color: var(--df-muted);
  line-height: 1.35;
}
.tag {
  display: inline-block;
  margin-left: 0.375rem;
  padding: 0 0.375rem;
  border-radius: 9999px;
  font-size: 10px;
  font-weight: 700;
  background: var(--df-btn);
  color: var(--df-text-2);
}
.stop-row {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}
.dot {
  position: absolute;
  left: -1.42rem;
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 9999px;
  background: var(--df-surface);
  border: 2px solid var(--df-text);
}
.dot.span {
  border-radius: 0.2rem;
  width: 0.9rem;
  left: -1.52rem;
}
.stop.root .dot {
  background: var(--df-text);
}
.when {
  flex-shrink: 0;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--df-text-2);
}
.name {
  text-align: left;
  font-size: 0.875rem;
  font-weight: 700;
}
.name:hover,
.when:hover,
.reroot:hover {
  text-decoration: underline;
}
.stop-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.125rem;
}
.chip {
  font-size: 10px;
  padding: 0 0.375rem;
  border-radius: 9999px;
  border: 1px solid var(--df-border);
  color: var(--df-text-2);
}
.reroot {
  font-size: 11px;
  color: var(--df-muted);
}
.extend {
  width: 100%;
  margin-top: 0.5rem;
  padding: 0.5rem;
  border-radius: 0.75rem;
  background: var(--df-btn);
  font-size: 0.8125rem;
  font-weight: 600;
}
.foot {
  margin-top: 0.75rem;
  font-size: 11px;
  color: var(--df-muted);
}
</style>
