<template>
  <div ref="containerEl" class="relative w-full h-full overflow-hidden select-none">
    <svg
      v-if="width > 0"
      :width="width"
      :height="height"
      class="block cursor-grab touch-none"
      :data-help="mode === 'world' ? 'layout-timeline' : `layout-${mode}`"
      :class="{ 'cursor-grabbing': dragging }"
      @wheel.prevent="onWheel"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @click="onBackgroundClick"
    >
      <!-- Era bands: alternating faint fills, name pinned to the visible part of the band -->
      <g v-for="era in eraBands" :key="era.id" data-help="era">
        <rect v-if="era.shaded" :x="era.x1" y="0" :width="era.x2 - era.x1" :height="height" fill="var(--df-era)" />
        <text v-if="era.showLabel" :x="era.labelX" y="20" class="era-label">{{ era.name }}</text>
      </g>

      <!-- Historical Currents (step 3d): long movements as washes behind everything; at most 3 overlap.
           A dashed edge = an approximate start or end. The name (with its years) opens the span's card. -->
      <g v-for="c in currentBands" :key="c.id" class="current" data-help="current">
        <rect :x="c.x1" :y="c.top" :width="c.x2 - c.x1" :height="c.h" class="current-band" pointer-events="none" />
        <line v-if="c.startIn" :x1="c.x1" :x2="c.x1" :y1="c.top" :y2="c.top + c.h" class="current-edge"
              :class="{ approx: c.approximate }" pointer-events="none" />
        <line v-if="c.endIn" :x1="c.x2" :x2="c.x2" :y1="c.top" :y2="c.top + c.h" class="current-edge"
              :class="{ approx: c.approximate }" pointer-events="none" />
        <text v-if="c.label" :x="c.labelX" :y="c.top + 12 + c.row * 13" class="current-label"
              role="button" @click.stop="onBarClick(c.id)">
          <title>{{ c.name }}, {{ c.years }}: a Historical Current. Click for its card.</title>
          {{ c.label }}
        </text>
      </g>

      <!-- Grid -->
      <line
        v-for="t in tickMarks"
        :key="t.year"
        :x1="t.x"
        :x2="t.x"
        y1="0"
        :y2="height"
        :stroke="t.year === 0 ? 'var(--df-axis)' : 'var(--df-grid)'"
      />

      <!-- Milestone section lines run through every lane, so they line up across regions. Each is
           named in a tag in the era strip (when there's room) and opens its event's card on click. -->
      <g
        v-for="ms in milestoneLines"
        :key="ms.id"
        class="milestone cursor-pointer"
        data-help="milestone"
        @click.stop="onMarkerClick(ms.id)"
      >
        <title>{{ ms.tooltip }}</title>
        <line :x1="ms.x" :x2="ms.x" y1="0" :y2="height" class="milestone-line" />
        <!-- A wider invisible stroke makes the thin dashed line easy to hover -->
        <line :x1="ms.x" :x2="ms.x" y1="0" :y2="height" class="milestone-hit" />
        <template v-if="ms.tag !== null">
          <rect :x="ms.x - 4" y="9" :width="ms.tagW" height="15" rx="7.5" class="milestone-tag" />
          <text :x="ms.x + 2" y="20" class="milestone-tag-text">◆<tspan v-if="ms.tag" dx="3">{{ ms.tag }}</tspan></text>
        </template>
      </g>

      <!-- Date Constellation: every event as a dot on its track; no labels or bars -->
      <g v-if="constellation">
        <g v-for="t in constellation.tracks" :key="t.id">
          <rect v-if="t.index % 2 === 1" x="0" :y="t.top" :width="width" :height="t.h" class="track-band" data-help="track" />
          <!-- A state's lifetime, behind its row: states rise, overlap and end across the axis -->
          <rect v-if="t.band" :x="t.band.x" :y="t.top + 2" :width="t.band.w" :height="Math.max(0, t.h - 4)" rx="4"
                class="state-band" data-help="state" />
          <line v-if="t.index > 0" x1="0" :x2="width" :y1="t.top" :y2="t.top" class="lane-rule" />
        </g>
        <!-- 2d: spans along the bottom of their track, under the dots -->
        <g
          v-for="b in constellation.bars"
          :key="b.d.id"
          class="cursor-pointer bar c-bar"
          :data-help="rowKind(b.d)"
          :class="[rowKind(b.d), { selected: b.d.id === selectedDurationId, lit: lit(b.d.id), dimmed: dimming && !lit(b.d.id), faded: fades(b.family, b.d.id) }]"
          @click.stop="onBarClick(b.d.id)"
        >
          <title>{{ b.tooltip }}</title>
          <rect :x="b.x" :y="b.y" :width="b.w" :height="C_BAR_H" rx="3" :fill="`var(--df-f-${b.family})`"
                :stroke="`var(--df-f-${b.family})`" class="bar-rect" />
          <text v-if="b.label" :x="b.labelX" :y="b.y + C_BAR_H - 2" class="bar-text c-bar-text">{{ b.label }}</text>
        </g>
        <path
          v-for="d in constellation.dots"
          :key="d.key"
          :d="shapePath(d.shape, d.x, d.y, d.r)"
          :fill="`var(--df-f-${d.family})`"
          class="star cursor-pointer"
          data-help="dot"
          :class="{ selected: d.event.id === selectedId, lit: lit(d.event.id), dimmed: dimming && !lit(d.event.id), faded: fades(d.family, d.event.id) }"
          @pointerenter="onDotHover(d.event, $event)"
          @pointerleave="hoveredDot = null"
          @click="onMarkerClick(d.event.id)"
        />
        <!-- Each track name switches its track on and off (#5, #7) -->
        <g
          v-for="t in constellation.tracks"
          :key="t.id"
          class="track-toggle"
          data-help="track"
          :class="{ off: !t.on }"
          role="button"
          tabindex="0"
          :aria-pressed="t.on"
          :aria-label="`${t.label}: ${t.on ? 'shown, click to hide' : 'hidden, click to show'}`"
          @pointerdown.stop
          @click.stop="emit('toggleTrack', t.id)"
          @keydown.enter.prevent="emit('toggleTrack', t.id)"
          @keydown.space.prevent="emit('toggleTrack', t.id)"
        >
          <title>{{ t.on ? 'Hide this track' : 'Show this track' }}</title>
          <rect x="4" :y="t.top + 3" :width="t.label.length * 8.3 + 26" height="16" rx="8" class="track-pill" />
          <circle cx="14" :cy="t.top + 11" r="3.5" class="track-dot" />
          <text x="22" :y="t.top + 15" class="lane-label">{{ t.label }}</text>
        </g>
      </g>

      <!-- Story backdrops: the spans that hold a story's steps (World War II behind the WWII chain) -->
      <g v-for="b in storyBackdrops" :key="b.id" pointer-events="none" aria-hidden="true">
        <rect :x="b.x" :y="ERA_SPACE" :width="b.w" :height="b.h" class="backdrop" />
        <text :x="b.x + 6" :y="ERA_SPACE + 14" class="backdrop-label">{{ b.name }}</text>
      </g>

      <!-- One track in the Timeline layout (mode "world"), one per visible lane in Lanes mode -->
      <g v-for="t in layouts" :key="t.id">
        <template v-if="t.label">
          <line v-if="t.index > 0" x1="0" :x2="width" :y1="t.top" :y2="t.top" class="lane-rule" />
          <text x="8" :y="t.top + 13" class="lane-label" data-help="lane">{{ t.label }}</text>
        </template>

        <!-- Leaders (dot → label, angled when the label is shifted sideways) sit beneath all labels -->
        <line
          v-for="m in t.markers"
          :key="m.event.id"
          :x1="m.x"
          :x2="m.leaderX"
          :y1="t.axisY"
          :y2="m.leaderEnd"
          :stroke="`var(--df-f-${m.family})`"
          stroke-opacity="0.55"
          :class="{ dimmed: dimming && !lit(m.event.id), faded: fades(m.family, m.event.id) }"
          pointer-events="none"
        />

        <line x1="0" :x2="width" :y1="t.axisY" :y2="t.axisY" stroke="var(--df-axis)" :stroke-width="t.label ? 1.5 : 2" />
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
        <circle
          v-for="h in t.hiddenDots"
          :key="h.id"
          :cx="h.x"
          :cy="t.axisY"
          :r="lit(h.id) ? 4 : 2"
          class="hidden-dot"
          data-help="hidden-dot"
          :class="{ lit: lit(h.id), dimmed: dimming && !lit(h.id) }"
        />

        <!-- Detailed: events with no room for a label, marked small -->
        <path
          v-for="q in t.quiet"
          :key="q.event.id"
          :d="shapePath(q.shape, q.x, t.axisY, QUIET_R)"
          :fill="`var(--df-f-${q.family})`"
          stroke="var(--df-bg)"
          stroke-width="1"
          class="cursor-pointer quiet"
          data-help="quiet"
          :class="{ dimmed: dimming && !lit(q.event.id), faded: fades(q.family, q.event.id) }"
          @click="onMarkerClick(q.event.id)"
        >
          <title>{{ q.tooltip }}</title>
        </path>

        <!-- Visible events -->
        <path
          v-for="m in t.markers"
          :key="m.event.id"
          :d="shapePath(m.shape, m.x, t.axisY, m.radius)"
          :fill="`var(--df-f-${m.family})`"
          :stroke="m.event.id === selectedId || lit(m.event.id) ? 'var(--df-text)' : 'var(--df-bg)'"
          :stroke-width="lit(m.event.id) ? 3 : 2"
          class="cursor-pointer"
          data-help="event"
          :class="{ dimmed: dimming && !lit(m.event.id), faded: fades(m.family, m.event.id) }"
          @click="onMarkerClick(m.event.id)"
        >
          <title>{{ m.tooltip }}</title>
        </path>
        <g
          v-for="m in t.markers"
          :key="m.event.id"
          class="cursor-pointer marker"
          data-help="event"
          :class="{ selected: m.event.id === selectedId, lit: lit(m.event.id), spot: !!spotlightIds?.has(m.event.id), dimmed: dimming && !lit(m.event.id), faded: fades(m.family, m.event.id) }"
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

        <!-- Span bars: empires/dynasties (solid) and periods (dashed) -->
        <template v-if="!t.label && t.barRows.length">
          <line x1="0" :x2="width" :y1="t.bandTop" :y2="t.bandTop" class="lane-rule" />
          <text v-for="r in t.barRows" :key="r.kind" x="8" :y="r.top - 4" class="band-title" :data-help="r.kind">{{ r.title }}</text>
        </template>
        <g
          v-for="b in t.bars"
          :key="b.d.id"
          class="cursor-pointer bar"
          :data-help="rowKind(b.d)"
          :class="[rowKind(b.d), { selected: b.d.id === selectedDurationId, lit: lit(b.d.id), dimmed: dimming && !lit(b.d.id), faded: fades(b.family, b.d.id) }]"
          @click="onBarClick(b.d.id)"
        >
          <title>{{ b.tooltip }}</title>
          <!-- Life-cycle phases (Phase 12): the bar's family colour, filled more or less strongly by kind -->
          <g v-for="p in b.phases" :key="p.phase.start" class="phase" :class="`kind-${p.phase.kind}`">
            <title>{{ p.tooltip }}</title>
            <rect :x="p.x" :y="b.y" :width="p.w" :height="BAR_H" :fill="`var(--df-f-${b.family})`" class="phase-rect" />
          </g>
          <!-- Drawn over the phases (outline only, then) so the selected / lit outline stays visible -->
          <rect
            :x="b.x"
            :y="b.y"
            :width="b.w"
            :height="BAR_H"
            :rx="b.d.person ? BAR_H / 2 : 3"
            :fill="`var(--df-f-${b.family})`"
            :stroke="`var(--df-f-${b.family})`"
            class="bar-rect"
            :class="{ phased: b.phases.length }"
          />
          <!-- Sub-spans revealed by zooming in: segments inside the parent's bar (Delhi Sultanate → its dynasties) -->
          <g
            v-for="s in b.segments"
            :key="s.d.id"
            class="segment"
            :class="{ selected: s.d.id === selectedDurationId, lit: lit(s.d.id), dimmed: dimming && !lit(s.d.id), faded: fades(s.family, s.d.id) }"
            @click.stop="onBarClick(s.d.id)"
          >
            <title>{{ s.tooltip }}</title>
            <rect :x="s.x" :y="b.y + s.inset" :width="s.w" :height="BAR_H - 2 * s.inset" rx="2"
                  :fill="`var(--df-f-${s.family})`" class="segment-rect" />
            <text v-if="s.label" :x="s.labelX" :y="b.y + BAR_H - 3" class="segment-text">{{ s.label }}</text>
          </g>
          <!-- The parent's name goes on top, so a segment starting at the bar's edge can't cover it -->
          <text v-if="b.label" :x="b.labelX" :y="b.y + BAR_H - 3" class="bar-text" :class="{ halo: b.segments.length }">{{ b.label }}</text>
        </g>
      </g>

      <!-- Time Machine marks -->
      <g v-if="marks" pointer-events="none" aria-hidden="true" class="tm">
        <template v-if="marks.band">
          <rect :x="yearToX(marks.band[0], view, width)" :y="ERA_SPACE"
                :width="Math.max(2, yearToX(marks.band[1], view, width) - yearToX(marks.band[0], view, width))"
                :height="height - ERA_SPACE" class="tm-band" />
          <text :x="(yearToX(marks.band[0], view, width) + yearToX(marks.band[1], view, width)) / 2" :y="ERA_SPACE + 16"
                text-anchor="middle" class="tm-label">{{ marks.label }}</text>
        </template>
        <g v-for="y in marks.lines" :key="y">
          <line :x1="yearToX(y, view, width)" :x2="yearToX(y, view, width)" :y1="ERA_SPACE" :y2="height" class="tm-line" />
          <rect :x="yearToX(y, view, width) - 34" :y="ERA_SPACE + 2" width="68" height="18" rx="9" class="tm-pill" />
          <text :x="yearToX(y, view, width)" :y="ERA_SPACE + 15" text-anchor="middle" class="tm-pill-text">{{ formatYear(y) }}</text>
        </g>
        <g v-if="marks.bracket">
          <line :x1="yearToX(marks.bracket[0], view, width)" :x2="yearToX(marks.bracket[1], view, width)"
                :y1="ERA_SPACE + 12" :y2="ERA_SPACE + 12" class="tm-bracket" />
          <line v-for="y in marks.bracket" :key="y" :x1="yearToX(y, view, width)" :x2="yearToX(y, view, width)"
                :y1="ERA_SPACE + 4" :y2="height" class="tm-tick" />
          <text :x="(yearToX(marks.bracket[0], view, width) + yearToX(marks.bracket[1], view, width)) / 2" :y="ERA_SPACE + 8"
                text-anchor="middle" class="tm-label">{{ marks.label }}</text>
        </g>
      </g>

      <StoryArcs v-if="story" data-help="story-thread" :arcs="storyArcs" :spans="storySpanMarks" :pulse="spotlights.length ? null : storyPulse" :step-edge-keys="stepEdgeKeys"
                 :active-key="cardArc?.arc.key ?? null" @hover="onArcHover" @pick="onArcClick" />

      <!-- Spotlight: the stop being shown in a story, journey or Play through, ringed in its own colour
           and named on the timeline, so the eye can find it next to the card -->
      <g v-for="sp in spotlights" :key="sp.key" class="spotlight" pointer-events="none" aria-hidden="true">
        <template v-if="sp.bar">
          <rect :x="sp.bar.x - 3" :y="sp.bar.y - 3" :width="sp.bar.w + 6" :height="sp.bar.h + 6" rx="5" class="spot-bar" />
        </template>
        <template v-else-if="sp.dot">
          <circle :cx="sp.dot.x" :cy="sp.dot.y" :r="sp.dot.r + 5" class="spot-ring" />
          <circle :cx="sp.dot.x" :cy="sp.dot.y" :r="sp.dot.r + 5" class="spot-pulse" />
        </template>
        <template v-if="sp.tag">
          <line v-if="sp.tag.leader" :x1="sp.tag.leader.x" :x2="sp.tag.leader.x" :y1="sp.tag.leader.y1" :y2="sp.tag.leader.y2"
                class="spot-leader" />
          <rect :x="sp.tag.x" :y="sp.tag.y" :width="sp.tag.w" height="20" rx="10" class="spot-tag" />
          <text :x="sp.tag.x + 9" :y="sp.tag.y + 14" class="spot-tag-text">{{ sp.tag.text }}</text>
        </template>
      </g>

      <!-- Shift-drag period selection -->
      <g v-if="selection" pointer-events="none">
        <rect :x="selection.x" y="0" :width="selection.w" :height="height" class="selection" />
        <text :x="selection.x + selection.w / 2" y="44" text-anchor="middle" class="selection-label">
          {{ selection.label }}
        </text>
      </g>

      <!-- Lanes and Constellation share one row of year labels along the bottom -->
      <template v-if="mode !== 'world'">
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
    <div v-if="dotCard" class="dot-card" :style="{ left: dotCard.left + 'px', top: dotCard.top + 'px' }" role="tooltip">
      <div class="dot-card-year">{{ dotCard.year }}</div>
      <div class="dot-card-name">{{ dotCard.name }}</div>
      <div v-if="dotCard.text" class="dot-card-text">{{ dotCard.text }}</div>
    </div>
    <ConnectionCard v-if="cardArc" :arc="cardArc.arc" :x="cardArc.x" :y="cardArc.y" :bounds="{ width, height }"
                    :pinned="!!pinned" @close="pinned = null" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { Event } from '@/types'
import type { Span } from '@/types/dateflow'
import erasData from '@/data/eras.json'
import milestoneIds from '@/data/milestones.json'
import milestoneLabels from '@/data/milestone_labels.json'
import { formatTick, span, ticks, xToYear, yearToX, type View } from '@/engine/dateflow/timeScale'
import { importanceThreshold, type Density } from '@/engine/dateflow/filters'
import {
  layoutLabels,
  spaceMilestones,
  wrapLabel,
  type Side,
} from '@/engine/dateflow/visibility'
import { familyFor, shapeOf, shapePath, type Family } from '@/engine/dateflow/categoryGroups'
import {
  PHASE_KIND_LABEL,
  emptyRows,
  formatPhase,
  formatSpan,
  packBars,
  phaseSegments,
  revealedSubSpans,
  topLevelSpans,
} from '@/engine/dateflow/durations'
import { pickCurrents } from '@/engine/dateflow/currents'
import { LANES, laneFor, type LaneId } from '@/engine/dateflow/lanes'
import {
  constellationThreshold, dotRadius, hiddenOn, layoutTracks, scatter, stateTracks, trackOf, tracksFor,
  type HiddenTracks, type StateSpan, type TrackAxis,
} from '@/engine/dateflow/constellation'
import type { ViewMode } from '@/stores/dateflow'
import { formatEventYear, formatYear } from '@/utils/formatYear'
import { gapText, joinFrom, joinTo, yearGap, type Story, type StoryEdge, type StoryNode } from '@/engine/dateflow/stories'
import StoryArcs, { type Arc } from './StoryArcs.vue'
import ConnectionCard from './ConnectionCard.vue'

const props = defineProps<{
  events: Event[] // already filtered
  allEvents: Event[] // unfiltered: milestone section lines stay put whatever the filters
  durations: Span[]
  spanParents: Map<string, string> // sub-span → the span it is part of
  detail: number
  view: View
  mode: ViewMode
  lanes: LaneId[]
  trackAxis: TrackAxis
  hiddenTracks: HiddenTracks // Constellation tracks switched off
  eventStates: Record<string, string[]> // event → its states, for the Empires & states axis
  stateSpans: Map<string, StateSpan>
  selectedId: string | null
  selectedDurationId: string | null
  highlightIds?: Set<string> | null // "Show connections": ring these, dim the rest
  story?: Story | null // Phase 9: draw this story's threads
  stepId?: string | null // the stop being played
  spotlightIds?: Set<string> | null // the current stop of a story, journey or Play through
  density: Density // Simple hides span bars and milestone lines
  focusFamily?: Family | null // Phase 11 Focus: this family stays vivid, the rest fade (never hidden)
  currents?: Span[] | null // step 3d: spans that may be drawn as Historical Currents (empty = layer off)
  // Phase 10, the Time Machine: year lines, a shaded band (two spans' shared years), a bracket (two events)
  marks?: { lines: number[]; band: [number, number] | null; bracket: [number, number] | null; label: string } | null
}>()
const emit = defineEmits<{
  zoomAt: [anchorYear: number, factor: number]
  panBy: [deltaYears: number]
  select: [id: string]
  selectDuration: [id: string]
  selectRange: [startYear: number, endYear: number]
  selectStop: [id: string] // a story thread was clicked: the stop it leads into
  toggleTrack: [id: string] // a Constellation track name was clicked
  backgroundClick: [] // a click (not a drag) anywhere on the timeline: clears ringed connections
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
const QUIET_R = 3.5 // Detailed's unlabelled markers: smaller than any labelled one (5px floor)
const ERA_SPACE = 28 // room at the top for era names
const AXIS_GAP = 10 // gap between an axis and the nearest label
const TICK_SPACE = 24 // World mode: room under the axis for year labels
const TICK_STRIP = 20 // Lanes mode: shared year labels along the bottom
const LANE_HEADER = 18 // room for the lane name
const LANE_NAME_W = 120 // the widest lane name ("SOUTHEAST ASIA"), so a current's label can start after it
const MILESTONE_GAP_PX = 48
const MILESTONE_PRIORITY = 100 // milestones claim label space before everything else
const HIGHLIGHT_PRIORITY = 200 // highlighted connections claim it before milestones
const FOCUS_BOOST = 20 // the focused family's labels beat other events, not milestones

// Span bars. World mode has two sub-bands so long empires can't crowd out periods;
// each lane gets one row per kind (or just empires when the lane is short).
const BAR_H = 12
const BAR_ROW = 16
const WORLD_ROWS_PER_KIND = 3
const SUB_HEADER = 15
const WORLD_PEOPLE_ROWS = 2
const worldBandH = (people: boolean) =>
  2 * (SUB_HEADER + WORLD_ROWS_PER_KIND * BAR_ROW) + (people ? SUB_HEADER + WORLD_PEOPLE_ROWS * BAR_ROW : 0) + 4
const LANE_TWO_ROW_MIN_H = 120
const LANE_THREE_ROW_MIN_H = 160 // room for a People row too
const BAR_MIN_PX = 80 // a bar this wide shows even if below the importance threshold

const MILESTONE_RANK = new Map((milestoneIds as string[]).map((id, i) => [id, i]))
const MILESTONE_LABEL = new Map(Object.entries(milestoneLabels as Record<string, string>))
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
  if (props.density === 'simple') return []
  const ranked = props.allEvents
    .filter((e) => e.year >= props.view.start && e.year <= props.view.end)
    .filter((e) => MILESTONE_RANK.has(e.id))
    .sort((a, b) => MILESTONE_RANK.get(a.id)! - MILESTONE_RANK.get(b.id)!)
    .map((e) => ({ id: e.id, name: MILESTONE_LABEL.get(e.id) ?? e.name, x: yearToX(e.year, props.view, width.value),
      tooltip: `Milestone · ${formatEventYear(e.year, e.approximate)} — ${e.name} (click to open)` }))
  const lines = spaceMilestones(ranked, MILESTONE_GAP_PX).sort((a, b) => a.x - b.x)
  // Name tags share the era strip with era names, which win. A tag shows the milestone's short name
  // when it fits before the next line, else a bare ◆ (the full event name is on hover).
  const eraNames = eraBands.value.filter((e) => e.showLabel).map((e) => [e.labelX - 6, e.labelX + e.name.length * 8.5 + 6])
  return lines.map((m, i) => {
    const end = Math.min(lines[i + 1]?.x ?? width.value, width.value) - 6
    const clash = (x1: number, x2: number) => eraNames.some(([a, b]) => x1 < b! && x2 > a!)
    const text = m.name.length * BAR_CHAR_W + 21 <= end - m.x ? m.name : '' // ◆ and padding
    const tagW = (text ? text.length * BAR_CHAR_W + 3 : 0) + 18
    if (!clash(m.x - 4, m.x - 4 + tagW)) return { ...m, tag: text, tagW }
    return { ...m, tag: clash(m.x - 4, m.x + 14) ? null : '', tagW: 18 }
  })
})

// ── Tracks ──────────────────────────────────────────────────────────────────
// A bar's row: empires, periods, or people's lives (Phase 13: a life is a period span flagged person)
type BarKind = Span['kind'] | 'person'
const rowKind = (d: Span): BarKind => (d.person ? 'person' : d.kind)

interface BarRow {
  kind: BarKind
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
  durations: Span[]
}

const tracks = computed<Track[]>(() => {
  if (props.mode === 'constellation') return [] // drawn by its own layer below
  const h = height.value
  const durationsInView = props.durations.filter(
    (d) => d.endYear >= props.view.start && d.startYear <= props.view.end,
  )

  const people = props.durations.some((d) => d.person)
  if (props.mode === 'world') {
    const bars = props.density !== 'simple'
    const bandTop = h - (bars ? worldBandH(people) : 0)
    const empiresTop = bandTop + SUB_HEADER
    const periodsTop = empiresTop + WORLD_ROWS_PER_KIND * BAR_ROW + SUB_HEADER
    const peopleTop = periodsTop + WORLD_ROWS_PER_KIND * BAR_ROW + SUB_HEADER
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
        barRows: bars
          ? [
              { kind: 'state', title: 'Empires & states', top: empiresTop, rows: WORLD_ROWS_PER_KIND },
              { kind: 'period', title: 'Periods', top: periodsTop, rows: WORLD_ROWS_PER_KIND },
              ...(people ? [{ kind: 'person' as const, title: 'People', top: peopleTop, rows: WORLD_PEOPLE_ROWS }] : []),
            ]
          : [],
        events: inView.value,
        durations: durationsInView,
      },
    ]
  }

  const laneH = (h - ERA_SPACE - TICK_STRIP) / Math.max(1, props.lanes.length)
  const kinds: BarKind[] =
    props.density === 'simple'
      ? []
      : people && laneH >= LANE_THREE_ROW_MIN_H
        ? ['state', 'period', 'person']
        : laneH >= LANE_TWO_ROW_MIN_H
          ? ['state', 'period']
          : ['state']
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

const lit = (id: string) => !!props.highlightIds?.has(id)
// The open card's event always gets a marker, even below the zoom's importance threshold.
const kept = (id: string) => lit(id) || id === props.selectedId
const dimming = computed(() => !!props.highlightIds?.size)
/** Focus fades every other family; the open card's event and ringed connections stay vivid. */
const fades = (family: Family, id: string) => !!props.focusFamily && family !== props.focusFamily && !kept(id)

function layoutMarkers(t: Track, sectionIds: Set<string>) {
  const minImp = importanceThreshold(span(props.view), props.detail)
  const candidates = t.events
    .filter((e) => e.importance >= minImp || sectionIds.has(e.id) || kept(e.id))
    .map((e) => {
      const x = yearToX(e.year, props.view, width.value)
      const bold = e.importance >= ANCHOR_IMPORTANCE || sectionIds.has(e.id) || lit(e.id)
      const lines = wrapLabel(e.name, LINE_CHARS, MAX_LINES)
      const longest = Math.max(...lines.map((l) => l.length))
      const labelWidth = longest * (bold ? CHAR_W_BOLD : CHAR_W) + 12
      const boxH = lines.length * LINE_H + BOX_PAD * 2
      const family = familyFor(e.categories)
      const boost = family === props.focusFamily ? FOCUS_BOOST : 0
      const priority = kept(e.id) ? HIGHLIGHT_PRIORITY : sectionIds.has(e.id) ? MILESTONE_PRIORITY : e.importance + boost
      return { event: e, x, lines, labelWidth, boxH, bold, priority, family }
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
      shape: shapeOf(c.family),
      radius: 5 + Math.max(0, c.event.importance - 4) * 0.6, // 5px floor: smaller, the family shapes blur together
      // Year first: the event is what students are learning to place.
      tooltip: `${formatEventYear(c.event.year, c.event.approximate)} — ${c.event.name}`,
    }
  })
}

