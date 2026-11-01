<template>
  <div ref="containerEl" class="relative w-full h-full overflow-hidden select-none">
    <svg
      v-if="width > 0"
      :width="width"
      :height="height"
      class="block cursor-grab touch-none"
      :class="{ 'cursor-grabbing': dragging }"
      @wheel.prevent="onWheel"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <!-- Grid + axis -->
      <g v-for="t in tickMarks" :key="t.year">
        <line :x1="t.x" :x2="t.x" y1="0" :y2="axisY" :stroke="t.year === 0 ? '#52525b' : '#1f1f23'" />
        <text :x="t.x" :y="axisY + 20" text-anchor="middle" class="fill-zinc-500 text-[11px] tabular-nums">
          {{ t.label }}
        </text>
      </g>
      <line x1="0" :x2="width" :y1="axisY" :y2="axisY" stroke="#3f3f46" stroke-width="2" />

      <!-- Hidden events: faint ticks hint that zooming reveals more -->
      <circle v-for="h in hiddenDots" :key="h.id" :cx="h.x" :cy="axisY" r="1.5" class="fill-zinc-600" />

      <!-- Visible events. Leaders sit in their own layer beneath all labels so a
           tall leader never covers a label in a lower row. -->
      <line
        v-for="m in markers"
        :key="m.event.id"
        :x1="m.x"
        :x2="m.x"
        :y1="axisY"
        :y2="m.labelY + 9"
        :stroke="m.color"
        stroke-opacity="0.35"
        pointer-events="none"
      />
      <circle
        v-for="m in markers"
        :key="m.event.id"
        :cx="m.x"
        :cy="axisY"
        :r="m.radius"
        :fill="m.color"
        class="cursor-pointer"
        @click="onMarkerClick(m.event.id)"
      />
      <g
        v-for="m in markers"
        :key="m.event.id"
        class="cursor-pointer marker"
        :class="{ selected: m.event.id === selectedId }"
        @click="onMarkerClick(m.event.id)"
      >
        <rect
          :x="m.labelX - m.labelWidth / 2"
          :y="m.labelY - 9"
          :width="m.labelWidth"
          height="18"
          rx="4"
          class="label-bg"
        />
        <text :x="m.labelX" :y="m.labelY + 4" text-anchor="middle" class="text-[11px]" :fill="m.textColor">
          {{ m.label }}
        </text>
      </g>
    </svg>

    <div
      v-if="hiddenCount > 0"
      class="absolute top-2 right-3 text-[11px] text-zinc-500 pointer-events-none"
    >
      {{ hiddenCount }} more in view — zoom in to reveal
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { Event } from '@/types'
import { formatTick, span, ticks, xToYear, yearToX, type View } from '@/engine/dateroll/timeScale'
import { layoutLabels, minImportanceForSpan } from '@/engine/dateroll/visibility'

const props = defineProps<{ events: Event[]; view: View; selectedId: string | null }>()
const emit = defineEmits<{ zoomAt: [anchorYear: number, factor: number]; panBy: [deltaYears: number]; select: [id: string] }>()

const ROW_H = 26
const MAX_LABEL_CHARS = 30
const CHAR_W = 6.2 // approx width of an 11px system-ui character

// ── Size ────────────────────────────────────────────────────────────────────
const containerEl = ref<HTMLDivElement | null>(null)
const width = ref(0)
const height = ref(0)
let observer: ResizeObserver | null = null

onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    if (!entry) return
    width.value = entry.contentRect.width
    height.value = entry.contentRect.height
  })
  if (containerEl.value) observer.observe(containerEl.value)
})
onUnmounted(() => observer?.disconnect())

const axisY = computed(() => height.value - 36)
const rows = computed(() => Math.max(2, Math.min(14, Math.floor((axisY.value - 24) / ROW_H))))

// ── Layout ──────────────────────────────────────────────────────────────────
const tickMarks = computed(() =>
  ticks(props.view, width.value).map((year) => ({
    year,
    x: yearToX(year, props.view, width.value),
    label: formatTick(year),
  })),
)

