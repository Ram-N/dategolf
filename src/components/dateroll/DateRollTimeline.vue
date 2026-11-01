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

      <!-- Milestone section lines run through every lane, so they line up across regions -->
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

      <!-- One track in World mode, one per visible lane in Lanes mode -->
      <g v-for="t in layouts" :key="t.id">
        <template v-if="t.label">
          <line v-if="t.index > 0" x1="0" :x2="width" :y1="t.top" :y2="t.top" class="lane-rule" />
          <text x="8" :y="t.top + 13" class="lane-label">{{ t.label }}</text>
        </template>

        <!-- Leaders (dot → label, angled when the label is shifted sideways) sit beneath all labels -->
        <line
          v-for="m in t.markers"
          :key="m.event.id"
          :x1="m.x"
          :x2="m.leaderX"
          :y1="t.axisY"
          :y2="m.leaderEnd"
          :stroke="`var(--dr-${m.group})`"
          stroke-opacity="0.55"
          pointer-events="none"
        />

        <line x1="0" :x2="width" :y1="t.axisY" :y2="t.axisY" stroke="var(--dr-axis)" :stroke-width="t.label ? 1.5 : 2" />
        <template v-if="!t.label">
          <text
            v-for="tk in tickMarks"
            :key="tk.year"
            :x="tk.x"
            :y="t.axisY + 16"
            text-anchor="middle"
            class="tick-label"
          >
            {{ tk.label }}
          </text>
        </template>

        <!-- Hidden events: faint dots hint that zooming reveals more -->
        <circle v-for="h in t.hiddenDots" :key="h.id" :cx="h.x" :cy="t.axisY" r="2" class="hidden-dot" />

        <!-- Visible events -->
        <circle
          v-for="m in t.markers"
          :key="m.event.id"
          :cx="m.x"
          :cy="t.axisY"
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
          v-for="m in t.markers"
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

        <!-- Duration bars: empires/dynasties (solid) and periods (dashed) -->
        <template v-if="!t.label">
          <line x1="0" :x2="width" :y1="t.bandTop" :y2="t.bandTop" class="lane-rule" />
          <text v-for="r in t.barRows" :key="r.kind" x="8" :y="r.top - 4" class="band-title">{{ r.title }}</text>
        </template>
        <g
          v-for="b in t.bars"
          :key="b.d.id"
          class="cursor-pointer bar"
          :class="[b.d.kind, { selected: b.d.id === selectedDurationId }]"
          @click="onBarClick(b.d.id)"
        >
          <title>{{ b.tooltip }}</title>
          <rect
            :x="b.x"
            :y="b.y"
            :width="b.w"
            :height="BAR_H"
            rx="3"
            :fill="`var(--dr-${b.group})`"
            :stroke="`var(--dr-${b.group})`"
            class="bar-rect"
          />
          <text v-if="b.label" :x="b.labelX" :y="b.y + BAR_H - 3" class="bar-text">{{ b.label }}</text>
        </g>
      </g>

      <!-- Lanes share one row of year labels along the bottom -->
      <template v-if="mode === 'lanes'">
        <line x1="0" :x2="width" :y1="height - TICK_STRIP" :y2="height - TICK_STRIP" class="lane-rule" />
        <text
          v-for="tk in tickMarks"
          :key="tk.year"
          :x="tk.x"
          :y="height - 6"
          text-anchor="middle"
          class="tick-label"
        >
          {{ tk.label }}
        </text>
      </template>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { Event } from '@/types'
import type { Duration } from '@/types/dateroll'
import erasData from '@/data/eras.json'
import milestoneIds from '@/data/milestones.json'
import { formatTick, span, ticks, xToYear, yearToX, type View } from '@/engine/dateroll/timeScale'
import { importanceThreshold } from '@/engine/dateroll/filters'
import {
  layoutLabels,
  spaceMilestones,
  wrapLabel,
  type Side,
} from '@/engine/dateroll/visibility'
import { groupFor } from '@/engine/dateroll/categoryGroups'
import { formatSpan, packBars } from '@/engine/dateroll/durations'
import { LANES, laneFor, type LaneId } from '@/engine/dateroll/lanes'
import { formatYear } from '@/utils/formatYear'

const props = defineProps<{
  events: Event[] // already filtered
  allEvents: Event[] // unfiltered: milestone section lines stay put whatever the filters
  durations: Duration[]
  detail: number
  view: View
  mode: 'world' | 'lanes'
  lanes: LaneId[]
  selectedId: string | null
  selectedDurationId: string | null
}>()
const emit = defineEmits<{
  zoomAt: [anchorYear: number, factor: number]
  panBy: [deltaYears: number]
  select: [id: string]
  selectDuration: [id: string]
}>()

