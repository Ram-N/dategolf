<template>
  <div class="life-cycle">
    <p class="label">Life cycle of the {{ name }}</p>
    <!-- One segment per phase, as wide as its years, shaded by kind as on the timeline -->
    <div class="strip" role="group" :aria-label="`Life cycle of the ${name}`">
      <button
        v-for="(s, i) in segments"
        :key="s.phase.start"
        class="seg"
        :class="[`kind-${s.phase.kind}`, { on: picked === i }]"
        :style="{ left: `${s.x / 10}%`, width: `${s.w / 10}%`, background: `var(--df-f-${family})` }"
        :aria-pressed="picked === i"
        :aria-label="`${PHASE_KIND_LABEL[s.phase.kind]}, ${formatPhase(s.phase, formatYear)}: ${s.phase.title}`"
        :title="`${PHASE_KIND_LABEL[s.phase.kind]} · ${formatPhase(s.phase, formatYear)} · ${s.phase.title}`"
        @click="pick(i)"
      />
    </div>
    <div class="ends">
      <span>{{ formatYear(start) }}</span>
      <span>{{ formatYear(end) }}</span>
    </div>
    <div v-if="phase" class="phase" aria-live="polite">
      <p class="phase-head">
        <span class="kind">{{ PHASE_KIND_LABEL[phase.kind] }}</span>
        <span class="years">{{ formatPhase(phase, formatYear) }}</span>
      </p>
      <p class="phase-title">{{ phase.title }}</p>
      <p class="phase-text">{{ phase.description }}</p>
      <p v-if="phase.approximate && phase.dateDisplay" class="approx">≈ Historians' dates: {{ phase.dateDisplay }}</p>
      <div class="phase-nav">
        <button class="mini" :disabled="picked === 0" aria-label="Earlier phase" @click="pick(picked! - 1)">‹</button>
        <span class="count">Phase {{ picked! + 1 }} of {{ segments.length }}</span>
        <button class="mini" :disabled="picked === segments.length - 1" aria-label="Later phase" @click="pick(picked! + 1)">›</button>
      </div>
    </div>
    <p v-else class="hint">Tap a phase to see it on the timeline.</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Phase } from '@/types/dateflow'
import type { Family } from '@/engine/dateflow/categoryGroups'
import { formatPhase, PHASE_KIND_LABEL, phaseSegments } from '@/engine/dateflow/durations'
import { formatYear } from '@/utils/formatYear'

// Phase 12's life cycles, up front (doc 18, 3d): a strip of an empire's phases, each one framing
// its years on the timeline when picked.
const props = defineProps<{ id: string; name: string; phases: Phase[]; start: number; end: number; family: Family }>()
const emit = defineEmits<{ show: [start: number, end: number] }>()

// Laid out on a 0–1000 scale, shown as percentages
const segments = computed(() =>
  phaseSegments(props.phases, (y) => ((y - props.start) / Math.max(1, props.end - props.start)) * 1000, 0, 1000),
)
const picked = ref<number | null>(null)
const phase = computed(() => (picked.value === null ? null : (segments.value[picked.value]?.phase ?? null)))
watch(() => props.id, () => (picked.value = null))

function pick(i: number) {
  picked.value = i
  const p = segments.value[i]!.phase
  emit('show', p.start, p.end)
}
</script>

<style scoped>
.life-cycle {
  margin-top: 0.75rem;
  padding: 0.625rem;
  border-radius: 0.5rem;
  background: var(--df-surface);
}
.label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--df-muted);
  margin-bottom: 0.375rem;
}
.strip {
  position: relative;
  height: 1.5rem;
  border-radius: 0.375rem;
  overflow: hidden;
  background: var(--df-btn);
}
.seg {
  position: absolute;
  top: 0;
  bottom: 0;
  border-right: 1.5px solid var(--df-surface);
  cursor: pointer;
}
.seg:hover,
.seg:focus-visible,
.seg.on {
  outline: 2px solid var(--df-text);
  outline-offset: -2px;
  z-index: 1;
}
/* The same shading by kind as the timeline's phased bars: strongest at the height */
.seg.kind-foundation,
.seg.kind-end {
  opacity: 0.25;
}
.seg.kind-contraction {
  opacity: 0.4;
}
.seg.kind-transformation {
  opacity: 0.55;
}
.seg.kind-expansion,
.seg.kind-consolidation {
  opacity: 0.7;
}
.seg.kind-height {
  opacity: 0.95;
}
.seg.on {
  opacity: 1;
}
.ends {
  display: flex;
  justify-content: space-between;
  margin-top: 0.125rem;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--df-text-2);
}
.phase {
  margin-top: 0.5rem;
}
.phase-head {
  display: flex;
  gap: 0.5rem;
  align-items: baseline;
  font-size: 12px;
}
.kind {
  font-weight: 700;
}
.years {
  font-variant-numeric: tabular-nums;
  color: var(--df-text-2);
}
.phase-title {
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1.35;
}
.phase-text {
  margin-top: 0.25rem;
  font-size: 0.8125rem;
  line-height: 1.5;
}
.approx {
  margin-top: 0.25rem;
  font-size: 12px;
  color: var(--df-approx);
}
.phase-nav {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-top: 0.5rem;
}
.mini {
  min-width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.375rem;
  background: var(--df-btn);
  font-weight: 700;
}
.mini:disabled {
  opacity: 0.4;
}
.count {
  font-size: 11px;
  color: var(--df-text-2);
  font-variant-numeric: tabular-nums;
}
.hint {
  margin-top: 0.375rem;
  font-size: 12px;
  color: var(--df-text-2);
}
</style>