// Span bars in view: important ones, any wide enough to read and any ringed, packed into rows.
function layoutBars(t: Track) {
  const minImp = importanceThreshold(span(props.view), props.detail)
  const candidates = t.durations
    .map((d) => ({
      d,
      x1: yearToX(d.startYear, props.view, width.value),
      x2: yearToX(d.endYear, props.view, width.value),
    }))
    .filter((c) => c.d.importance >= minImp || c.x2 - c.x1 >= BAR_MIN_PX || lit(c.d.id))
  const byId = new Map(candidates.map((c) => [c.d.id, c]))

  // Pack in rounds. A sub-span whose parent is a candidate rides inside the parent's bar
  // instead of taking a row; if the parent finds no row, its sub-spans compete on their own.
  const rows = t.barRows.map((r) => emptyRows(r.rows))
  // A lane too short for a People row shows people in its Periods row instead of not at all
  const peopleRow = t.barRows.some((r) => r.kind === 'person')
  const rowOf = (d: Span): BarKind => (d.person && !peopleRow ? 'period' : rowKind(d))
  const placed: { id: string; row: number; top: number }[] = []
  let pending = candidates.map((c) => c.d.id)
  while (pending.length) {
    const round = new Set(topLevelSpans(pending, props.spanParents))
    if (!round.size) break // only a part_of cycle could leave no top level
    t.barRows.forEach((r, i) => {
      const items = candidates
        .filter((c) => rowOf(c.d) === r.kind && round.has(c.d.id))
        .map((c) => ({
          id: c.d.id,
          // Clamp so off-screen ends don't stop other bars sharing the row.
          x1: Math.max(c.x1, -10),
          x2: Math.max(Math.min(c.x2, width.value + 10), Math.max(c.x1, -10) + 3),
          priority: lit(c.d.id) ? HIGHLIGHT_PRIORITY : c.d.importance,
        }))
      placed.push(...packBars(items, r.rows, 4, rows[i]).map((p) => ({ ...p, top: r.top })))
    })
    // Sub-spans of a placed bar are drawn as its segments; the rest get another round.
    const shown = new Set(placed.map((p) => p.id))
    const underShown = (id: string) => {
      for (let a = props.spanParents.get(id); a; a = props.spanParents.get(a)) if (shown.has(a)) return true
      return false
    }
    pending = pending.filter((id) => !round.has(id) && !underShown(id))
  }

  return placed.map((p) => {
    const { d, x1, x2 } = byId.get(p.id)!
    const x = Math.max(x1, -2)
    const w = Math.max(3, Math.min(x2, width.value + 2) - x)
    // Name sticks to the visible left edge so it stays readable as the bar scrolls.
    const label = fitLabel(d.name, w - 10)
    const labelX = Math.max(x, 0) + 5
    return {
      d,
      x,
      w,
      y: p.top + p.row * BAR_ROW,
      label,
      labelX,
      family: familyFor(d.categories),
      tooltip: `${formatSpan(d, formatYear)} — ${d.name}`,
      phases: phaseSegments(d.phases ?? [], (y) => yearToX(y, props.view, width.value), x, x + w).map((s) => ({
        ...s,
        tooltip: `${d.name} · ${PHASE_KIND_LABEL[s.phase.kind]}, ${formatPhase(s.phase, formatYear)}: ${s.phase.title}`,
      })),
      // With segments the name is bold (wider), so its end is measured with the bold width
      segments: layoutSegments(t, d.id, x, x + w, label ? labelX + label.length * BAR_BOLD_CHAR_W : x),
    }
  })
}

