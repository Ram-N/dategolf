<template>
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" @click.self="emit('close')">
    <div
      class="card w-full max-w-md rounded-2xl border p-6 max-h-[85vh] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      :aria-label="`About: ${duration.name}`"
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest secondary">
            <span class="inline-block w-2.5 h-2.5 rounded-sm" :style="{ background: `var(--df-${group})` }" />
            {{ duration.kind === 'empire' ? 'Empire / dynasty' : 'Period' }}
          </div>
          <div class="text-2xl font-black tabular-nums mt-2 accent">{{ formatSpan(duration, formatYear) }}</div>
          <h2 class="text-xl font-bold mt-1">{{ duration.name }}</h2>
          <p class="text-xs mt-1 secondary">
            {{ lengthText }} · {{ duration.region }} · {{ duration.categories.join(' · ') }}
          </p>
        </div>
        <button class="close" aria-label="Close" @click="emit('close')">✕</button>
      </div>

      <p class="text-sm leading-relaxed mt-4">{{ duration.description }}</p>
      <div v-if="duration.approximate" role="note" class="approx rounded-lg border px-3 py-2 mt-3">
        <div class="text-xs font-bold uppercase tracking-widest">≈ Approximate dates</div>
        <p class="text-sm mt-1">Historians give different start and end years. These are conventional estimates.</p>
      </div>

      <EventConnections themed :groups="connections" @open-event="(id) => emit('openEvent', id)"
                        @open-duration="(id) => emit('openDuration', id)"
                        @show-on-timeline="emit('showConnections')" />

      <div v-if="related.length" class="mt-5">
        <h3 class="text-[11px] font-semibold uppercase tracking-widest secondary mb-2">
          Meanwhile in {{ duration.region }}
        </h3>
        <ul class="space-y-1">
          <li v-for="e in related" :key="e.id">
            <button class="related w-full text-left text-sm px-2 py-1.5 rounded-lg" @click="emit('openEvent', e.id)">
              <span class="font-mono tabular-nums secondary mr-2">{{ formatEventYear(e.year, e.approximate) }}</span>{{ e.name }}
            </button>
          </li>
        </ul>
      </div>

      <button class="show w-full mt-5 py-2.5 rounded-xl font-semibold text-sm" @click="emit('showOnTimeline')">
        Show on timeline
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import type { Event } from '@/types'
import type { Duration } from '@/types/dateflow'
import { eventsDuring, formatSpan } from '@/engine/dateflow/durations'
import { groupFor } from '@/engine/dateflow/categoryGroups'
import type { ConnectionGroup } from '@/engine/dateflow/connections'
import EventConnections from './EventConnections.vue'
import { formatEventYear, formatYear } from '@/utils/formatYear'

const props = defineProps<{ duration: Duration; events: Event[]; connections: ConnectionGroup[] }>()
const emit = defineEmits<{ close: []; openEvent: [id: string]; openDuration: [id: string]; showOnTimeline: []; showConnections: [] }>()

const group = computed(() => groupFor(props.duration.categories))
const related = computed(() => eventsDuring(props.events, props.duration))
const lengthText = computed(() => {
  // No year 0: a span crossing the BCE/CE boundary is one year shorter than the difference.
  const { startYear: s, endYear: e } = props.duration
  const years = e - s - (s < 0 && e > 0 ? 1 : 0)
  return `${props.duration.approximate ? '~' : ''}${Math.max(1, years).toLocaleString()} years`
})

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.approx {
  color: var(--df-approx);
  background: var(--df-approx-bg);
  border-color: var(--df-approx-border);
}
.card {
  background: var(--df-surface);
  border-color: var(--df-border);
  color: var(--df-text);
}
.secondary {
  color: var(--df-text-2);
}
.muted {
  color: var(--df-muted);
}
.accent {
  color: var(--df-text);
}
.close {
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  border-radius: 9999px;
  color: var(--df-text-2);
}
.close:hover {
  background: var(--df-btn);
  color: var(--df-text);
}
.related:hover {
  background: var(--df-btn);
}
.show {
  background: var(--df-btn);
  color: var(--df-text);
}
.show:hover {
  background: var(--df-btn-hover);
}
</style>
