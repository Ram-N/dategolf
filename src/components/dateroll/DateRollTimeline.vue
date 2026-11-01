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
      <!-- Era bands: alternating faint fills, name pinned to the visible part of the band -->
      <g v-for="era in eraBands" :key="era.id">
        <rect v-if="era.shaded" :x="era.x1" y="0" :width="era.x2 - era.x1" :height="height" fill="var(--dr-era)" />
        <text v-if="era.showLabel" :x="era.labelX" y="20" class="era-label">{{ era.name }}</text>
      </g>

      <!-- Grid -->
      <line
        v-for="t in tickMarks"
        :key="t.year"
        :x1="t.x"
        :x2="t.x"
        y1="0"
        :y2="height"
        :stroke="t.year === 0 ? 'var(--dr-axis)' : 'var(--dr-grid)'"
      />

      <!-- Milestone section lines: a few turning points cut the roll into natural sections -->
      <line
        v-for="ms in milestoneLines"
        :key="ms.id"
        :x1="ms.x"
        :x2="ms.x"
        y1="0"
        :y2="height"
        class="milestone-line"
        pointer-events="none"
      />

      <!-- Leaders (dot → label, angled when the label is shifted sideways) sit beneath all labels -->
      <line
        v-for="m in markers"
        :key="m.event.id"
        :x1="m.x"
        :x2="m.leaderX"
        :y1="axisY"
        :y2="m.leaderEnd"
        :stroke="`var(--dr-${m.group})`"
        stroke-opacity="0.55"
        pointer-events="none"
      />

      <!-- Axis + tick labels -->
      <line x1="0" :x2="width" :y1="axisY" :y2="axisY" stroke="var(--dr-axis)" stroke-width="2" />
      <text
        v-for="t in tickMarks"
        :key="t.year"
        :x="t.x"
        :y="axisY + 16"
        text-anchor="middle"
        class="tick-label"
      >
        {{ t.label }}
      </text>

      <!-- Hidden events: faint dots hint that zooming reveals more -->
      <circle v-for="h in hiddenDots" :key="h.id" :cx="h.x" :cy="axisY" r="2" class="hidden-dot" />

      <!-- Visible events -->
      <circle
        v-for="m in markers"
        :key="m.event.id"
        :cx="m.x"
        :cy="axisY"
        :r="m.radius"
        :fill="`var(--dr-${m.group})`"
        :stroke="m.event.id === selectedId ? 'var(--dr-text)' : 'var(--dr-bg)'"
        stroke-width="2"
        class="cursor-pointer"
        @click="onMarkerClick(m.event.id)"
      >
        <title>{{ m.tooltip }}</title>
      </circle>
      <g
        v-for="m in markers"
        :key="m.event.id"
        class="cursor-pointer marker"
        :class="{ selected: m.event.id === selectedId }"
        @click="onMarkerClick(m.event.id)"
      >
        <title>{{ m.tooltip }}</title>
        <rect
          :x="m.labelX - m.labelWidth / 2"
          :y="m.boxTop"
          :width="m.labelWidth"
          :height="m.boxH"
          rx="4"
          class="label-bg"
        />
        <text text-anchor="middle" class="label-text" :class="{ anchor: m.bold }">
          <tspan
            v-for="(line, i) in m.lines"
            :key="i"
            :x="m.labelX"
            :y="m.boxTop + BOX_PAD + 10 + i * LINE_H"
          >{{ line }}</tspan>
        </text>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { Event } from '@/types'
import erasData from '@/data/eras.json'
import milestoneIds from '@/data/milestones.json'
import { formatTick, span, ticks, xToYear, yearToX, type View } from '@/engine/dateroll/timeScale'
import {
  layoutLabels,
  minImportanceForSpan,
  spaceMilestones,
  wrapLabel,
  type Side,
} from '@/engine/dateroll/visibility'
import { groupFor } from '@/engine/dateroll/categoryGroups'
import { formatYear } from '@/utils/formatYear'

const props = defineProps<{ events: Event[]; view: View; selectedId: string | null }>()
const emit = defineEmits<{
  zoomAt: [anchorYear: number, factor: number]
  panBy: [deltaYears: number]
  select: [id: string]
}>()