const BAR_CHAR_W = 5.6 // approx width of a 10px bar-label character
const BAR_BOLD_CHAR_W = 6.5 // the same in semibold (a bar's name when sub-spans ride inside it)
const SUB_REVEAL_PX = 48 // a sub-span shows inside its parent's bar once it is this wide

function fitLabel(name: string, px: number): string {
  const chars = Math.floor(px / BAR_CHAR_W)
  return chars >= name.length ? name : chars >= 4 ? name.slice(0, chars - 1) + '…' : ''
}

/** Segments for the sub-spans of a bar spanning [barX1, barX2]; their labels start after the bar's own. */
function layoutSegments(t: Track, barId: string, barX1: number, barX2: number, labelEnd: number) {
  const inTrack = new Map(t.durations.map((d) => [d.id, d]))
  const xs = (d: Span) => [yearToX(d.startYear, props.view, width.value), yearToX(d.endYear, props.view, width.value)] as const
  const revealed = (id: string) => {
    const d = inTrack.get(id)
    if (!d) return false
    const [a, b] = xs(d)
    return b - a >= SUB_REVEAL_PX || lit(id)
  }
  return revealedSubSpans(barId, props.spanParents, revealed).flatMap(({ id, depth }) => {
    const d = inTrack.get(id)!
    const [a, b] = xs(d)
    const x = Math.max(a, barX1)
    const w = Math.min(b, barX2) - x
    if (w < 2) return []
    const labelX = Math.max(x + 4, labelEnd + 8)
    const label = depth === 1 ? fitLabel(d.name, x + w - labelX - 2) : ''
    return [{
      d,
      x,
      w,
      inset: depth * 2, // nested deeper = thinner
      label,
      labelX,
      family: familyFor(d.categories),
      tooltip: `${formatSpan(d, formatYear)} — ${d.name} (part of a longer span)`,
    }]
  })
}