// Label geometry. Vertical space on each side of an axis is cut into LEVEL_H levels;
// an n-line label takes n + 1 levels, leaving a constant gap between stacked labels.
const LEVEL_H = 13
const LINE_H = 13
const BOX_PAD = 3
const LINE_CHARS = 20
const MAX_LINES = 3
const CHAR_W = 6.2 // approx width of an 11px system-ui character
const CHAR_W_BOLD = 6.8
const ANCHOR_IMPORTANCE = 7
const ERA_SPACE = 28 // room at the top for era names
const AXIS_GAP = 10 // gap between an axis and the nearest label
const TICK_SPACE = 24 // World mode: room under the axis for year labels
const TICK_STRIP = 20 // Lanes mode: shared year labels along the bottom
const LANE_HEADER = 18 // room for the lane name
const MILESTONE_GAP_PX = 48
const MILESTONE_PRIORITY = 100 // milestones claim label space before everything else

// Duration bars. World mode has two sub-bands so long empires can't crowd out periods;
// each lane gets one row per kind (or just empires when the lane is short).
const BAR_H = 12
const BAR_ROW = 16
const WORLD_ROWS_PER_KIND = 3
const SUB_HEADER = 15
const WORLD_BAND_H = 2 * (SUB_HEADER + WORLD_ROWS_PER_KIND * BAR_ROW) + 4
const LANE_TWO_ROW_MIN_H = 120
const BAR_MIN_PX = 80 // a bar this wide shows even if below the importance threshold

const MILESTONE_RANK = new Map((milestoneIds as string[]).map((id, i) => [id, i]))
const LANE_LABEL = new Map(LANES.map((l) => [l.id, l.label]))

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

// ── Shared layers ───────────────────────────────────────────────────────────
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
  const ranked = props.allEvents
    .filter((e) => e.year >= props.view.start && e.year <= props.view.end)
    .filter((e) => MILESTONE_RANK.has(e.id))
    .sort((a, b) => MILESTONE_RANK.get(a.id)! - MILESTONE_RANK.get(b.id)!)
    .map((e) => ({ id: e.id, x: yearToX(e.year, props.view, width.value) }))
  return spaceMilestones(ranked, MILESTONE_GAP_PX)
})

// ── Tracks ──────────────────────────────────────────────────────────────────
interface BarRow {
  kind: Duration['kind']
  title: string
  top: number
  rows: number
}

interface Track {
  id: string
  index: number
  label: string | null // lane name; null for the single World track
  top: number
  axisY: number
  levelsPerSide: number
  belowGap: number // distance from the axis to the first label level below it
  bandTop: number
  barRows: BarRow[]
  events: Event[]
  durations: Duration[]
}

const tracks = computed<Track[]>(() => {
  const h = height.value
  const durationsInView = props.durations.filter(
    (d) => d.endYear >= props.view.start && d.startYear <= props.view.end,
  )

  if (props.mode === 'world') {
    const bandTop = h - WORLD_BAND_H
    const empiresTop = bandTop + SUB_HEADER
    const periodsTop = empiresTop + WORLD_ROWS_PER_KIND * BAR_ROW + SUB_HEADER
    const axisY = Math.round((ERA_SPACE + bandTop) / 2)
    const above = axisY - AXIS_GAP - ERA_SPACE
    const below = bandTop - axisY - TICK_SPACE - 6
    return [
      {
        id: 'world',
        index: 0,
        label: null,
        top: ERA_SPACE,
        axisY,
        levelsPerSide: Math.max(2, Math.floor(Math.min(above, below) / LEVEL_H)),
        belowGap: TICK_SPACE,
        bandTop,
        barRows: [
          { kind: 'empire', title: 'Empires & dynasties', top: empiresTop, rows: WORLD_ROWS_PER_KIND },
          { kind: 'period', title: 'Periods', top: periodsTop, rows: WORLD_ROWS_PER_KIND },
        ],
        events: inView.value,
        durations: durationsInView,
      },
    ]
  }

  const laneH = (h - ERA_SPACE - TICK_STRIP) / Math.max(1, props.lanes.length)
  const kinds: Duration['kind'][] = laneH >= LANE_TWO_ROW_MIN_H ? ['empire', 'period'] : ['empire']
  return props.lanes.map((id, index) => {
    const top = ERA_SPACE + index * laneH
    const bandTop = top + laneH - kinds.length * BAR_ROW - 4
    const axisY = Math.round((top + LANE_HEADER + bandTop) / 2)
    const above = axisY - AXIS_GAP - (top + LANE_HEADER)
    const below = bandTop - axisY - AXIS_GAP
    return {
      id,
      index,
      label: LANE_LABEL.get(id) ?? id,
      top,
      axisY,
      levelsPerSide: Math.max(0, Math.floor(Math.min(above, below) / LEVEL_H)),
      belowGap: AXIS_GAP,
      bandTop,
      barRows: kinds.map((kind, i) => ({ kind, title: '', top: bandTop + 2 + i * BAR_ROW, rows: 1 })),
      events: inView.value.filter((e) => laneFor(e.region) === id),
      durations: durationsInView.filter((d) => laneFor(d.region) === id),
    }
  })
})

