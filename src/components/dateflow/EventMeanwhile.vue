<template>
  <div class="mt-5 space-y-4 text-left">
    <section v-if="nearby.before.length || nearby.after.length">
      <h3 class="heading">Before &amp; after in {{ ownLane }}</h3>
      <button v-for="e in nearby.before" :key="e.id" class="row" @click="emit('openEvent', e.id)">
        <span class="year">{{ formatYear(e.year) }}</span><span>{{ e.name }}</span>
      </button>
      <div class="here">● {{ formatYear(event.year) }} — {{ event.name }}</div>
      <button v-for="e in nearby.after" :key="e.id" class="row" @click="emit('openEvent', e.id)">
        <span class="year">{{ formatYear(e.year) }}</span><span>{{ e.name }}</span>
      </button>
    </section>

    <section v-if="elsewhere.length">
      <h3 class="heading">Meanwhile around the world <span class="normal-case font-normal">(±{{ WINDOW }} years)</span></h3>
      <div v-for="l in elsewhere" :key="l.lane" class="mb-1.5">
        <div class="lane">{{ l.label }}</div>
        <button v-for="e in l.events" :key="e.id" class="row" @click="emit('openEvent', e.id)">
          <span class="year">{{ formatYear(e.year) }}</span><span>{{ e.name }}</span>
        </button>
      </div>
    </section>

    <section v-if="empires.length">
      <h3 class="heading">Empires in {{ formatYear(event.year) }}</h3>
      <div class="flex flex-wrap gap-1.5">
        <button v-for="d in empires" :key="d.id" class="chip" @click="emit('openDuration', d.id)">{{ d.name }}</button>
      </div>
    </section>

    <button
      class="w-full py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm font-semibold text-gray-200"
      @click="emit('showSurrounding')"
    >
      Show the surrounding century
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Event } from '@/types'
import type { Duration } from '@/types/dateflow'
import { activeDuring, beforeAndAfter, meanwhile } from '@/engine/dateflow/explore'
import { LANES, laneFor } from '@/engine/dateflow/lanes'
import { formatYear } from '@/utils/formatYear'

const props = defineProps<{ event: Event; events: Event[]; durations: Duration[] }>()
const emit = defineEmits<{ openEvent: [id: string]; openDuration: [id: string]; showSurrounding: [] }>()

const WINDOW = 50
const MAX_EMPIRES = 8

const ownLane = computed(() => LANES.find((l) => l.id === laneFor(props.event.region))?.label ?? 'this region')
const nearby = computed(() => beforeAndAfter(props.events, props.event))
const elsewhere = computed(() => meanwhile(props.events, props.event, WINDOW))
const empires = computed(() =>
  activeDuring(props.durations, props.event.year, props.event.year, 'empire').slice(0, MAX_EMPIRES),
)
</script>

<style scoped>
.heading {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgb(156 163 175); /* gray-400 — this card is always dark */
  margin-bottom: 0.375rem;
}
.lane {
  font-size: 11px;
  font-weight: 600;
  color: rgb(107 114 128); /* gray-500 */
  margin-top: 0.25rem;
}
.here {
  font-size: 0.8125rem;
  padding: 0.25rem 0.5rem;
  color: rgb(74 222 128); /* green-400, matches the card's year */
}
.row {
  display: flex; /* year column + name, so a wrapped name stays aligned */
  width: 100%;
  text-align: left;
  font-size: 0.8125rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
  color: rgb(229 231 235); /* gray-200 */
}
.row:hover {
  background: rgb(31 41 55); /* gray-800 */
}
.year {
  flex-shrink: 0;
  min-width: 4.75rem;
  margin-right: 0.5rem;
  font-family: ui-monospace, monospace;
  font-variant-numeric: tabular-nums;
  color: rgb(156 163 175);
}
.chip {
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgb(31 41 55);
  color: rgb(229 231 235);
}
.chip:hover {
  background: rgb(55 65 81);
}
</style>