const layouts = computed(() => {
  const sectionIds = new Set(milestoneLines.value.map((m) => m.id))
  return tracks.value.map((t) => {
    const markers = layoutMarkers(t, sectionIds)
    const shown = new Set(markers.map((m) => m.event.id))
    // Detailed: an event that passes the threshold but finds no room for a label is still marked,
    // smaller and unlabelled (doc 21 §6.8), rather than left as a faint hint.
    const minImp = props.density === 'detailed' ? importanceThreshold(span(props.view), props.detail) : Infinity
    const unshown = t.events.filter((e) => !shown.has(e.id))
    const quiet = unshown
      .filter((e) => e.importance >= minImp)
      .map((e) => {
        const family = familyFor(e.categories)
        return {
          event: e, family, shape: shapeOf(family), x: yearToX(e.year, props.view, width.value),
          tooltip: `${formatEventYear(e.year, e.approximate)} — ${e.name}`,
        }
      })
    const hiddenDots = unshown
      .filter((e) => e.importance < minImp)
      .map((e) => ({ id: e.id, x: yearToX(e.year, props.view, width.value) }))
    return { ...t, markers, quiet, hiddenDots, bars: layoutBars(t) }
  })
})

// ── Date Constellation (issues #5–#7) ───────────────────────────────────────
const DOT_MARGIN = 5 // keeps a dot clear of its track's edges
// 2d: spans as thin bars along the bottom of their track (not on Empires & states, whose rows are spans)
const C_BAR_H = 10
const C_BAR_ROWS = 2
const C_BAR_ZONE = C_BAR_ROWS * (C_BAR_H + 2) + 2
const C_BAR_MIN_IMPORTANCE = 5

