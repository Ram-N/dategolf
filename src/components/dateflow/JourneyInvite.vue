<template>
  <aside class="invite" role="dialog" aria-label="Take a journey">
    <div class="flex items-start justify-between gap-2">
      <div>
        <p class="kicker">New here?</p>
        <h2 class="title">Take a journey through history</h2>
      </div>
      <button class="close" aria-label="No thanks" @click="emit('dismiss')">✕</button>
    </div>
    <p class="hint">A guided path, stop by stop, with the timeline moving as you go.</p>
    <ul class="list">
      <li v-for="j in journeys" :key="j.id">
        <button class="row" @click="emit('open', j.id)">
          <span class="name">{{ j.title }} ›</span>
          <span class="meta">{{ j.stops.length }} stops · {{ formatYear(j.start) }} → {{ formatYear(j.end) }}</span>
        </button>
      </li>
    </ul>
    <button class="skip" @click="emit('dismiss')">Explore on my own</button>
  </aside>
</template>

<script setup lang="ts">
import type { Journey } from '@/engine/dateflow/journeys'
import { formatYear } from '@/utils/formatYear'

// doc 18, 3a: a student never faces a blank timeline with no way in. Shown until dismissed or a
// journey is taken (remembered per viewer); the Journeys menu offers them after that.
defineProps<{ journeys: Journey[] }>()
const emit = defineEmits<{ open: [id: string]; dismiss: [] }>()
</script>

<style scoped>
.invite {
  position: absolute;
  left: 1rem;
  bottom: 1rem;
  z-index: 30;
  width: 340px;
  max-width: calc(100% - 2rem);
  padding: 0.875rem 1rem;
  border-radius: 0.875rem;
  border: 1px solid var(--df-border);
  background: var(--df-surface);
  color: var(--df-text);
  box-shadow: 0 10px 30px rgb(0 0 0 / 0.2);
}
.kicker {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--df-muted);
}
.title {
  font-size: 1rem;
  font-weight: 800;
  line-height: 1.3;
}
.close {
  min-width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.375rem;
  background: var(--df-btn);
  font-weight: 700;
}
.hint {
  margin-top: 0.25rem;
  font-size: 12px;
  color: var(--df-text-2);
}
.list {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.row {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 0.375rem 0.5rem;
  border-radius: 0.5rem;
  background: var(--df-btn);
  text-align: left;
}
.row:hover {
  background: var(--df-btn-hover);
}
.name {
  font-size: 0.875rem;
  font-weight: 700;
}
.meta {
  font-size: 11px;
  color: var(--df-text-2);
  font-variant-numeric: tabular-nums;
}
.skip {
  margin-top: 0.5rem;
  font-size: 12px;
  text-decoration: underline;
  color: var(--df-text-2);
}
</style>
