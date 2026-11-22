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
            <span class="inline-block w-2.5 h-2.5 rounded-sm" :style="{ background: `var(--df-f-${family})` }" />
            {{ duration.person ? 'Person' : duration.kind === 'empire' ? 'Empire / dynasty' : 'Period' }}
          </div>
          <div class="text-2xl font-black tabular-nums mt-2 accent">{{ formatSpan(duration, formatYear) }}</div>
          <h2 class="text-xl font-bold mt-1">{{ duration.name }}</h2>
          <p v-if="duration.role" class="text-sm secondary">{{ duration.role }}</p>
          <p class="text-xs mt-1 secondary">
            {{ lengthText }} · {{ duration.region }} · {{ duration.categories.join(' · ') }}
          </p>
        </div>
        <button class="close" aria-label="Close" @click="emit('close')">✕</button>
      </div>

      <p class="text-sm leading-relaxed mt-4">{{ duration.description }}</p>
      <section v-if="duration.significance" class="why rounded-lg px-3 py-2 mt-3">
        <h3 class="text-[11px] font-bold uppercase tracking-widest secondary mb-1">Why it matters</h3>
        <p class="text-sm leading-relaxed">{{ duration.significance }}</p>
      </section>
      <div v-if="duration.approximate" role="note" class="approx rounded-lg border px-3 py-2 mt-3">
        <div class="text-xs font-bold uppercase tracking-widest">≈ Approximate dates</div>
        <p class="text-sm mt-1">
          <template v-if="duration.dateDisplay">
            Historians' dates: <span class="font-semibold">{{ duration.dateDisplay }}</span>. The years shown are conventional estimates.
          </template>
          <template v-else>Historians give different start and end years. These are conventional estimates.</template>
        </p>
      </div>

      <!-- People (Phase 13): who else was alive, and for how long their lives overlapped -->
      <section v-if="duration.person && together.length" class="mt-4" aria-label="Alive at the same time">
        <h3 class="text-[11px] font-semibold uppercase tracking-widest secondary mb-2">Alive at the same time</h3>
        <ul class="space-y-1">
          <li v-for="x in together" :key="x.d.id">
            <button class="related w-full text-left text-sm px-2 py-1.5 rounded-lg" @click="emit('openDuration', x.d.id)">
              <span class="font-semibold">{{ x.d.name }}</span>
              <span class="secondary"> · both alive {{ formatYear(x.from) }} – {{ formatYear(x.to) }}
                ({{ x.years }} {{ x.years === 1 ? 'year' : 'years' }})</span>
            </button>
          </li>
        </ul>
      </section>

      <!-- Life cycle (Phase 12): the bar's segments, each in the same shade -->
      <section v-if="duration.phases?.length" class="mt-4" aria-label="Life cycle">
        <h3 class="text-[11px] font-semibold uppercase tracking-widest secondary mb-2">Life cycle</h3>
        <ol class="space-y-2">
          <li v-for="p in duration.phases" :key="p.start" class="flex gap-2">
            <span class="swatch mt-1 shrink-0 rounded-sm" :class="`kind-${p.kind}`"
                  :style="{ background: `var(--df-f-${family})` }" aria-hidden="true" />
            <div class="min-w-0">
              <div class="text-xs secondary">
                <span class="font-semibold">{{ PHASE_KIND_LABEL[p.kind] }}</span>
                · <span class="tabular-nums">{{ formatPhase(p, formatYear) }}</span>
              </div>
              <div class="text-sm font-semibold">{{ p.title }}</div>
              <p class="text-sm leading-snug mt-0.5">{{ p.description }}</p>
              <p v-if="p.dateDisplay" class="text-xs secondary mt-0.5">≈ Historians' dates: {{ p.dateDisplay }}</p>
              <button v-if="p.startEvent && eventName(p.startEvent)" class="opens text-xs mt-0.5"
                      @click="emit('openEvent', p.startEvent)">
                Opens with: {{ eventName(p.startEvent) }}
              </button>
            </div>
          </li>
        </ol>
      </section>

      <EventConnections themed :groups="connections" :counts="storyCounts" @story="(d) => emit('story', d)"
                        @open-event="(id) => emit('openEvent', id)"
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

      <div class="grid grid-cols-2 gap-2 mt-5">
        <button class="tm w-full py-2.5 rounded-xl font-semibold text-sm" @click="emit('timeMachine')">
          What else was happening then?
        </button>
        <button class="tm w-full py-2.5 rounded-xl font-semibold text-sm" @click="emit('compareWith')">
          Compare with…
        </button>
      </div>
      <button class="show w-full mt-2 py-2.5 rounded-xl font-semibold text-sm" @click="emit('showOnTimeline')">
        Show on timeline
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import type { Event } from '@/types'
import type { Duration } from '@/types/dateflow'
import { PHASE_KIND_LABEL, aliveTogether, eventsDuring, formatPhase, formatSpan, yearsBetween } from '@/engine/dateflow/durations'
import { familyFor } from '@/engine/dateflow/categoryGroups'
import type { ConnectionGroup } from '@/engine/dateflow/connections'
import EventConnections from './EventConnections.vue'
import { formatEventYear, formatYear } from '@/utils/formatYear'

const props = defineProps<{
  duration: Duration
  durations: Duration[]
  events: Event[]
  connections: ConnectionGroup[]
  storyCounts?: { back: number; forward: number }
}>()
const emit = defineEmits<{
  close: []
  openEvent: [id: string]
  openDuration: [id: string]
  showOnTimeline: []
  showConnections: []
  story: [direction: 'back' | 'forward']
  timeMachine: []
  compareWith: []
}>()

const family = computed(() => familyFor(props.duration.categories))
const eventName = (id: string) => props.events.find((e) => e.id === id)?.name
const together = computed(() => (props.duration.person ? aliveTogether(props.duration, props.durations) : []))
const related = computed(() => eventsDuring(props.events, props.duration))
const lengthText = computed(() => {
  // No year 0: a span crossing the BCE/CE boundary is one year shorter than the difference.
  const { startYear: s, endYear: e } = props.duration
  const years = Math.max(1, yearsBetween(s, e)).toLocaleString()
  const about = props.duration.approximate ? (props.duration.person ? 'about ' : '~') : ''
  return props.duration.person ? `Lived ${about}${years} years` : `${about}${years} years`
})

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
/* Phase swatches: the same fill strength per kind as the bar's segments */
.swatch {
  width: 0.75rem;
  height: 0.75rem;
}
.swatch.kind-foundation,
.swatch.kind-end {
  opacity: 0.18;
}
.swatch.kind-contraction {
  opacity: 0.3;
}
.swatch.kind-transformation {
  opacity: 0.45;
}
.swatch.kind-expansion,
.swatch.kind-consolidation {
  opacity: 0.6;
}
.swatch.kind-height {
  opacity: 0.85;
}
.opens {
  color: var(--df-text-2);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.tm {
  color: var(--df-approx);
  background: var(--df-approx-bg);
  box-shadow: inset 0 0 0 1px var(--df-approx-border);
}
.approx {
  color: var(--df-approx);
  background: var(--df-approx-bg);
  border-color: var(--df-approx-border);
}
.why {
  background: var(--df-btn);
  border-left: 3px solid var(--df-text-2);
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