const constellation = computed(() => {
  if (props.mode !== 'constellation') return null
  const axis = props.trackAxis
  const minImp = constellationThreshold(props.detail)
  const shown = inView.value.filter((e) => e.importance >= minImp || kept(e.id))
  // Empires & states: a row per state in view, and an event of two states on both rows
  const states = axis === 'states' ? stateTracks(shown, props.eventStates, props.stateSpans, props.spanParents) : null
  const defs = states ? states.tracks : tracksFor(axis)
  const of = (e: Event) => (states ? states.of(e.id) : [trackOf(e, axis as Exclude<TrackAxis, 'states'>)])
  // A switched-off track holding a ringed item in view (a journey stop, a story, a search) opens while the
  // ring lasts; otherwise the ring dims everything and lights nothing (Society hides every empire this way)
  const ringedOn = new Set<string>()
  if (dimming.value) {
    for (const e of shown) if (lit(e.id)) of(e).forEach((id) => ringedOn.add(id))
    if (axis !== 'states') {
      for (const d of props.durations) {
        if (lit(d.id) && d.endYear >= props.view.start && d.startYear <= props.view.end) ringedOn.add(spanTrack(d, axis))
      }
    }
  }
  const hidden = hiddenOn(props.hiddenTracks, axis).filter((id) => !ringedOn.has(id))
  const tracks = layoutTracks(defs, hidden, ERA_SPACE, height.value - ERA_SPACE - TICK_STRIP)
    .map((t) => {
      if (t.start === undefined || t.end === undefined || !t.on) return { ...t, band: null }
      const x = Math.max(-2, yearToX(t.start, props.view, width.value))
      return { ...t, band: { x, w: Math.max(0, Math.min(width.value + 2, yearToX(t.end, props.view, width.value)) - x) } }
    })
  const byId = new Map(tracks.map((t) => [t.id, t]))
  const withBars = axis !== 'states' && props.density !== 'simple'
  const zone = withBars ? C_BAR_ZONE : 0
  const bars = withBars ? constellationBars(tracks, axis as Exclude<TrackAxis, 'states'>) : []
  const dots = shown
    .flatMap((e) => of(e).map((id) => ({ e, t: byId.get(id)! })))
    .filter(({ t }) => t.on)
    .map(({ e, t }) => {
      const r = dotRadius(e.importance)
      const h = Math.max(0, t.h - zone) // dots keep clear of the span bars at the bottom
      const spread = Math.max(0, h / 2 - DOT_MARGIN - r)
      return {
        key: `${e.id}@${t.id}`,
        event: e,
        x: yearToX(e.year, props.view, width.value),
        y: t.top + h / 2 + scatter(e.id) * spread,
        r,
        family: familyFor(e.categories),
        shape: shapeOf(familyFor(e.categories)),
      }
    })
    // Big dots underneath, so the small ones near them stay visible and clickable.
    .sort((a, b) => b.r - a.r)
  return { tracks, dots, bars }
})

/** A span's Constellation track. An empire is political whatever else it did: on Society it goes with politics and war. */
function spanTrack(d: Span, axis: Exclude<TrackAxis, 'states'>) {
  return axis === 'society' && d.kind === 'state' ? 'politics-war' : trackOf(d, axis)
}

