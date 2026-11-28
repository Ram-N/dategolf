<template>
  <!-- Doc 18, item 5: every journey and every distinct chain of events, as cards, over the timeline -->
  <div class="scrim" @click.self="emit('close')">
    <section class="gallery" role="dialog" aria-modal="true" aria-label="Journeys and chains of events">
      <header class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h2 class="title">Journeys and chains of events</h2>
          <p class="hint">Journeys are guided tours of a big theme. Chains are built automatically from reviewed connections: how one event led to another.</p>
        </div>
        <button class="close" aria-label="Close (Esc)" title="Close (Esc)" @click="emit('close')">✕</button>
      </header>

      <template v-if="today">
        <h3 class="heading">Today's chain</h3>
        <div class="grid">
          <GalleryCardButton :card="today" today @click="openChain(today.id)" />
        </div>
      </template>

      <template v-if="journeys.length">
        <h3 class="heading">Journeys · {{ journeys.length }}</h3>
        <div class="grid">
          <GalleryCardButton v-for="j in journeys" :key="j.id" :card="j" :status="journeyStatus(j.id, j.count)"
                             @click="openJourney(j.id, j.count)" />
        </div>
      </template>

      <h3 class="heading">Chains of events · {{ chains.length }}, earliest first</h3>
      <div v-if="chains.length" class="grid">
        <GalleryCardButton v-for="c in chains" :key="c.id" :card="c" @click="openChain(c.id)" />
      </div>
      <p v-else class="hint">Chains appear once events are linked.</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { GalleryCard } from '@/engine/dateflow/gallery'
import { resumeStep, type JourneyProgress } from '@/engine/dateflow/journeys'
import GalleryCardButton from './GalleryCardButton.vue'

const props = defineProps<{
  journeys: GalleryCard[]
  chains: GalleryCard[]
  today: GalleryCard | null
  progress: Record<string, JourneyProgress>
}>()
const emit = defineEmits<{
  openJourney: [id: string, from: 'start' | 'resume']
  openChain: [id: string]
  close: []
}>()

/** Like the Journeys menu: a journey under way continues where this viewer stopped. */
function journeyStatus(id: string, stops: number): string | undefined {
  const at = resumeStep(props.progress[id], stops)
  if (at !== null) return `Stop ${at + 1} of ${stops} · Continue ›`
  return props.progress[id]?.done ? '✓ Finished · take it again' : undefined
}

function openJourney(id: string, stops: number) {
  emit('openJourney', id, resumeStep(props.progress[id], stops) === null ? 'start' : 'resume')
}

function openChain(id: string) {
  emit('openChain', id)
}
</script>

<style scoped>
.scrim {
  position: fixed;
  inset: 0;
  z-index: 55; /* over the panels and cards (z-50), under the help card (z-60) */
  background: rgb(0 0 0 / 0.35);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 5rem 1rem 1rem;
}
.gallery {
  width: min(1000px, 100%);
  max-height: calc(100dvh - 6rem);
  overflow-y: auto;
  padding: 1rem 1.25rem 1.25rem;
  border-radius: 0.875rem;
  border: 1px solid var(--df-border);
  background: var(--df-surface);
  color: var(--df-text);
  box-shadow: 0 10px 30px rgb(0 0 0 / 0.3);
}
/* A phone gets it full-screen */
@media (max-width: 639px) {
  .scrim {
    padding: 0;
  }
  .gallery {
    max-height: 100dvh;
    height: 100dvh;
    border-radius: 0;
    border: 0;
  }
}
.title {
  font-size: 1.125rem;
  font-weight: 800;
}
.hint {
  margin-top: 0.125rem;
  font-size: 12px;
  color: var(--df-muted);
}
.heading {
  margin: 1rem 0 0.5rem;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--df-text-2);
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.625rem;
}
.close {
  min-width: 2rem;
  height: 2rem;
  border-radius: 0.375rem;
  background: var(--df-btn);
  font-weight: 700;
}
.close:hover {
  background: var(--df-btn-hover);
}
</style>