function boxPosition(t: Track, side: Side, level: number, boxH: number) {
  if (side === 'above') {
    const bottom = t.axisY - AXIS_GAP - level * LEVEL_H
    return { boxTop: bottom - boxH, leaderEnd: bottom }
  }
  const top = t.axisY + t.belowGap + level * LEVEL_H
  return { boxTop: top, leaderEnd: top }
}

function layoutMarkers(t: Track, sectionIds: Set<string>) {
  const minImp = importanceThreshold(span(props.view), props.detail)
  const candidates = t.events
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
      levelsPerSide: t.levelsPerSide,
      levelH: LEVEL_H,
      axisGap: { above: AXIS_GAP, below: t.belowGap },
    },
  )

  return placed.map((p) => {
    const c = byId.get(p.id)!
    return {
      ...c,
      labelX: p.labelX,
      leaderX: p.leaderX,
      ...boxPosition(t, p.side, p.level, c.boxH),
      group: groupFor(c.event.categories),
      radius: 4 + Math.max(0, c.event.importance - 4) * 0.6,
      // Year first: the event is what students are learning to place.
      tooltip: `${formatYear(c.event.year)} — ${c.event.name}`,
    }
  })
}

// Duration bars in view: important ones, plus any wide enough to read, packed into rows.
function layoutBars(t: Track) {
  const minImp = importanceThreshold(span(props.view), props.detail)
  const candidates = t.durations
    .map((d) => ({
      d,
      x1: yearToX(d.startYear, props.view, width.value),
      x2: yearToX(d.endYear, props.view, width.value),
    }))
    .filter((c) => c.d.importance >= minImp || c.x2 - c.x1 >= BAR_MIN_PX)
  const byId = new Map(candidates.map((c) => [c.d.id, c]))

  const placed = t.barRows.flatMap((r) =>
    packBars(
      candidates
        .filter((c) => c.d.kind === r.kind)
        .map((c) => ({
          id: c.d.id,
          // Clamp so off-screen ends don't stop other bars sharing the row.
          x1: Math.max(c.x1, -10),
          x2: Math.max(Math.min(c.x2, width.value + 10), Math.max(c.x1, -10) + 3),
          priority: c.d.importance,
        })),
      r.rows,
    ).map((p) => ({ ...p, top: r.top })),
  )

  return placed.map((p) => {
    const { d, x1, x2 } = byId.get(p.id)!
    const x = Math.max(x1, -2)
    const w = Math.max(3, Math.min(x2, width.value + 2) - x)
    // Name sticks to the visible left edge so it stays readable as the bar scrolls.
    const chars = Math.floor((w - 10) / 5.6)
    const label = chars >= d.name.length ? d.name : chars >= 4 ? d.name.slice(0, chars - 1) + '…' : ''
    return {
      d,
      x,
      w,
      y: p.top + p.row * BAR_ROW,
      label,
      labelX: Math.max(x, 0) + 5,
      group: groupFor(d.categories),
      tooltip: `${formatSpan(d, formatYear)} — ${d.name}`,
    }
  })
}

const layouts = computed(() => {
  const sectionIds = new Set(milestoneLines.value.map((m) => m.id))
  return tracks.value.map((t) => {
    const markers = layoutMarkers(t, sectionIds)
    const shown = new Set(markers.map((m) => m.event.id))
    const hiddenDots = t.events
      .filter((e) => !shown.has(e.id))
      .map((e) => ({ id: e.id, x: yearToX(e.year, props.view, width.value) }))
    return { ...t, markers, hiddenDots, bars: layoutBars(t) }
  })
})

defineExpose({
  hiddenCount: computed(() => layouts.value.reduce((n, t) => n + t.hiddenDots.length, 0)),
})

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

function onBarClick(id: string) {
  if (justDragged) return
  emit('selectDuration', id)
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
.lane-rule {
  stroke: var(--dr-border-soft);
}
.lane-label {
  fill: var(--dr-text-2);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  paint-order: stroke;
  stroke: var(--dr-bg);
  stroke-width: 4px;
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
.band-title {
  fill: var(--dr-muted);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.bar-rect {
  fill-opacity: 0.4;
  stroke-width: 1;
}
.bar.period .bar-rect {
  fill-opacity: 0.12;
  stroke-dasharray: 4 2;
}
.bar:hover .bar-rect,
.bar.selected .bar-rect {
  stroke: var(--dr-text);
  stroke-width: 1.5;
}
.bar-text {
  fill: var(--dr-text);
  font-size: 10px;
  pointer-events: none;
}
.marker:hover .label-bg,
.marker.selected .label-bg {
  stroke: var(--dr-text);
  stroke-width: 1.5;
}
</style>