/** The spans in view on each track that is on: important or ringed ones, packed into two thin rows. */
function constellationBars(tracks: { id: string; top: number; h: number; on: boolean }[], axis: Exclude<TrackAxis, 'states'>) {
  const { start, end } = props.view
  const byTrack = new Map<string, Span[]>()
  for (const d of props.durations) {
    if (d.endYear < start || d.startYear > end) continue
    // A ringed span (a journey stop, a connection) always gets a bar, even a life or a sub-span
    if (!lit(d.id) && (d.person || props.spanParents.has(d.id) || d.importance < C_BAR_MIN_IMPORTANCE)) continue
    const id = spanTrack(d, axis)
    byTrack.set(id, [...(byTrack.get(id) ?? []), d])
  }
  return tracks.flatMap((t) => {
    const ds = t.on ? byTrack.get(t.id) ?? [] : []
    const at = new Map(ds.map((d) => {
      const x1 = Math.max(-2, yearToX(d.startYear, props.view, width.value))
      return [d.id, { d, x1, x2: Math.min(width.value + 2, yearToX(d.endYear, props.view, width.value)) }]
    }))
    const items = [...at.values()].map(({ d, x1, x2 }) => ({ id: d.id, x1, x2, priority: d.importance + (lit(d.id) ? 100 : 0) }))
    return packBars(items, C_BAR_ROWS, 4).map(({ id, row }) => {
      const { d, x1, x2 } = at.get(id)!
      const w = Math.max(2, x2 - x1)
      return {
        d,
        x: x1,
        y: t.top + t.h - C_BAR_ZONE + 2 + row * (C_BAR_H + 2),
        w,
        family: familyFor(d.categories),
        label: fitLabel(d.name, w - 8),
        labelX: Math.max(x1, 0) + 4,
        tooltip: `${formatSpan(d, formatYear)} — ${d.name}`,
      }
    })
  })
}

const hoveredDot = ref<{ event: Event; x: number; y: number } | null>(null)
function onDotHover(e: Event, ev: PointerEvent) {
  if (dragging.value || ev.pointerType === 'touch') return
  hoveredDot.value = { event: e, ...pointIn(ev) }
}
watch(() => props.view, () => (hoveredDot.value = null))

const DOT_CARD_W = 240
const dotCard = computed(() => {
  const h = hoveredDot.value
  if (!h || props.mode !== 'constellation') return null
  const text = h.event.description.length > 140 ? h.event.description.slice(0, 139).trimEnd() + '…' : h.event.description
  const left = clamp(h.x + 14, 4, Math.max(4, width.value - DOT_CARD_W - 4))
  const top = h.y > height.value - 130 ? h.y - 120 : h.y + 14
  return { year: formatEventYear(h.event.year, h.event.approximate), name: h.event.name, text, left, top }
})

// ── Spotlight: the current stop, ringed and named ─────────────────────────────
const SPOT_CHAR_W = 6.6 // rough width of one character of the tag, for sizing its pill
const SPOT_MAX_CHARS = 48

function spotTag(text: string, x: number, top: number, bottom: number) {
  const t = text.length > SPOT_MAX_CHARS ? text.slice(0, SPOT_MAX_CHARS - 1).trimEnd() + '…' : text
  const w = t.length * SPOT_CHAR_W + 18
  // Above the item when there's room under the era strip, else below it
  const above = top - 30 >= ERA_SPACE
  const y = above ? top - 30 : bottom + 10
  const tx = clamp(x - w / 2, 4, Math.max(4, width.value - w - 4))
  const leader = above ? { x: clamp(x, tx + 8, tx + w - 8), y1: y + 20, y2: top - 2 } : { x: clamp(x, tx + 8, tx + w - 8), y1: bottom + 2, y2: y }
  return { x: tx, y, w, text: t, leader }
}

const spotlights = computed(() => {
  const ids = props.spotlightIds
  if (!ids?.size) return []
  const out: { key: string; dot?: { x: number; y: number; r: number }; bar?: { x: number; y: number; w: number; h: number }; tag?: ReturnType<typeof spotTag> }[] = []
  const eventTag = (e: Event) => `${formatEventYear(e.year, e.approximate)} · ${e.name}`
  const spanTag = (d: Span) => `${formatSpan(d, formatYear)} · ${d.name}`
  const barSpot = (key: string, d: Span, x: number, y: number, w: number, h: number) => {
    const x1 = Math.max(x, 0)
    const x2 = Math.min(x + w, width.value)
    out.push({ key, bar: { x, y, w, h }, tag: spotTag(spanTag(d), (x1 + x2) / 2, y, y + h) })
  }
  const c = constellation.value
  if (c) {
    for (const d of c.dots) if (ids.has(d.event.id)) out.push({ key: d.key, dot: d, tag: spotTag(eventTag(d.event), d.x, d.y - d.r, d.y + d.r) })
    for (const b of c.bars) if (ids.has(b.d.id)) barSpot(b.d.id, b.d, b.x, b.y, b.w, C_BAR_H)
    return out
  }
  for (const t of layouts.value) {
    // A labelled marker already carries its name: the ring alone marks it
    for (const m of t.markers) if (ids.has(m.event.id)) out.push({ key: `${t.id}:${m.event.id}`, dot: { x: m.x, y: t.axisY, r: m.radius } })
    for (const q of t.quiet) {
      if (ids.has(q.event.id)) out.push({ key: `${t.id}:${q.event.id}`, dot: { x: q.x, y: t.axisY, r: QUIET_R }, tag: spotTag(eventTag(q.event), q.x, t.axisY - QUIET_R, t.axisY + QUIET_R) })
    }
    for (const h of t.hiddenDots) {
      const e = ids.has(h.id) ? t.events.find((x) => x.id === h.id) : undefined
      if (e) out.push({ key: `${t.id}:${h.id}`, dot: { x: h.x, y: t.axisY, r: 4 }, tag: spotTag(eventTag(e), h.x, t.axisY - 4, t.axisY + 4) })
    }
    for (const b of t.bars) {
      if (ids.has(b.d.id)) barSpot(`${t.id}:${b.d.id}`, b.d, b.x, b.y, b.w, BAR_H)
      for (const sg of b.segments) if (ids.has(sg.d.id)) barSpot(`${t.id}:${sg.d.id}`, sg.d, sg.x, b.y, sg.w, BAR_H)
    }
  }
  return out
})

// ── Story threads (Phase 9) ──────────────────────────────────────────────────
const ARC_KIND: Record<string, Arc['kind']> = {
  triggered: 'trigger', caused: 'trigger', contributed_to: 'contrib', enabled: 'enable', influenced: 'influence',
  began: 'frame', ended: 'frame', preceded: 'then',
}
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

/** The axis a story node sits on: the World track, or its lane's track (null if that lane is hidden). */
function axisFor(n: StoryNode): number | null {
  if (props.mode === 'world') return layouts.value[0]?.axisY ?? null
  return layouts.value.find((t) => t.id === n.lane)?.axisY ?? null
}


function shortGap(e: StoryEdge, a: StoryNode, b: StoryNode): string {
  const n = Math.abs(yearGap(joinFrom(a, b), joinTo(b, a)))
  if (n < 2) return ''
  return `${a.approximate || b.approximate ? '~' : '+'}${n.toLocaleString()} yrs`
}

const storyArcs = computed<Arc[]>(() => {
  const s = props.story
  if (!s) return []
  const byId = new Map(s.nodes.map((n) => [n.id, n]))
  const arcs: Arc[] = []
  const ordered = [...s.edges].sort((p, q) => byId.get(p.to)!.year - byId.get(q.to)!.year)
  ordered.forEach((e, order) => {
    const a = byId.get(e.from)
    const b = byId.get(e.to)
    if (!a || !b) return
    const ya = axisFor(a)
    const yb = axisFor(b)
    if (ya === null || yb === null) return
    const x1 = yearToX(joinFrom(a, b), props.view, width.value)
    const x2 = yearToX(joinTo(b, a), props.view, width.value)
    const dx = Math.abs(x2 - x1)
    const lift = clamp(dx * 0.35, 22, Math.max(30, Math.min(ya, yb) - ERA_SPACE - 8))
    // Same year (a beginning, or two events in one year): a small loop, so the thread still shows.
    const d = dx < 8 && ya === yb
      ? `M ${x1} ${ya} C ${x1 - 18} ${ya - 34}, ${x2 + 18} ${yb - 34}, ${x2 + 1} ${yb}`
      : ya === yb
        ? `M ${x1} ${ya} C ${x1} ${ya - lift}, ${x2} ${yb - lift}, ${x2} ${yb}`
        : `M ${x1} ${ya} C ${x1} ${ya - lift}, ${x2} ${yb - lift * 0.6}, ${x2} ${yb}`
    const label = dx > 90 ? shortGap(e, a, b) : ''
    arcs.push({
      key: `${e.from}>${e.to}`, d, kind: ARC_KIND[e.type] ?? 'then', debated: e.debated, order,
      label, labelX: (x1 + x2) / 2, labelY: Math.min(ya, yb) - lift * 0.75 - 4, to: e.to,
      fromName: a.name, toName: b.name, verb: e.label, why: e.why,
      gap: gapText(joinFrom(a, b), joinTo(b, a), !!(a.approximate || b.approximate)),
    })
  })
  return arcs
})

