<template>
  <div class="w-full bg-gray-900/60 rounded-2xl border border-gray-800 px-3 py-4">
    <p class="text-[10px] uppercase tracking-widest text-gray-600 mb-2 text-center">Timeline</p>

    <div ref="scrollEl" class="timeline-scroll overflow-x-scroll">
      <div class="relative" :style="{ width: containerWidth + 'px', height: CONTAINER_H + 'px' }">

        <!-- Track line -->
        <div
          class="absolute bg-gray-700 rounded-full"
          :style="{ left: PADDING + 'px', top: LINE_Y + 'px', width: trackWidth + 'px', height: '2px' }"
        />

        <template v-for="m in renderedMarkers" :key="m.id">

          <!-- Target: dashed vertical stem from top to dot -->
          <div
            v-if="m.type === 'target'"
            class="absolute border-l-2 border-dashed"
            :style="{ left: m.x + 'px', top: '18px', height: (LINE_Y - 18) + 'px', borderColor: '#ca8a04' }"
          />

          <!-- Alt/notable: thin connector from label bottom down to dot -->
          <div
            v-if="m.labelSide === 'above' && m.type !== 'target'"
            class="absolute"
            :style="{
              left: m.x + 'px',
              top: connectorTop(m) + 'px',
              height: (LINE_Y - connectorTop(m) - m.r) + 'px',
              width: '1px',
              backgroundColor: m.color,
              opacity: '0.4',
            }"
          />

          <!-- Dot (all types: always sits on the track line) -->
          <div
            class="absolute rounded-full z-10"
            :style="{
              left: (m.x - m.r) + 'px',
              top: (LINE_Y - m.r) + 'px',
              width: (m.r * 2) + 'px',
              height: (m.r * 2) + 'px',
              backgroundColor: m.color,
              boxShadow: (m.type === 'player' || m.type === 'target') ? `0 0 10px ${m.color}88` : 'none',
              opacity: m.type === 'notable' ? 0.45 : 1,
            }"
          />

          <!-- TARGET badge (above the dashed stem) -->
          <div
            v-if="m.type === 'target'"
            class="absolute text-center"
            :style="{ left: (m.x - 28) + 'px', top: '2px', width: '56px' }"
          >
            <span style="font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#eab308;">Target</span>
          </div>

          <!-- Alt / notable: floating label above the line at assigned row -->
          <template v-if="m.labelSide === 'above' && m.type !== 'target'">
            <div
              class="absolute text-center leading-snug label-name"
              :style="{
                left: (m.x - 50) + 'px',
                top: rowNameY(m) + 'px',
                width: '100px',
                fontSize: '11px',
                color: m.type === 'notable' ? '#4b5563' : '#d1d5db',
              }"
            >{{ m.name }}</div>
            <div
              class="absolute text-center font-bold tabular-nums"
              :style="{
                left: (m.x - 28) + 'px',
                top: rowYearY(m) + 'px',
                width: '56px',
                fontSize: '12px',
                color: m.labelColor,
              }"
            >{{ m.year }}</div>
          </template>

          <!-- Player: "You ▼" above dot -->
          <div
            v-if="m.type === 'player'"
            class="absolute text-center"
            :style="{ left: (m.x - 22) + 'px', top: (LINE_Y - 28) + 'px', width: '44px' }"
          >
            <div style="font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;" :style="{ color: m.color }">You</div>
            <div style="font-size:9px;line-height:1;" :style="{ color: m.color }">▼</div>
          </div>

          <!-- Below-line: year for player and target -->
          <div
            v-if="m.labelSide === 'below'"
            class="absolute text-center font-bold tabular-nums"
            :style="{
              left: (m.x - 32) + 'px',
              top: (LINE_Y + m.r + 6) + 'px',
              width: '64px',
              fontSize: '13px',
              color: m.labelColor,
            }"
          >{{ m.year }}</div>

          <!-- Below-line: event name for player -->
          <div
            v-if="m.type === 'player'"
            class="absolute text-center leading-snug"
            :style="{
              left: (m.x - 50) + 'px',
              top: (LINE_Y + m.r + 24) + 'px',
              width: '100px',
              fontSize: '11px',
              color: '#9ca3af',
            }"
          >{{ m.name }}</div>

        </template>
      </div>
    </div>

    <!-- Legend -->
    <div class="flex flex-wrap justify-center gap-4 mt-3" style="font-size:11px;color:#6b7280;">
      <span class="flex items-center gap-1.5">
        <span class="inline-block w-2.5 h-2.5 rounded-full bg-yellow-500" /> Target
      </span>
      <span class="flex items-center gap-1.5">
        <span class="inline-block w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: playerColor }" /> Your pick
      </span>
      <span v-if="hasAlts" class="flex items-center gap-1.5">
        <span class="inline-block w-2.5 h-2.5 rounded-full bg-green-500" /> Better option
      </span>
      <span v-if="hasNotable" class="flex items-center gap-1.5 opacity-60">
        <span class="inline-block w-2.5 h-2.5 rounded-full bg-gray-500" /> Notable nearby
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch, nextTick } from 'vue'
import type { HoleResult, Event } from '@/types'