const inView = computed(() =>
  props.events.filter((e) => e.year >= props.view.start && e.year <= props.view.end),
)

function truncate(name: string) {
  return name.length > MAX_LABEL_CHARS ? name.slice(0, MAX_LABEL_CHARS - 1) + '…' : name
}

const markers = computed(() => {
  const minImp = minImportanceForSpan(span(props.view))
  const candidates = inView.value
    .filter((e) => e.importance >= minImp)
    .map((e) => {
      const x = yearToX(e.year, props.view, width.value)
      const label = truncate(e.name)
      const labelWidth = label.length * CHAR_W + 10
      // Keep labels on screen; the dot and leader stay at the true year.
      const labelX = Math.min(Math.max(x, labelWidth / 2 + 2), width.value - labelWidth / 2 - 2)
      return { event: e, x, label, labelWidth, labelX }
    })
  const byId = new Map(candidates.map((c) => [c.event.id, c]))

  const placed = layoutLabels(
    candidates.map((c) => ({
      id: c.event.id,
      x: c.labelX,
      labelWidth: c.labelWidth,
      importance: c.event.importance,
    })),
    rows.value,
  )

  return placed.map((p) => {
    const c = byId.get(p.id)!
    const anchor = c.event.importance >= 7
    return {
      ...c,
      labelY: axisY.value - 22 - p.row * ROW_H,
      radius: 3 + Math.max(0, c.event.importance - 3) * 0.6,
      color: anchor ? '#fbbf24' : '#a1a1aa',
      textColor: anchor ? '#fef3c7' : '#d4d4d8',
    }
  })
})

const hiddenDots = computed(() => {
  const shown = new Set(markers.value.map((m) => m.event.id))
  return inView.value
    .filter((e) => !shown.has(e.id))
    .map((e) => ({ id: e.id, x: yearToX(e.year, props.view, width.value) }))
})
const hiddenCount = computed(() => hiddenDots.value.length)

// ── Wheel: zoom around cursor; horizontal / shift+wheel pans ────────────────
function localX(clientX: number) {
  return clientX - (containerEl.value?.getBoundingClientRect().left ?? 0)
}

function onWheel(e: WheelEvent) {
  const scale = e.deltaMode === 1 ? 16 : 1 // Firefox reports lines
  const dx = (e.shiftKey ? e.deltaY : e.deltaX) * scale
  const dy = e.shiftKey ? 0 : e.deltaY * scale
  if (Math.abs(dx) > Math.abs(dy)) {
    emit('panBy', (dx / width.value) * span(props.view))
  } else if (dy !== 0) {
    emit('zoomAt', xToYear(localX(e.clientX), props.view, width.value), Math.exp(dy * 0.002))
  }
}

// ── Drag to pan (mouse + touch). Capture only once a drag starts so clicks still reach markers.
const DRAG_THRESHOLD = 4
const dragging = ref(false)
let downX: number | null = null
let lastX = 0
let justDragged = false

function onPointerDown(e: PointerEvent) {
  downX = e.clientX
  lastX = e.clientX
  justDragged = false
}

function onPointerMove(e: PointerEvent) {
  if (downX === null) return
  if (!dragging.value && Math.abs(e.clientX - downX) > DRAG_THRESHOLD) {
    dragging.value = true
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }
  if (dragging.value) {
    emit('panBy', (-(e.clientX - lastX) / width.value) * span(props.view))
    lastX = e.clientX
  }
}

function onPointerUp(e: PointerEvent) {
  if (dragging.value) {
    justDragged = true
    ;(e.currentTarget as Element).releasePointerCapture(e.pointerId)
  }
  dragging.value = false
  downX = null
}

function onMarkerClick(id: string) {
  if (justDragged) return
  emit('select', id)
}
</script>

<style scoped>
.label-bg {
  fill: #18181b;
  stroke: #3f3f46;
}
.marker:hover .label-bg,
.marker.selected .label-bg {
  stroke: #fbbf24;
}
</style>