/**
 * Where a current is drawn. World: one band above the span bars (like story backdrops). Lanes: a regional
 * current stays in its own lane (the Renaissance never washes over East Asia); a Global one spans them all.
 */
function currentArea(region: string): { top: number; h: number } | null {
  if (props.mode === 'world') return { top: ERA_SPACE, h: (layouts.value[0]?.bandTop ?? height.value) - ERA_SPACE }
  const lane = laneFor(region)
  if (lane === 'global') return { top: ERA_SPACE, h: height.value - TICK_STRIP - ERA_SPACE }
  const i = layouts.value.findIndex((t) => t.id === lane)
  if (i === -1) return null // its lane is hidden
  const next = layouts.value[i + 1]?.top ?? height.value - TICK_STRIP
  return { top: layouts.value[i]!.top, h: next - layouts.value[i]!.top }
}

const currentBands = computed(() => {
  if (!props.currents?.length) return []
  const drawable = props.currents.filter((d) => currentArea(d.region))
  const byId = new Map(drawable.map((d) => [d.id, d]))
  return pickCurrents(drawable, props.view.start, props.view.end).map((c) => {
    const { top, h } = currentArea(c.region)!
    const x1 = Math.max(0, yearToX(c.startYear, props.view, width.value))
    const x2 = Math.min(width.value, yearToX(c.endYear, props.view, width.value))
    const years = formatSpan(byId.get(c.id)!, formatYear)
    // Name and years when they fit, the name alone when only it fits, nothing when neither does.
    // In Lanes, keep clear of the first lane's name at the left edge.
    const labelX = Math.max(x1, props.mode === 'lanes' ? LANE_NAME_W : 0) + 6
    const room = x2 - labelX - 6
    const full = `${c.name} · ${years}`
    const label = full.length * 6.4 <= room ? full : c.name.length * 6.4 <= room ? c.name : ''
    return { ...c, x1, x2, top, h, years, label, labelX,
             startIn: c.startYear >= props.view.start, endIn: c.endYear <= props.view.end }
  })
})

const storyBackdrops = computed(() => {
  const s = props.story
  if (!s) return []
  const h = (layouts.value[0]?.bandTop ?? height.value) - ERA_SPACE
  return s.backdrops.map((b) => {
    const x = yearToX(b.year, props.view, width.value)
    const x2 = yearToX(b.endYear ?? b.year, props.view, width.value)
    return { id: b.id, name: b.name, x, w: Math.max(2, x2 - x), h: props.mode === 'world' ? h : height.value - ERA_SPACE }
  })
})

/** Span stops have no marker on the axis, so each gets a small square where its threads join. */
const storySpanMarks = computed(() => {
  const s = props.story
  if (!s) return []
  return s.nodes
    .filter((n) => n.kind === 'span')
    .map((n) => {
      const y = axisFor(n)
      const x1 = yearToX(n.year, props.view, width.value)
      const x2 = yearToX(n.endYear ?? n.year, props.view, width.value)
      return y === null ? null : { id: n.id, name: n.name, x1, x2, y }
    })
    .filter((m): m is NonNullable<typeof m> => !!m)
})

const storyPulse = computed(() => {
  const s = props.story
  const n = s && props.stepId ? s.nodes.find((x) => x.id === props.stepId) : null
  const y = n ? axisFor(n) : null
  return n && y !== null ? { x: yearToX(n.year, props.view, width.value), y } : null
})