const props = defineProps<{
  result: HoleResult
  events?: Event[]
}>()

const scrollEl = ref<HTMLElement | null>(null)

// ── Layout constants ────────────────────────────────────────────────────────
const PADDING = 72
const ROW_H = 44       // height per label row above the line
const LABEL_H = 32     // name rows (up to 2 lines) + year

// ── Data helpers ────────────────────────────────────────────────────────────
function formatYear(y: number) {
  return y < 0 ? `${Math.abs(y)} BCE` : String(y)
}

function penaltyColor(p: number): string {
  if (p <= 20) return '#22c55e'
  if (p <= 75) return '#f59e0b'
  return '#ef4444'
}

const playerColor = computed(() => penaltyColor(props.result.penalty))

// ── Notable nearby events (for bad guesses) ─────────────────────────────────
const notableNearby = computed(() => {
  if (!props.events || props.result.penalty <= 75) return []
  const target = props.result.targetYear
  const usedYears = new Set([
    props.result.eventYear,
    ...props.result.betterAlternatives.map(a => a.eventYear),
  ])
  return props.events
    .filter(e =>
      !usedYears.has(e.year) &&
      (e.difficulty === 'easy' || e.importance >= 4) &&
      Math.abs(e.year - target) <= 200,
    )
    .sort((a, b) => Math.abs(a.year - target) - Math.abs(b.year - target))
    .slice(0, 2)
})

const hasAlts = computed(() => props.result.betterAlternatives.length > 0)
const hasNotable = computed(() => notableNearby.value.length > 0)

// ── Year → pixel mapping ────────────────────────────────────────────────────
const allYears = computed(() => [
  props.result.targetYear,
  props.result.eventYear,
  ...props.result.betterAlternatives.slice(0, 2).map(a => a.eventYear),
  ...notableNearby.value.map(e => e.year),
])

const minYear = computed(() => Math.min(...allYears.value))
const maxYear = computed(() => Math.max(...allYears.value))
const yearSpan = computed(() => Math.max(maxYear.value - minYear.value, 10))

const pxPerYear = computed(() => {
  if (yearSpan.value <= 20)  return 18
  if (yearSpan.value <= 50)  return 10
  if (yearSpan.value <= 150) return 5
  if (yearSpan.value <= 400) return 2.5
  return 1.2
})

const trackWidth = computed(() => Math.max(yearSpan.value * pxPerYear.value, 200))
const containerWidth = computed(() => trackWidth.value + PADDING * 2)

function yearToX(year: number): number {
  return PADDING + ((year - minYear.value) / yearSpan.value) * trackWidth.value
}

// ── Row assignment: greedy, sorted by x ──────────────────────────────────────
// Labels are 100px wide centered on x, so minimum gap between centers is 100px.
type BaseMarker = {
  id: string; type: string; x: number; year: string; name: string;
  r: number; color: string; labelColor: string; labelSide: 'above' | 'below';
}
type RenderedMarker = BaseMarker & { row: number }

