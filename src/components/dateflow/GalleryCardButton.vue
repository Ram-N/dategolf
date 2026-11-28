<template>
  <!-- One gallery card: a journey or a chain of events, with a tiny preview of its items on a time axis -->
  <button class="card" :class="{ today }" @click="emit('click')">
    <span class="kind">{{ today ? "Today's chain" : card.kind === 'journey' ? 'Journey' : 'Chain of events' }}</span>
    <span class="name">{{ card.title }}</span>
    <span class="meta">
      {{ cardYears(card) }} · {{ card.count }} {{ card.kind === 'journey' ? 'stops' : 'steps' }}
    </span>
    <svg class="preview" :width="W" :height="H" :viewBox="`0 0 ${W} ${H}`" aria-hidden="true">
      <line :x1="PAD" :x2="W - PAD" :y1="AXIS" :y2="AXIS" class="axis" />
      <polyline :points="thread" class="thread" />
      <template v-for="(p, i) in placed" :key="i">
        <rect v-if="p.x2 - p.x > 2" :x="p.x" :y="p.y - 2" :width="p.x2 - p.x" height="4" rx="2" class="bar" />
        <circle :cx="p.x" :cy="p.y" r="2.5" class="dot" />
      </template>
    </svg>
    <span class="line">{{ card.line }}</span>
    <span class="chips">
      <span v-for="l in card.lanes" :key="l" class="chip">{{ LANE_LABEL.get(l) }}</span>
    </span>
    <span v-if="status" class="status">{{ status }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { cardYears, type GalleryCard } from '@/engine/dateflow/gallery'
import { LANES } from '@/engine/dateflow/lanes'

const props = defineProps<{ card: GalleryCard; today?: boolean; status?: string }>()
const emit = defineEmits<{ click: [] }>()

const LANE_LABEL = new Map(LANES.map((l) => [l.id, l.label]))

// The preview: the card's own items on a mini time axis, joined in order by a thread
const W = 240
const H = 30
const PAD = 4
const AXIS = H - 4

const placed = computed(() => {
  const { start, end, points } = props.card
  const span = Math.max(end - start, 1)
  const x = (year: number) => PAD + ((year - start) / span) * (W - 2 * PAD)
  // Steps rise left to right, so a thread through items at nearly the same year still reads as a sequence
  const n = points.length
  return points.map((p, i) => ({
    x: x(p.year),
    x2: x(p.endYear ?? p.year),
    y: AXIS - 4 - (n > 1 ? (i / (n - 1)) * (H - 12) : 0),
  }))
})
const thread = computed(() => placed.value.map((p) => `${p.x},${p.y}`).join(' '))
</script>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  text-align: left;
  padding: 0.625rem 0.75rem;
  border-radius: 0.625rem;
  border: 1px solid var(--df-border);
  background: var(--df-surface);
  color: var(--df-text);
}
.card:hover {
  background: var(--df-btn-hover);
}
.card.today {
  border: 2px solid var(--df-text);
}
.kind {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--df-muted);
}
.name {
  font-size: 0.9375rem;
  font-weight: 700;
  line-height: 1.3;
}
.meta {
  font-size: 11px;
  color: var(--df-text-2);
  font-variant-numeric: tabular-nums;
}
.preview {
  max-width: 100%;
  margin: 0.25rem 0;
}
.axis {
  stroke: var(--df-border);
  stroke-width: 1;
}
.thread {
  fill: none;
  stroke: var(--df-text-2);
  stroke-width: 1;
}
.bar {
  fill: var(--df-muted);
  opacity: 0.5;
}
.dot {
  fill: var(--df-text);
}
.line {
  font-size: 12px;
  line-height: 1.4;
  color: var(--df-text-2);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.25rem;
}
.chip {
  font-size: 10px;
  font-weight: 600;
  padding: 0.0625rem 0.375rem;
  border-radius: 999px;
  background: var(--df-btn);
  color: var(--df-text-2);
}
.status {
  margin-top: 0.25rem;
  font-size: 11px;
  font-weight: 700;
}
</style>
