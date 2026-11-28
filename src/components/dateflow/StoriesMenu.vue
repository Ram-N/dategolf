<template>
  <div ref="rootEl" class="relative">
    <button class="btn" :aria-expanded="open" aria-haspopup="true" title="Chains of events: follow how one event led to another" @click="toggle">
      Chains ▾
    </button>
    <div
      v-if="open"
      class="panel absolute top-11 z-40 rounded-xl border p-3"
      :style="{ left: panelLeft + 'px', width: PANEL_W + 'px' }"
      role="dialog"
      aria-label="Chains of events"
    >
      <h3 class="heading">Follow a chain of events</h3>
      <p class="hint mb-2">How one event led to another: causes, beginnings, endings and what came next, built automatically from reviewed connections.</p>
      <ul class="space-y-1">
        <li v-if="today">
          <button class="row today w-full text-left rounded-lg px-2 py-1.5" @click="choose(today.id)">
            <span class="label">Today's chain · the chain behind</span>
            <span class="name">{{ today.title }}</span>
            <span class="meta">{{ today.count }} steps · {{ cardYears(today) }}</span>
          </button>
        </li>
        <li v-for="s in stories" :key="s.rootId">
          <button class="row w-full text-left rounded-lg px-2 py-1.5" @click="choose(s.rootId)">
            <span class="label">The chain behind</span>
            <span class="name">{{ s.name }}</span>
            <span class="meta">
              {{ s.steps }} steps · {{ cardYears(chainCard(s)) }}<template v-if="s.regions > 1">
                · {{ s.regions }} regions</template>
            </span>
          </button>
        </li>
      </ul>
      <p v-if="!stories.length" class="hint">Chains appear once events are linked.</p>
      <button class="see-all" @click="seeAll">See all journeys and chains ›</button>
      <p class="hint mt-2">Or open any event and choose <strong>How did we get here?</strong></p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FeaturedStory } from '@/engine/dateflow/stories'
import { usePopover } from '@/composables/usePopover'
import { cardYears, chainCard, type GalleryCard } from '@/engine/dateflow/gallery'

defineProps<{ stories: FeaturedStory[]; today: GalleryCard | null }>()
const emit = defineEmits<{ open: [id: string]; gallery: [] }>()

const PANEL_W = 340
const { open, rootEl, panelLeft, toggle } = usePopover(PANEL_W)

function choose(id: string) {
  open.value = false
  emit('open', id)
}

function seeAll() {
  open.value = false
  emit('gallery')
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
.row.today {
  border: 1px solid var(--df-border);
  margin-bottom: 0.25rem;
}
.see-all {
  display: block;
  width: 100%;
  margin-top: 0.5rem;
  padding: 0.375rem 0.5rem;
  border-radius: 0.5rem;
  text-align: left;
  font-size: 0.8125rem;
  font-weight: 600;
  background: var(--df-btn);
}
.see-all:hover {
  background: var(--df-btn-hover);
}
.row:hover {
  background: var(--df-btn-hover);
}
.label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--df-muted);
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
