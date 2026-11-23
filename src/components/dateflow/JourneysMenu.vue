<template>
  <div ref="rootEl" class="relative">
    <button class="btn" :aria-expanded="open" aria-haspopup="true" title="Guided tours of big themes, stop by stop" @click="toggle">
      Journeys ▾
    </button>
    <div
      v-if="open"
      class="panel absolute top-11 z-40 rounded-xl border p-3"
      :style="{ left: panelLeft + 'px', width: PANEL_W + 'px' }"
      role="dialog"
      aria-label="Journeys"
    >
      <h3 class="heading">Take a journey</h3>
      <p class="hint mb-2">Guided tours of big themes, stop by stop, with the timeline moving as you go.</p>
      <ul class="space-y-1">
        <li v-for="j in journeys" :key="j.id">
          <button class="row w-full text-left rounded-lg px-2 py-1.5" @click="chooseJourney(j.id)">
            <span class="name">{{ j.title }}</span>
            <span class="meta">{{ j.stops.length }} stops · {{ formatYear(j.start) }} → {{ formatYear(j.end) }}</span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Journey } from '@/engine/dateflow/journeys'
import { usePopover } from '@/composables/usePopover'
import { formatYear } from '@/utils/formatYear'

defineProps<{ journeys: Journey[] }>()
const emit = defineEmits<{ open: [id: string] }>()

const PANEL_W = 340
const { open, rootEl, panelLeft, toggle } = usePopover(PANEL_W)

function chooseJourney(id: string) {
  open.value = false
  emit('open', id)
}
</script>

<style scoped>
.btn {
  white-space: nowrap;
  height: 2.25rem;
  padding: 0 0.75rem;
  border-radius: 0.5rem;
  background: var(--df-btn);
  color: var(--df-text);
  font-size: 0.875rem;
  font-weight: 600;
}
.btn:hover {
  background: var(--df-btn-hover);
}
.panel {
  max-height: calc(100dvh - 7rem);
  overflow-y: auto;
  background: var(--df-surface);
  border-color: var(--df-border);
  color: var(--df-text);
  box-shadow: 0 10px 30px rgb(0 0 0 / 0.25);
}
.heading {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--df-text-2);
}
.hint {
  font-size: 11px;
  color: var(--df-muted);
}
.row {
  display: flex;
  flex-direction: column;
}
.row:hover {
  background: var(--df-btn-hover);
}
.name {
  font-size: 0.875rem;
  font-weight: 600;
}
.meta {
  font-size: 11px;
  color: var(--df-text-2);
  font-variant-numeric: tabular-nums;
}
</style>
