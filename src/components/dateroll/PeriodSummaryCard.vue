<template>
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" @click.self="emit('close')">
    <div
      class="card w-full max-w-2xl rounded-2xl border p-6 max-h-[85vh] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Period summary"
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="text-[11px] font-semibold uppercase tracking-widest secondary">What happened</div>
          <h2 class="text-2xl font-black tabular-nums mt-1">
            {{ formatYear(Math.round(summary.start)) }} – {{ formatYear(Math.round(summary.end)) }}
          </h2>
          <p class="text-xs mt-1 secondary">
            {{ Math.round(summary.end - summary.start).toLocaleString() }} years ·
            {{ summary.total }} event{{ summary.total === 1 ? '' : 's' }}{{ filtered ? ' matching your filters' : '' }}
          </p>
        </div>
        <button class="close" aria-label="Close" @click="emit('close')">✕</button>
      </div>

      <section v-if="summary.empires.length" class="mt-5">
        <h3 class="heading">Empires &amp; dynasties</h3>
        <div class="flex flex-wrap gap-1.5">
          <button v-for="d in summary.empires.slice(0, MAX_CHIPS)" :key="d.id" class="chip" @click="emit('openDuration', d.id)">
            {{ d.name }}
          </button>
        </div>
      </section>

      <section v-if="summary.periods.length" class="mt-4">
        <h3 class="heading">Periods</h3>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="d in summary.periods.slice(0, MAX_CHIPS)"
            :key="d.id"
            class="chip period"
            @click="emit('openDuration', d.id)"
          >
            {{ d.name }}
          </button>
        </div>
      </section>

      <section v-if="summary.lanes.length" class="mt-5">
        <h3 class="heading">Around the world</h3>
        <div class="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <div v-for="l in summary.lanes" :key="l.lane">
            <div class="lane">{{ l.label }}</div>
            <button v-for="e in l.events" :key="e.id" class="row" @click="emit('openEvent', e.id)">
              <span class="year">{{ formatYear(e.year) }}</span><span>{{ e.name }}</span>
            </button>
          </div>
        </div>
      </section>
      <p v-else class="text-sm mt-5 secondary">No events in this period{{ filtered ? ' match your filters' : '' }}.</p>

      <button class="zoom w-full mt-5 py-2.5 rounded-xl font-semibold text-sm" @click="emit('zoomTo')">
        Zoom to this period
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import type { PeriodSummary } from '@/engine/dateroll/explore'
import { formatYear } from '@/utils/formatYear'

defineProps<{ summary: PeriodSummary; filtered: boolean }>()
const emit = defineEmits<{ close: []; openEvent: [id: string]; openDuration: [id: string]; zoomTo: [] }>()

const MAX_CHIPS = 12

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.card {
  background: var(--dr-surface);
  border-color: var(--dr-border);
  color: var(--dr-text);
}
.secondary {
  color: var(--dr-text-2);
}
.heading {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--dr-text-2);
  margin-bottom: 0.5rem;
}
.lane {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--dr-muted);
  margin-bottom: 0.125rem;
}
.row {
  display: flex; /* year column + name, so a wrapped name stays aligned */
  width: 100%;
  text-align: left;
  font-size: 0.8125rem;
  padding: 0.2rem 0.5rem;
  border-radius: 0.5rem;
}
.row:hover {
  background: var(--dr-btn);
}
.year {
  flex-shrink: 0;
  min-width: 4.75rem;
  margin-right: 0.5rem;
  font-family: ui-monospace, monospace;
  font-variant-numeric: tabular-nums;
  color: var(--dr-text-2);
}
.chip {
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--dr-btn);
  color: var(--dr-text);
  border: 1px solid var(--dr-border);
}
.chip.period {
  border-style: dashed;
}
.chip:hover {
  background: var(--dr-btn-hover);
}
.close {
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  border-radius: 9999px;
  color: var(--dr-text-2);
}
.close:hover {
  background: var(--dr-btn);
  color: var(--dr-text);
}
.zoom {
  background: var(--dr-btn);
  color: var(--dr-text);
}
.zoom:hover {
  background: var(--dr-btn-hover);
}
</style>
