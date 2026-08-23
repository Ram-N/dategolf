<template>
  <div class="w-full bg-gray-900/60 rounded-2xl border border-gray-800 px-3 py-4">
    <p class="text-[10px] uppercase tracking-widest text-gray-600 mb-3 text-center">Timeline</p>

    <div ref="scrollEl" class="timeline-scroll overflow-x-scroll">
      <div class="relative" :style="{ width: containerWidth + 'px', height: CONTAINER_H + 'px' }">

        <!-- Track -->
        <div
          class="absolute bg-gray-700 rounded-full"
          :style="{ left: PADDING + 'px', top: LINE_Y + 'px', width: trackWidth + 'px', height: '2px' }"
        />

        <!-- Render each marker -->
        <template v-for="m in markers" :key="m.id">

          <!-- Target: dashed stem from top of container down to the line -->
          <div
            v-if="m.type === 'target'"
            class="absolute border-l-2 border-dashed"
            :style="{
              left: m.x + 'px',
              top: '2px',
              height: (LINE_Y - 2) + 'px',
              borderColor: '#ca8a04',
            }"
          />

          <!-- Above-line label zone (target label + alt/notable labels) -->
          <template v-if="m.labelSide === 'above'">
            <!-- "TARGET" badge -->
            <div
              v-if="m.type === 'target'"
              class="absolute text-center"
              :style="{ left: (m.x - 30) + 'px', top: '2px', width: '60px' }"
            >
              <span class="text-[10px] font-bold uppercase tracking-widest text-yellow-500">Target</span>
            </div>

            <!-- Alt/notable: name closer to line, year right above dot -->
            <div
              v-else
              class="absolute text-center leading-tight"
              :style="{
                left: (m.x - 44) + 'px',
                top: (LINE_Y - m.r - 38) + 'px',
                width: '88px',
                fontSize: '9px',
                color: m.type === 'notable' ? '#4b5563' : '#6b7280',
              }"
            >{{ m.name }}</div>
            <div
              v-if="m.type !== 'target'"
              class="absolute text-center font-semibold tabular-nums"
              :style="{
                left: (m.x - 30) + 'px',
                top: (LINE_Y - m.r - 20) + 'px',
                width: '60px',
                fontSize: '10px',
                color: m.labelColor,
              }"
            >{{ m.year }}</div>
            <!-- small downward tick -->
            <div
              v-if="m.type !== 'target'"
              class="absolute"
              :style="{
                left: m.x + 'px',
                top: (LINE_Y - m.r - 4) + 'px',
                height: '4px',
                width: '1px',
                backgroundColor: m.color,
              }"
            />
          </template>

          <!-- Dot on track -->
          <div
            class="absolute rounded-full z-10"
            :style="{
              left: (m.x - m.r) + 'px',
              top: (LINE_Y - m.r) + 'px',
              width: (m.r * 2) + 'px',
              height: (m.r * 2) + 'px',
              backgroundColor: m.color,
              boxShadow: (m.type === 'player' || m.type === 'target') ? `0 0 10px ${m.color}99` : 'none',
              opacity: m.type === 'notable' ? 0.5 : 1,
            }"
          />

          <!-- Below-line label zone (player + target year) -->
          <template v-if="m.labelSide === 'below'">
            <!-- "You" indicator above dot for player -->
            <div
              v-if="m.type === 'player'"
              class="absolute text-center"
              :style="{ left: (m.x - 20) + 'px', top: (LINE_Y - 26) + 'px', width: '40px' }"
            >
              <div class="text-[10px] font-bold uppercase tracking-wider" :style="{ color: m.color }">You</div>
              <div class="text-[9px]" :style="{ color: m.color }">▼</div>
            </div>

            <!-- Year label below dot -->
            <div
              class="absolute text-center font-semibold tabular-nums"
              :style="{
                left: (m.x - 30) + 'px',
                top: (LINE_Y + m.r + 5) + 'px',
                width: '60px',
                fontSize: '11px',
                color: m.labelColor,
              }"
            >{{ m.year }}</div>

            <!-- Name label below year (player only — target year label is enough) -->
            <div
              v-if="m.type === 'player'"
              class="absolute text-center leading-tight"
              :style="{
                left: (m.x - 44) + 'px',
                top: (LINE_Y + m.r + 20) + 'px',
                width: '88px',
                fontSize: '9px',
                color: '#9ca3af',
              }"
            >{{ m.name }}</div>
          </template>

        </template>

      </div>
    </div>

    <!-- Legend -->
    <div class="flex flex-wrap justify-center gap-3 mt-3 text-[10px] text-gray-600">
      <span class="flex items-center gap-1">
        <span class="inline-block w-2 h-2 rounded-full bg-yellow-500" /> Target
      </span>
      <span class="flex items-center gap-1">
        <span class="inline-block w-2 h-2 rounded-full" :style="{ backgroundColor: playerColor }" /> Your pick
      </span>
      <span v-if="hasAlts" class="flex items-center gap-1">
        <span class="inline-block w-2 h-2 rounded-full bg-green-500" /> Better option
      </span>
      <span v-if="hasNotable" class="flex items-center gap-1 opacity-60">
        <span class="inline-block w-2 h-2 rounded-full bg-gray-500" /> Notable nearby
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import type { HoleResult, Event } from '@/types'

