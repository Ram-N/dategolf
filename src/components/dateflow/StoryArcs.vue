<template>
  <!-- Story threads (Phase 9), drawn inside the timeline's <svg>. Decorative: the story panel is the accessible version.
       Only the invisible hit paths take the pointer: hover shows the link's "why", a click picks its stop. -->
  <g aria-hidden="true" pointer-events="none" class="story-arcs">
    <defs>
      <marker
        v-for="k in KINDS"
        :id="`arrow-${k}`"
        :key="k"
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="7"
        markerHeight="7"
        orient="auto-start-reverse"
      >
        <path d="M0,0 L10,5 L0,10 z" :fill="`var(--df-arc-${k})`" />
      </marker>
    </defs>

    <path
      v-for="a in arcs"
      :key="a.key"
      :d="a.d"
      pathLength="1"
      class="arc"
      :class="[a.kind, { debated: a.debated, faded: stepEdgeKeys && !stepEdgeKeys.has(a.key) }]"
      :style="{ animationDelay: `${a.order * 0.12}s`, stroke: `var(--df-arc-${a.kind})` }"
      :marker-end="`url(#arrow-${a.kind})`"
    />
    <path
      v-for="a in arcs"
      :key="`${a.key}-hit`"
      :d="a.d"
      class="hit"
      pointer-events="stroke"
      @click.stop="emit('pick', a.to)"
    >
      <title>{{ a.title }}</title>
    </path>
    <template v-for="a in arcs" :key="`${a.key}-label`">
      <text v-if="a.label" :x="a.labelX" :y="a.labelY" text-anchor="middle" class="gap" :style="{ fill: `var(--df-arc-${a.kind})` }">
        {{ a.label }}
      </text>
    </template>

    <!-- Span stops have no marker on the axis: a small square at each end of the span's years -->
    <g v-for="s in spans" :key="s.id" class="span-mark">
      <rect :x="s.x1 - 4" :y="s.y - 4" width="8" height="8" rx="1.5" />
      <rect :x="s.x2 - 4" :y="s.y - 4" width="8" height="8" rx="1.5" />
      <title>{{ s.name }}</title>
    </g>

    <!-- During playback, the current stop pulses -->
    <circle v-if="pulse" :cx="pulse.x" :cy="pulse.y" r="9" class="pulse" />
  </g>
</template>

<script setup lang="ts">
export interface Arc {
  key: string
  d: string
  kind: 'trigger' | 'contrib' | 'enable' | 'influence' | 'frame' | 'then'
  debated: boolean
  order: number
  label: string
  labelX: number
  labelY: number
  to: string // the stop this thread leads into
  title: string // hover text: "A contributed to B: why"
}

const KINDS = ['trigger', 'contrib', 'enable', 'influence', 'frame', 'then'] as const

defineProps<{
  arcs: Arc[]
  spans: { id: string; name: string; x1: number; x2: number; y: number }[]
  pulse: { x: number; y: number } | null
  stepEdgeKeys: Set<string> | null // during playback: the arcs into the current stop stay bright
}>()
const emit = defineEmits<{ pick: [toId: string] }>()
</script>

<style scoped>
.arc {
  fill: none;
  stroke-width: 2.25;
  stroke-linecap: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: draw 0.6s ease-out forwards;
}
.hit {
  fill: none;
  stroke: transparent;
  stroke-width: 12;
  cursor: pointer;
}
.arc.then {
  stroke-width: 1.5;
}
.arc.trigger {
  stroke-width: 3;
}
.arc.influence {
  stroke-dasharray: 0.01 0.02; /* dotted */
  stroke-dashoffset: 0;
  animation: fade 0.6s ease-out both;
}
.arc.debated {
  stroke-dasharray: 0.03 0.02; /* dashed: a debated link */
  stroke-dashoffset: 0;
  animation: fade 0.6s ease-out both;
}
.arc.faded {
  opacity: 0.25;
}
.span-mark rect {
  fill: var(--df-arc-frame);
  stroke: var(--df-bg);
  stroke-width: 1.5;
}
.gap {
  font-size: 10px;
  font-weight: 700;
  paint-order: stroke;
  stroke: var(--df-bg);
  stroke-width: 3px;
}
.pulse {
  fill: none;
  stroke: var(--df-text);
  stroke-width: 2.5;
  animation: pulse 1.4s ease-out infinite;
  transform-box: fill-box;
  transform-origin: center;
}
@keyframes draw {
  to {
    stroke-dashoffset: 0;
  }
}
@keyframes fade {
  from {
    opacity: 0;
  }
}
@keyframes pulse {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  100% {
    transform: scale(2.2);
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .arc,
  .arc.influence,
  .arc.debated {
    animation: none;
    stroke-dashoffset: 0;
  }
  .arc:not(.influence):not(.debated) {
    stroke-dasharray: none;
  }
  .pulse {
    animation: none;
  }
}
</style>
