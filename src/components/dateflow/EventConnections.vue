<template>
  <!-- How this event or span fits with others (curated links, Phase 8). Nothing shows if it has none. -->
  <section v-if="groups.length" class="mt-5 text-left" :class="themed ? 'themed' : 'dark'">
    <h3 class="heading">Connections</h3>
    <div v-for="g in groups" :key="`${g.type}${g.forward}`" class="mb-2">
      <div class="relation">{{ capitalise(g.relation) }}</div>
      <button
        v-for="c in shown(g)"
        :key="c.otherId"
        class="row"
        :title="c.why"
        @click="c.kind === 'span' ? emit('openDuration', c.otherId) : emit('openEvent', c.otherId)"
      >
        <span class="year">{{ when(c) }}</span>
        <span>
          <span class="name">{{ c.name }}</span>
          <span class="why">{{ c.why }}</span>
        </span>
      </button>
      <button v-if="g.items.length > LIMIT && !open.has(key(g))" class="more" @click="open.add(key(g))">
        + {{ g.items.length - LIMIT }} more
      </button>
    </div>
    <button class="show" @click="emit('showOnTimeline')">Show these connections on the timeline</button>
  </section>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import type { Connection, ConnectionGroup } from '@/engine/dateflow/connections'
import { formatEventYear, formatYear } from '@/utils/formatYear'

defineProps<{
  groups: ConnectionGroup[]
  themed?: boolean // true on the span card (follows the light/dark theme); the event card is always dark
}>()
const emit = defineEmits<{ openEvent: [id: string]; openDuration: [id: string]; showOnTimeline: [] }>()

const LIMIT = 5
const open = reactive(new Set<string>())
const key = (g: ConnectionGroup) => `${g.type}${g.forward}`
const shown = (g: ConnectionGroup) => (open.has(key(g)) ? g.items : g.items.slice(0, LIMIT))
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function when(c: Connection): string {
  if (c.kind === 'span' && c.endYear !== undefined && c.endYear !== c.year) {
    return `${c.approximate ? 'c. ' : ''}${formatYear(c.year)}–${formatYear(c.endYear)}`
  }
  return formatEventYear(c.year, c.approximate)
}
</script>

<style scoped>
.heading {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 0.375rem;
}
.relation {
  font-size: 11px;
  font-weight: 600;
  margin-top: 0.25rem;
}
.row {
  display: flex; /* year column + name, so a wrapped name stays aligned */
  width: 100%;
  text-align: left;
  font-size: 0.8125rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
}
.year {
  flex-shrink: 0;
  min-width: 6.5rem;
  margin-right: 0.5rem;
  font-family: ui-monospace, monospace;
  font-variant-numeric: tabular-nums;
}
.why {
  display: block;
  font-size: 0.75rem;
  line-height: 1.3;
}
.show {
  width: 100%;
  margin-top: 0.5rem;
  padding: 0.5rem;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
}
.dark .show { background: rgb(31 41 55); color: rgb(229 231 235); }
.dark .show:hover { background: rgb(55 65 81); }
.themed .show { background: var(--df-btn); color: var(--df-text); }
.themed .show:hover { background: var(--df-btn-hover); }
.more {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  text-decoration: underline;
}

/* On the event card, which is always dark: the same grays as "Meanwhile". */
.dark .heading { color: rgb(156 163 175); }
.dark .relation { color: rgb(107 114 128); }
.dark .row { color: rgb(229 231 235); }
.dark .row:hover { background: rgb(31 41 55); }
.dark .year, .dark .why, .dark .more { color: rgb(156 163 175); }

/* On the span card: DateFlow's theme tokens. */
.themed .heading, .themed .year, .themed .why, .themed .more { color: var(--df-text-2); }
.themed .relation { color: var(--df-muted); }
.themed .row { color: var(--df-text); }
.themed .row:hover { background: var(--df-btn-hover); }
</style>