const props = defineProps<{
  result: HoleResult
  events?: Event[]
}>()

const scrollEl = ref<HTMLElement | null>(null)

const PADDING = 72
const LINE_Y = 72
const CONTAINER_H = 156

function formatYear(y: number) {
  return y < 0 ? `${Math.abs(y)} BCE` : String(y)
}

function penaltyColor(penalty: number): string {
  if (penalty <= 20) return '#22c55e'
  if (penalty <= 75) return '#f59e0b'
  return '#ef4444'
}

const playerColor = computed(() => penaltyColor(props.result.penalty))

// Notable nearby events for bad guesses (penalty > 75, difficulty easy, importance >= 4)
const notableNearby = computed(() => {
  if (!props.events || props.result.penalty <= 75) return []
  const target = props.result.targetYear
  const usedYears = new Set([
    props.result.eventYear,
    ...props.result.betterAlternatives.map(a => a.eventYear),
  ])
  return props.events
    .filter(e =>
      e.year !== props.result.eventYear &&
      !usedYears.has(e.year) &&
      (e.difficulty === 'easy' || e.importance >= 4) &&
      Math.abs(e.year - target) <= 200,
    )
    .sort((a, b) => Math.abs(a.year - target) - Math.abs(b.year - target))
    .slice(0, 2)
})

const hasAlts = computed(() => props.result.betterAlternatives.length > 0)
const hasNotable = computed(() => notableNearby.value.length > 0)

// All years that must fit on the timeline
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
  if (yearSpan.value <= 20) return 18
  if (yearSpan.value <= 50) return 10
  if (yearSpan.value <= 150) return 5
  if (yearSpan.value <= 400) return 2.5
  return 1.2
})

const trackWidth = computed(() => Math.max(yearSpan.value * pxPerYear.value, 480))
const containerWidth = computed(() => trackWidth.value + PADDING * 2)

function yearToX(year: number): number {
  return PADDING + ((year - minYear.value) / yearSpan.value) * trackWidth.value
}

type Marker = {
  id: string; type: string; x: number; year: string; name: string;
  r: number; color: string; labelColor: string; labelSide: 'above' | 'below';
}

const markers = computed<Marker[]>(() => {
  const list: Marker[] = []

  // Notable nearby (gray, above line, rendered first = below other dots)
  for (const e of notableNearby.value) {
    list.push({
      id: 'notable-' + e.id,
      type: 'notable',
      x: yearToX(e.year),
      year: formatYear(e.year),
      name: e.name,
      r: 4,
      color: '#6b7280',
      labelColor: '#4b5563',
      labelSide: 'above',
    })
  }

  // Better alternatives (green, above line)
  for (const alt of props.result.betterAlternatives.slice(0, 2)) {
    list.push({
      id: alt.eventId,
      type: 'alt',
      x: yearToX(alt.eventYear),
      year: formatYear(alt.eventYear),
      name: alt.eventName,
      r: 5,
      color: '#22c55e',
      labelColor: '#4ade80',
      labelSide: 'above',
    })
  }

  // Player (colored, below line)
  const pc = playerColor.value
  list.push({
    id: 'player',
    type: 'player',
    x: yearToX(props.result.eventYear),
    year: formatYear(props.result.eventYear),
    name: props.result.eventName,
    r: 8,
    color: pc,
    labelColor: pc,
    labelSide: 'below',
  })

  // Target (yellow, above line with dashed stem, year label below)
  list.push({
    id: 'target',
    type: 'target',
    x: yearToX(props.result.targetYear),
    year: formatYear(props.result.targetYear),
    name: '',
    r: 7,
    color: '#eab308',
    labelColor: '#facc15',
    labelSide: 'below',
  })

  return list
})

// Auto-scroll to center midpoint of target and player
function scrollToCenter() {
  if (!scrollEl.value) return
  const targetX = yearToX(props.result.targetYear)
  const playerX = yearToX(props.result.eventYear)
  const midX = (targetX + playerX) / 2
  const viewWidth = scrollEl.value.clientWidth
  scrollEl.value.scrollLeft = midX - viewWidth / 2
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
</style>
