<template>
  <!-- Band 2, time (doc 20): when am I looking? The History overview sits right under it. -->
  <div class="timebar flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 pt-2 pb-1">
    <div class="chips min-w-0">
      <div class="df-seg w-max" role="group" aria-label="Show an era" data-help="era">
        <button
          v-for="e in eras"
          :key="e.id"
          class="df-seg-btn era"
          :class="{ active: activeEra === e.id }"
          :aria-pressed="activeEra === e.id"
          :title="`${formatYear(e.start)} – ${formatYear(e.end)}`"
          @click="emit('showEra', e.id)"
        >
          {{ e.name }}
        </button>
        <button
          class="df-seg-btn era"
          :class="{ active: activeEra === 'all' }"
          :aria-pressed="activeEra === 'all'"
          title="All of history"
          @click="emit('reset')"
        >
          All
        </button>
      </div>
    </div>
    <div class="flex items-center gap-1">
      <button class="df-btn icon" aria-label="Zoom out" data-help="zoom" @click="emit('zoomOut')">−</button>
      <button class="df-btn icon" aria-label="Zoom in" data-help="zoom" @click="emit('zoomIn')">+</button>
    </div>
    <p class="text-sm tabular-nums range" data-help="view-range">
      {{ formatYear(Math.round(view.start)) }} – {{ formatYear(Math.round(view.end)) }}
      <span class="len">· {{ Math.round(view.end - view.start).toLocaleString() }} years</span>
    </p>
  </div>
</template>

<script setup lang="ts">
import type { Era, View } from '@/engine/dateflow/timeScale'
import { formatYear } from '@/utils/formatYear'

defineProps<{ view: View; eras: Era[]; activeEra: string | null }>()
const emit = defineEmits<{ zoomIn: []; zoomOut: []; reset: []; showEra: [id: string] }>()
</script>

<style scoped>
.range {
  color: var(--df-text-2);
  font-weight: 600;
}
.len {
  font-weight: 400;
}
.df-seg-btn.era {
  padding: 0 0.5rem;
}
@media (max-width: 639px) {
  /* Phone: the chips take a row and scroll sideways */
  .chips {
    flex-basis: 100%;
    overflow-x: auto;
    scrollbar-width: none;
  }
}
</style>
