<template>
  <div ref="containerEl" class="relative w-full select-none minimap" :style="{ height: HEIGHT + 'px' }">
    <svg
      v-if="width > 0"
      :width="width"
      :height="HEIGHT"
      class="block touch-none"
      :class="dragging ? 'cursor-grabbing' : 'cursor-pointer'"
      role="slider"
      aria-label="History overview — click or drag to move the timeline"
      :aria-valuemin="FULL_VIEW.start"
      :aria-valuemax="FULL_VIEW.end"
      :aria-valuenow="Math.round(viewCenter)"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <!-- Density histogram: events per slice of time (sqrt scale so sparse eras stay visible) -->
      <rect
        v-for="b in bars"
        :key="b.x"
        :x="b.x"
        :y="BAR_BASE - b.h"
        :width="b.w"
        :height="b.h"
        rx="1"
        class="bar"
      >
        <title>{{ b.tooltip }}</title>
      </rect>
      <line x1="0" :x2="width" :y1="BAR_BASE" :y2="BAR_BASE" class="baseline" />

      <text v-for="t in tickMarks" :key="t.year" :x="t.x" :y="HEIGHT - 3" :text-anchor="t.anchor" class="tick">
        {{ t.label }}
      </text>

      <!-- Dim everything outside the current view, then outline the view -->
      <rect x="0" y="0" :width="box.x" :height="BAR_BASE" class="dim" pointer-events="none" />
      <rect
        :x="box.x + box.w"
        y="0"
        :width="Math.max(0, width - box.x - box.w)"
        :height="BAR_BASE"
        class="dim"
        pointer-events="none"
      />
      <rect :x="box.x" y="1" :width="box.w" :height="BAR_BASE - 1" rx="2" class="viewport" pointer-events="none" />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { FULL_VIEW, formatTick, xToYear, yearToX, type View } from '@/engine/dateroll/timeScale'
import { densityBins } from '@/engine/dateroll/density'
import { formatYear } from '@/utils/formatYear'

const props = defineProps<{ years: number[]; view: View }>()
const emit = defineEmits<{ centerAt: [year: number] }>()

const HEIGHT = 46
const BAR_BASE = 32 // bars grow up from here; tick labels sit below
const BAR_PX = 5 // target width of one histogram bar
const MIN_BOX_PX = 8 // keep the view box grabbable when zoomed far in
const TICK_YEARS = [-3000, -2000, -1000, 0, 1000, 2000]

// ── Size ────────────────────────────────────────────────────────────────────
const containerEl = ref<HTMLDivElement | null>(null)
const width = ref(0)
let observer: ResizeObserver | null = null

onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    if (entry) width.value = entry.contentRect.width
  })
  if (containerEl.value) observer.observe(containerEl.value)
})
onUnmounted(() => observer?.disconnect())

const toX = (year: number) => yearToX(year, FULL_VIEW, width.value)

// ── Histogram ───────────────────────────────────────────────────────────────
const bars = computed(() => {
  const count = Math.max(1, Math.floor(width.value / BAR_PX))
  const bins = densityBins(props.years, FULL_VIEW.start, FULL_VIEW.end, count)
  const max = Math.sqrt(Math.max(1, ...bins.map((b) => b.count)))
  const barW = width.value / count
  return bins
    .filter((b) => b.count > 0)
    .map((b) => ({
      x: toX(b.start) + 0.5,
      w: Math.max(1, barW - 1), // 1px gap between bars
      h: Math.max(2, (Math.sqrt(b.count) / max) * (BAR_BASE - 6)),
      tooltip: `${formatYear(Math.round(b.start))} – ${formatYear(Math.round(b.end))}: ${b.count} event${b.count === 1 ? '' : 's'}`,
    }))
})

const tickMarks = computed(() =>
  TICK_YEARS.map((year) => {
    const x = toX(year)
    // Edge labels hug the edge instead of being clipped.
    const anchor = x < 24 ? 'start' : x > width.value - 24 ? 'end' : 'middle'
    return { year, x, label: formatTick(year), anchor }
  }),
)

// ── Viewport box ────────────────────────────────────────────────────────────
const viewCenter = computed(() => (props.view.start + props.view.end) / 2)

const box = computed(() => {
  const x1 = toX(props.view.start)
  const x2 = toX(props.view.end)
  const w = Math.max(MIN_BOX_PX, x2 - x1)
  return { x: Math.min(Math.max(0, (x1 + x2) / 2 - w / 2), width.value - w), w }
})

// ── Click to jump, drag to scrub. Grabbing inside the box keeps its offset so it doesn't jump.
const dragging = ref(false)
let grabOffsetYears = 0

function yearAt(e: PointerEvent) {
  const left = containerEl.value?.getBoundingClientRect().left ?? 0
  return xToYear(e.clientX - left, FULL_VIEW, width.value)
}

function onPointerDown(e: PointerEvent) {
  const year = yearAt(e)
  const x = toX(year)
  const insideBox = x >= box.value.x && x <= box.value.x + box.value.w
  grabOffsetYears = insideBox ? year - viewCenter.value : 0
  dragging.value = true
  ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  if (!insideBox) emit('centerAt', year)
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value) return
  emit('centerAt', yearAt(e) - grabOffsetYears)
}

function onPointerUp(e: PointerEvent) {
  if (!dragging.value) return
  dragging.value = false
  ;(e.currentTarget as Element).releasePointerCapture(e.pointerId)
}
</script>

<style scoped>
.minimap {
  border-bottom: 1px solid var(--dr-border-soft);
}
.bar {
  fill: var(--dr-text-2);
  opacity: 0.55;
}
.baseline {
  stroke: var(--dr-border);
}
.tick {
  fill: var(--dr-muted);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}
.dim {
  fill: var(--dr-bg);
  opacity: 0.55;
}
.viewport {
  fill: none;
  stroke: var(--dr-text);
  stroke-width: 1.5;
}
</style>