// Label geometry. Vertical space on each side of the axis is cut into LEVEL_H levels;
// an n-line label takes n + 1 levels, leaving a constant gap between stacked labels.
const LEVEL_H = 13
const LINE_H = 13
const BOX_PAD = 3
const LINE_CHARS = 20
const MAX_LINES = 3
const CHAR_W = 6.2 // approx width of an 11px system-ui character
const CHAR_W_BOLD = 6.8
const ANCHOR_IMPORTANCE = 7
const TICK_SPACE = 24 // room under the axis reserved for tick labels
const TOP_SPACE = 30 // room at the top for era names
const AXIS_GAP = 10 // gap between the axis and the nearest label above it
const MILESTONE_GAP_PX = 48
const MILESTONE_PRIORITY = 100 // milestones claim label space before everything else

const MILESTONE_RANK = new Map((milestoneIds as string[]).map((id, i) => [id, i]))

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

// Axis runs through the middle; labels fill outward above and below it.
const axisY = computed(() => Math.round(height.value / 2))
const levelsPerSide = computed(() => {
  const above = axisY.value - AXIS_GAP - TOP_SPACE
  const below = height.value - axisY.value - TICK_SPACE - 6
  return Math.max(2, Math.floor(Math.min(above, below) / LEVEL_H))
})

function boxPosition(side: Side, level: number, boxH: number) {
  if (side === 'above') {
    const bottom = axisY.value - AXIS_GAP - level * LEVEL_H
    return { boxTop: bottom - boxH, leaderEnd: bottom }
  }
  const top = axisY.value + TICK_SPACE + level * LEVEL_H
  return { boxTop: top, leaderEnd: top }
}

// ── Layout ──────────────────────────────────────────────────────────────────
const tickMarks = computed(() =>
  ticks(props.view, width.value).map((year) => ({
    year,
    x: yearToX(year, props.view, width.value),
    label: formatTick(year),
  })),
)

const eraBands = computed(() =>
  erasData
    .map((era, i) => {
      const x1 = Math.max(0, yearToX(era.start, props.view, width.value))
      const x2 = Math.min(width.value, yearToX(era.end, props.view, width.value))
      return {
        ...era,
        x1,
        x2,
        shaded: i % 2 === 0,
        labelX: x1 + 8,
        showLabel: x2 - x1 > era.name.length * 8.5 + 16, // uppercase + letter-spacing runs wide
      }
    })
    .filter((era) => era.x2 > era.x1),
)

const inView = computed(() =>
  props.events.filter((e) => e.year >= props.view.start && e.year <= props.view.end),
)

// Section lines for the milestones in view, thinned so wide zooms stay uncluttered.
const milestoneLines = computed(() => {
  const ranked = inView.value
    .filter((e) => MILESTONE_RANK.has(e.id))
    .sort((a, b) => MILESTONE_RANK.get(a.id)! - MILESTONE_RANK.get(b.id)!)
    .map((e) => ({ id: e.id, x: yearToX(e.year, props.view, width.value) }))
  return spaceMilestones(ranked, MILESTONE_GAP_PX)
})

const markers = computed(() => {
  const minImp = minImportanceForSpan(span(props.view))
  const sectionIds = new Set(milestoneLines.value.map((m) => m.id))
  const candidates = inView.value
    .filter((e) => e.importance >= minImp || sectionIds.has(e.id))
    .map((e) => {
      const x = yearToX(e.year, props.view, width.value)
      const bold = e.importance >= ANCHOR_IMPORTANCE || sectionIds.has(e.id)
      const lines = wrapLabel(e.name, LINE_CHARS, MAX_LINES)
      const longest = Math.max(...lines.map((l) => l.length))
      const labelWidth = longest * (bold ? CHAR_W_BOLD : CHAR_W) + 12
      const boxH = lines.length * LINE_H + BOX_PAD * 2
      const priority = sectionIds.has(e.id) ? MILESTONE_PRIORITY : e.importance
      return { event: e, x, lines, labelWidth, boxH, bold, priority }
    })
  const byId = new Map(candidates.map((c) => [c.event.id, c]))

  const placed = layoutLabels(
    candidates.map((c) => ({
      id: c.event.id,
      dotX: c.x,
      labelWidth: c.labelWidth,
      boxH: c.boxH,
      levels: c.lines.length + 1,
      priority: c.priority,
    })),
    {
      width: width.value,
      levelsPerSide: levelsPerSide.value,
      levelH: LEVEL_H,
      axisGap: { above: AXIS_GAP, below: TICK_SPACE },
    },
  )

  return placed.map((p) => {
    const c = byId.get(p.id)!
    return {
      ...c,
      labelX: p.labelX,
      leaderX: p.leaderX,
      ...boxPosition(p.side, p.level, c.boxH),
      group: groupFor(c.event.categories),
      radius: 4 + Math.max(0, c.event.importance - 4) * 0.6,
      // Year first: the event is what students are learning to place.
      tooltip: `${formatYear(c.event.year)} — ${c.event.name}`,
    }
  })
})