/** During playback: the arcs leading into the current stop stay bright, the rest step back. */
const stepEdgeKeys = computed(() => {
  if (!props.story || !props.stepId) return null
  return new Set(props.story.edges.filter((e) => e.to === props.stepId).map((e) => `${e.from}>${e.to}`))
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

// Shift-drag (mouse) selects a period instead of panning.
const selectFrom = ref<number | null>(null)
const selectTo = ref(0)
const selection = computed(() => {
  if (selectFrom.value === null) return null
  const x = Math.min(selectFrom.value, selectTo.value)
  const w = Math.abs(selectTo.value - selectFrom.value)
  const y1 = Math.round(xToYear(x, props.view, width.value))
  const y2 = Math.round(xToYear(x + w, props.view, width.value))
  return { x, w, label: `${formatYear(y1)} – ${formatYear(y2)}`, y1, y2 }
})

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
  if (e.shiftKey && e.pointerType === 'mouse') {
    selectFrom.value = selectTo.value = localX(e.clientX)
    justDragged = false
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    return
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
  if (selectFrom.value !== null) {
    selectTo.value = Math.min(Math.max(localX(e.clientX), 0), width.value)
    return
  }
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

  if (selectFrom.value !== null) {
    const sel = selection.value
    selectFrom.value = null
    if (sel && sel.w > 8) {
      justDragged = true // don't let the release also count as a click on a marker
      emit('selectRange', sel.y1, sel.y2)
    }
    return
  }

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

function onBackgroundClick() {
  pinned.value = null
  if (!justDragged) emit('backgroundClick')
}

function onMarkerClick(id: string) {
  if (justDragged) return
  emit('select', id)
}

function onBarClick(id: string) {
  if (justDragged) return
  emit('selectDuration', id)
}

// The connection card (doc 17): hovering a thread shows it; a click or tap pins it until closed.
const hovered = ref<{ key: string; x: number; y: number } | null>(null)
const pinned = ref<{ key: string; x: number; y: number } | null>(null)
const cardArc = computed(() => {
  const at = pinned.value ?? hovered.value
  const arc = at && storyArcs.value.find((a) => a.key === at.key)
  return arc ? { arc, x: at.x, y: at.y } : null
})
// A new story, or a pan or zoom that moves the threads, closes the card.
watch([() => props.story, () => props.view], () => {
  hovered.value = null
  pinned.value = null
})

function pointIn(e: MouseEvent) {
  const box = containerEl.value?.getBoundingClientRect()
  return { x: e.clientX - (box?.left ?? 0), y: e.clientY - (box?.top ?? 0) }
}

function onArcHover(key: string | null, e: PointerEvent) {
  hovered.value = key && !dragging.value ? { key, ...pointIn(e) } : null
}

function onArcClick(key: string, e: MouseEvent) {
  if (justDragged) return
  pinned.value = { key, ...pointIn(e) }
  const arc = storyArcs.value.find((a) => a.key === key)
  if (arc) emit('selectStop', arc.to)
}
</script>

<style scoped>
.current-band {
  fill: var(--df-current);
}
.current-edge {
  stroke: var(--df-current-edge);
  stroke-width: 1;
}
.current-edge.approx {
  stroke-dasharray: 3 3;
}
.current-label {
  fill: var(--df-current-text);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
  paint-order: stroke;
  stroke: var(--df-bg);
  stroke-width: 3px;
}
.current-label:hover {
  text-decoration: underline;
}
.era-label {
  fill: var(--df-muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.milestone-line {
  stroke: var(--df-milestone);
  stroke-width: 1.5;
  stroke-dasharray: 6 4;
  pointer-events: none;
}
.milestone-hit {
  stroke: transparent;
  stroke-width: 9;
  pointer-events: stroke;
}
.milestone-tag {
  fill: var(--df-bg);
  stroke: var(--df-milestone);
  stroke-width: 1;
}
.milestone-tag-text {
  fill: var(--df-text-2);
  font-size: 10px;
  font-weight: 600;
  pointer-events: none;
}
.milestone:hover .milestone-line {
  stroke: var(--df-text);
  stroke-dasharray: none;
}
.milestone:hover .milestone-tag {
  stroke: var(--df-text);
}
.lane-rule {
  stroke: var(--df-border-soft);
}
.track-toggle {
  cursor: pointer;
}
.c-bar-text {
  font-size: 9px;
}
/* Constellation is about the dots: its span bars sit back */
.c-bar:not(.period) .bar-rect {
  fill-opacity: 0.22;
}
.state-band {
  fill: var(--df-text-2);
  fill-opacity: 0.07;
  stroke: var(--df-text-2);
  stroke-opacity: 0.18;
}
.track-pill {
  fill: var(--df-bg);
  fill-opacity: 0.85;
  stroke: var(--df-border);
}
.track-toggle:hover .track-pill,
.track-toggle:focus-visible .track-pill {
  stroke: var(--df-text-2);
}
.track-toggle:focus {
  outline: none;
}
.track-dot {
  fill: var(--df-text-2);
  stroke: var(--df-text-2);
  stroke-width: 1.2;
}
.track-toggle.off .track-dot {
  fill: none;
}
.track-toggle.off .lane-label {
  fill: var(--df-muted);
}
.lane-label {
  fill: var(--df-text-2);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  paint-order: stroke;
  stroke: var(--df-bg);
  stroke-width: 4px;
}
.tick-label {
  fill: var(--df-text-2);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.hidden-dot {
  fill: var(--df-muted);
  opacity: 0.6;
}
/* A highlighted connection with no room for a label still shows, as a ringed dot */
.hidden-dot.lit {
  fill: var(--df-text-2);
  stroke: var(--df-text);
  stroke-width: 2;
  opacity: 1;
}
.label-bg {
  fill: var(--df-surface);
  stroke: var(--df-border);
}
.label-text {
  fill: var(--df-text);
  font-size: 11px;
}
.label-text.anchor {
  font-weight: 700;
}
.band-title {
  fill: var(--df-muted);
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
/* A person's life: a rounded pill, between an empire's fill and a period's */
.bar.person .bar-rect {
  fill-opacity: 0.25;
}
.bar:hover .bar-rect,
.bar.selected .bar-rect {
  stroke: var(--df-text);
  stroke-width: 1.5;
}
/* Phases: the bar's own fill steps aside, and each phase fills by kind (strongest at its height) */
.bar-rect.phased {
  fill-opacity: 0;
  pointer-events: none; /* hovering reaches the phase underneath (its own tooltip) */
}
.phase-rect {
  stroke: var(--df-bg);
  stroke-width: 1;
}
.phase.kind-foundation .phase-rect,
.phase.kind-end .phase-rect {
  fill-opacity: 0.18;
}
.phase.kind-contraction .phase-rect {
  fill-opacity: 0.3;
}
.phase.kind-transformation .phase-rect {
  fill-opacity: 0.45;
}
.phase.kind-expansion .phase-rect,
.phase.kind-consolidation .phase-rect {
  fill-opacity: 0.6;
}
.phase.kind-height .phase-rect {
  fill-opacity: 0.85;
}
.segment-rect {
  fill-opacity: 0.85;
  stroke: var(--df-bg);
  stroke-width: 1;
}
.segment:hover .segment-rect,
.segment.selected .segment-rect,
.segment.lit .segment-rect {
  stroke: var(--df-text);
  stroke-width: 1.5;
}
.segment-text {
  fill: var(--df-text);
  font-size: 10px;
  font-weight: 600;
  pointer-events: none;
  paint-order: stroke;
  stroke: var(--df-bg);
  stroke-width: 3px;
}
.bar-text {
  fill: var(--df-text);
  font-size: 10px;
  pointer-events: none;
}
.bar-text.halo {
  font-weight: 600;
  paint-order: stroke;
  stroke: var(--df-bg);
  stroke-width: 3px;
}
.selection {
  fill: var(--df-text);
  fill-opacity: 0.07;
  stroke: var(--df-text-2);
  stroke-dasharray: 4 3;
}
.selection-label {
  fill: var(--df-text);
  font-size: 12px;
  font-weight: 700;
  paint-order: stroke;
  stroke: var(--df-bg);
  stroke-width: 4px;
}
.marker:hover .label-bg,
.marker.selected .label-bg {
  stroke: var(--df-text);
  stroke-width: 1.5;
}
/* "Show connections": the ringed item and its links stand out, everything else steps back */
.marker.lit .label-bg,
.bar.lit .bar-rect {
  stroke: var(--df-text);
  stroke-width: 2;
}
.dimmed {
  opacity: 0.25;
}
.faded {
  opacity: 0.15;
}
.track-band {
  fill: var(--df-era);
}
.star {
  fill-opacity: 0.85;
  stroke: var(--df-bg);
  stroke-width: 1;
}
.star:hover,
.star.selected,
.star.lit {
  fill-opacity: 1;
  stroke: var(--df-text);
  stroke-width: 2;
}
/* A spotlit marker's own label takes the spotlight colour */
.marker.spot .label-bg,
.marker.spot.lit .label-bg {
  fill: var(--df-spot);
  stroke: var(--df-spot);
}
.marker.spot .label-text,
.marker.spot .label-text.anchor {
  fill: var(--df-spot-text);
}
.spot-ring {
  fill: none;
  stroke: var(--df-spot);
  stroke-width: 3;
}
.spot-pulse {
  fill: none;
  stroke: var(--df-spot);
  stroke-width: 2.5;
  animation: spot-pulse 1.4s ease-out infinite;
  transform-box: fill-box;
  transform-origin: center;
}
.spot-bar {
  fill: none;
  stroke: var(--df-spot);
  stroke-width: 3;
}
.spot-leader {
  stroke: var(--df-spot);
  stroke-width: 1.5;
}
.spot-tag {
  fill: var(--df-spot);
}
.spot-tag-text {
  fill: var(--df-spot-text);
  font-size: 11px;
  font-weight: 700;
}
@keyframes spot-pulse {
  0% {
    transform: scale(1);
    opacity: 0.9;
  }
  100% {
    transform: scale(2);
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .spot-pulse {
    animation: none;
    opacity: 0;
  }
}
.dot-card {
  position: absolute;
  width: 240px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--df-border);
  background: var(--df-surface);
  color: var(--df-text);
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.25);
  pointer-events: none;
  z-index: 30;
}
.dot-card-year {
  color: var(--df-text-2);
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.dot-card-name {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.25;
}
.dot-card-text {
  margin-top: 4px;
  color: var(--df-text-2);
  font-size: 12px;
  line-height: 1.35;
}
.tm-line {
  stroke: var(--df-approx-border);
  stroke-width: 2;
}
.tm-pill {
  fill: var(--df-approx-border);
}
.tm-pill-text {
  fill: var(--df-bg);
  font-size: 11px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.tm-band {
  fill: var(--df-approx-bg);
}
.tm-bracket {
  stroke: var(--df-approx-border);
  stroke-width: 2;
}
.tm-tick {
  stroke: var(--df-approx-border);
  stroke-width: 1.5;
  stroke-dasharray: 4 3;
}
.tm-label {
  fill: var(--df-approx);
  font-size: 12px;
  font-weight: 800;
  paint-order: stroke;
  stroke: var(--df-bg);
  stroke-width: 4px;
}
.backdrop {
  fill: var(--df-backdrop);
}
.backdrop-label {
  fill: var(--df-text-2);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
</style>
