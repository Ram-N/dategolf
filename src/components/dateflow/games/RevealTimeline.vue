<template>
  <div ref="containerEl" class="w-full">
    <svg v-if="width > 0" :width="width" :height="svgH" class="block" role="img" :aria-label="ariaLabel">
      <!-- One row per item (a "ladder"), so labels never collide; shared year axis below -->
      <line
        v-for="t in tickMarks"
        :key="t.year"
        :x1="t.x"
        :x2="t.x"
        y1="0"
        :y2="axisY"
        class="grid"
      />
      <g v-for="r in rows" :key="r.id">
        <line v-if="r.isSpan" :x1="r.x1" :x2="r.x2" :y1="r.y" :y2="r.y" :class="['span', r.tone]" stroke-width="8" stroke-linecap="round" />
        <circle v-else :cx="r.x1" :cy="r.y" r="6" :class="['dot', r.tone]" />
        <text :x="r.textX" :y="r.y + 4" :text-anchor="r.anchor" class="label" :class="r.tone">
          <tspan class="year">{{ r.when }}</tspan>
          <tspan dx="6">{{ r.mark }}{{ r.label }}</tspan>
        </text>
      </g>
      <line x1="0" :x2="width" :y1="axisY" :y2="axisY" class="axis" />
      <text v-for="t in tickMarks" :key="t.year" :x="t.x" :y="axisY + 14" :text-anchor="t.anchor" class="tick">
        {{ t.label }}
      </text>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { RevealItem } from '@/engine/dateflow/games/rounds'
import { formatTick, makeView, ticks, yearToX } from '@/engine/dateflow/timeScale'
import { formatYear } from '@/utils/formatYear'

// wrongIds: items the player got wrong (their pick, or events placed in the wrong position).
const props = defineProps<{ items: RevealItem[]; wrongIds?: string[] }>()

const ROW_H = 26
const PAD = 8
const CHAR_W = 7 // 12px text, erring wide so labels never overflow

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

const sorted = computed(() => [...props.items].sort((a, b) => a.start - b.start))
const axisY = computed(() => sorted.value.length * ROW_H + PAD)
const svgH = computed(() => axisY.value + 20)

// Fit all items with 15% margin either side (at least a decade so close events separate).
const view = computed(() => {
  const lo = Math.min(...props.items.map((i) => i.start))
  const hi = Math.max(...props.items.map((i) => i.end))
  const s = Math.max(hi - lo, 10)
  return makeView(lo - s * 0.15, s * 1.3)
})

const tickMarks = computed(() =>
  ticks(view.value, width.value, 70).map((year) => {
    const x = yearToX(year, view.value, width.value)
    // Edge labels hug the edge instead of being clipped.
    const anchor = x < 24 ? 'start' : x > width.value - 24 ? 'end' : 'middle'
    return { year, x, label: formatTick(year), anchor }
  }),
)

const rows = computed(() =>
  sorted.value.map((item, i) => {
    const x1 = yearToX(item.start, view.value, width.value)
    const x2 = yearToX(item.end, view.value, width.value)
    const isSpan = item.end > item.start
    const tone = props.wrongIds?.includes(item.id) ? 'wrong' : item.role
    const mark = tone === 'answer' ? '✓ ' : tone === 'wrong' ? '✗ ' : ''
    const when = isSpan ? `${formatYear(item.start)}–${formatYear(item.end)}` : formatYear(item.start)
    // Label goes on whichever side of the mark has more room; if it still doesn't fit
    // (narrow phones), the name is shortened — the full name is on the option buttons.
    const roomRight = width.value - (x2 + 12)
    const roomLeft = x1 - 12
    const right = roomRight >= roomLeft
    const room = Math.max(roomRight, roomLeft)
    const fixedChars = when.length + mark.length + 1
    const maxName = Math.floor(room / CHAR_W) - fixedChars
    const label = item.label.length <= maxName ? item.label : item.label.slice(0, Math.max(maxName - 1, 1)) + '…'
    return {
      id: item.id,
      y: PAD + i * ROW_H + ROW_H / 2,
      x1,
      x2,
      isSpan,
      tone,
      mark,
      when,
      label,
      textX: right ? x2 + 12 : x1 - 12,
      anchor: right ? 'start' : 'end',
    }
  }),
)

const ariaLabel = computed(() => sorted.value.map((i) => `${formatYear(i.start)} ${i.label}`).join('; '))
</script>

<style scoped>
.grid {
  stroke: var(--df-grid);
}
.axis {
  stroke: var(--df-axis);
  stroke-width: 1.5;
}
.tick {
  fill: var(--df-text-2);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}
/* Status colours (with ✓ / ✗ marks, never colour alone): answer = good, wrong pick = critical. */
.dot,
.span {
  fill: var(--df-text-2);
  stroke: var(--df-text-2);
}
.dot.answer,
.span.answer {
  fill: #0ca30c;
  stroke: #0ca30c;
}
.dot.wrong,
.span.wrong {
  fill: #d03b3b;
  stroke: #d03b3b;
}
.dot.context {
  fill: var(--df-text);
  stroke: var(--df-text);
}
.span.other,
.span.context {
  stroke-opacity: 0.45;
}
.label {
  fill: var(--df-text);
  font-size: 12px;
}
.label.other {
  fill: var(--df-text-2);
}
.year {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
</style>