const hiddenDots = computed(() => {
  const shown = new Set(markers.value.map((m) => m.event.id))
  return inView.value
    .filter((e) => !shown.has(e.id))
    .map((e) => ({ id: e.id, x: yearToX(e.year, props.view, width.value) }))
})

defineExpose({ hiddenCount: computed(() => hiddenDots.value.length) })

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

// ── Drag to pan; two-finger pinch to zoom (touch). Capture only once a gesture
// starts, so a plain click still reaches the marker under it.
const DRAG_THRESHOLD = 4
const dragging = ref(false)
const pointers = new Map<number, { x: number; y: number }>()
let downX = 0
let lastX = 0
let lastPinch: { mid: number; dist: number } | null = null
let justDragged = false

function pinchState() {
  const [a, b] = [...pointers.values()]
  return {
    mid: localX((a!.x + b!.x) / 2),
    dist: Math.max(10, Math.hypot(a!.x - b!.x, a!.y - b!.y)),
  }
}

function onPointerDown(e: PointerEvent) {
  // The first finger of a new gesture is "primary": drop anything left over from a
  // gesture whose pointerup never arrived, so a tap isn't mistaken for a pinch.
  if (e.isPrimary) {
    pointers.clear()
    lastPinch = null
    dragging.value = false
  }
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (pointers.size === 1) {
    downX = lastX = e.clientX
    justDragged = false
  } else if (pointers.size === 2) {
    const el = e.currentTarget as Element
    for (const id of pointers.keys()) el.setPointerCapture(id)
    dragging.value = true
    lastPinch = pinchState()
  }
}

function onPointerMove(e: PointerEvent) {
  if (!pointers.has(e.pointerId)) return
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

  if (lastPinch && pointers.size >= 2) {
    // Zoom around the point between the fingers, and pan as that point moves.
    const now = pinchState()
    const factor = lastPinch.dist / now.dist
    emit('zoomAt', xToYear(lastPinch.mid, props.view, width.value), factor)
    emit('panBy', (-(now.mid - lastPinch.mid) / width.value) * span(props.view) * factor)
    lastPinch = now
    return
  }

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
  pointers.delete(e.pointerId)
  const el = e.currentTarget as Element
  if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)

  if (pointers.size === 1) {
    // Pinch ended with one finger still down: carry on as a drag from where it is.
    lastPinch = null
    lastX = [...pointers.values()][0]!.x
    return
  }
  if (pointers.size === 0) {
    if (dragging.value) justDragged = true
    dragging.value = false
    lastPinch = null
  }
}

function onMarkerClick(id: string) {
  if (justDragged) return
  emit('select', id)
}
</script>

<style scoped>
.era-label {
  fill: var(--dr-muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.milestone-line {
  stroke: var(--dr-milestone);
  stroke-width: 1.5;
  stroke-dasharray: 6 4;
}
.tick-label {
  fill: var(--dr-text-2);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.hidden-dot {
  fill: var(--dr-muted);
  opacity: 0.6;
}
.label-bg {
  fill: var(--dr-surface);
  stroke: var(--dr-border);
}
.label-text {
  fill: var(--dr-text);
  font-size: 11px;
}
.label-text.anchor {
  font-weight: 700;
}
.marker:hover .label-bg,
.marker.selected .label-bg {
  stroke: var(--dr-text);
  stroke-width: 1.5;
}
</style>