function assignRows(markers: BaseMarker[]): RenderedMarker[] {
  const sorted = [...markers].sort((a, b) => a.x - b.x)
  const rowLastX = new Map<number, number>()
  return sorted.map(m => {
    let row = 0
    while ((rowLastX.get(row) ?? -Infinity) + 100 > m.x) row++
    rowLastX.set(row, m.x)
    return { ...m, row }
  })
}

// ── Build above markers and assign rows ──────────────────────────────────────
const aboveMarkers = computed<RenderedMarker[]>(() => {
  const above: BaseMarker[] = []

  for (const e of notableNearby.value) {
    above.push({
      id: 'notable-' + e.id, type: 'notable',
      x: yearToX(e.year), year: formatYear(e.year), name: e.name,
      r: 4, color: '#6b7280', labelColor: '#4b5563', labelSide: 'above',
    })
  }

  for (const alt of props.result.betterAlternatives.slice(0, 2)) {
    above.push({
      id: alt.eventId, type: 'alt',
      x: yearToX(alt.eventYear), year: formatYear(alt.eventYear), name: alt.eventName,
      r: 5, color: '#22c55e', labelColor: '#4ade80', labelSide: 'above',
    })
  }

  return assignRows(above)
})

// ── Dynamic LINE_Y: grows with the number of label rows needed ───────────────
// 36px reserved at top for the TARGET badge; each row adds ROW_H px.
const maxRow = computed(() =>
  aboveMarkers.value.reduce((max, m) => Math.max(max, m.row), -1)
)

const LINE_Y = computed(() =>
  Math.max(76, 36 + (maxRow.value + 1) * ROW_H)
)

// Below the line: dot (8px) + gap (6px) + year text (~16px) + name text (~28px) = ~58px
const CONTAINER_H = computed(() => LINE_Y.value + 72)

// ── All rendered markers ──────────────────────────────────────────────────────
const renderedMarkers = computed<RenderedMarker[]>(() => {
  const pc = playerColor.value
  const below: RenderedMarker[] = [
    {
      id: 'player', type: 'player',
      x: yearToX(props.result.eventYear),
      year: formatYear(props.result.eventYear),
      name: props.result.eventName,
      r: 8, color: pc, labelColor: pc, labelSide: 'below', row: 0,
    },
    {
      id: 'target', type: 'target',
      x: yearToX(props.result.targetYear),
      year: formatYear(props.result.targetYear),
      name: '', r: 7, color: '#eab308', labelColor: '#facc15',
      labelSide: 'below', row: 0,
    },
  ]

  return [...aboveMarkers.value, ...below]
})

// ── Row → y helpers ──────────────────────────────────────────────────────────
function rowNameY(m: RenderedMarker): number {
  return LINE_Y.value - (m.row + 1) * ROW_H
}

function rowYearY(m: RenderedMarker): number {
  return rowNameY(m) + 16
}

function connectorTop(m: RenderedMarker): number {
  return rowNameY(m) + LABEL_H
}

// ── Auto-scroll: show both player and target if they fit; otherwise keep
// the leftmost marker visible (≥80px from left edge) and let the user scroll.
function scrollToCenter() {
  nextTick(() => {
    requestAnimationFrame(() => {
      if (!scrollEl.value) return
      const viewWidth = scrollEl.value.clientWidth
      if (viewWidth === 0) return
      const tx = yearToX(props.result.targetYear)
      const px = yearToX(props.result.eventYear)
      const centered = (tx + px) / 2 - viewWidth / 2
      const leftmost = Math.min(tx, px)
      // Don't scroll so far right that the leftmost marker disappears off-screen
      scrollEl.value.scrollLeft = Math.max(0, Math.min(centered, leftmost - 80))
    })
  })
}

onMounted(scrollToCenter)
watch(() => props.result, scrollToCenter)
</script>

<style scoped>
.timeline-scroll {
  scrollbar-width: thin;
  scrollbar-color: #4b5563 #1f2937;
}
.timeline-scroll::-webkit-scrollbar {
  height: 6px;
}
.timeline-scroll::-webkit-scrollbar-track {
  background: #1f2937;
  border-radius: 3px;
}
.timeline-scroll::-webkit-scrollbar-thumb {
  background: #4b5563;
  border-radius: 3px;
}
.label-name {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
