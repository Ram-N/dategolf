<template>
  <div ref="rootEl" class="relative">
    <button class="btn" :class="{ active: activeCount > 0 }" :aria-expanded="open" aria-haspopup="true" @click="toggle">
      Filters{{ activeCount ? ` (${activeCount})` : '' }} ▾
    </button>
    <div
      v-if="open"
      class="panel absolute top-11 z-40 rounded-xl border p-3 space-y-4"
      :style="{ left: panelLeft + 'px', width: PANEL_W + 'px' }"
      role="dialog"
      aria-label="Filters"
    >
      <section>
        <h3 class="heading">Categories</h3>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="c in categories"
            :key="c"
            class="chip"
            :class="{ on: filters.categories.includes(c) }"
            :aria-pressed="filters.categories.includes(c)"
            @click="emit('toggleCategory', c)"
          >
            {{ c }}
          </button>
        </div>
      </section>

      <section v-if="mode === 'world'">
        <h3 class="heading">Regions</h3>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="l in LANES"
            :key="l.id"
            class="chip"
            :class="{ on: filters.regions.includes(l.id) }"
            :aria-pressed="filters.regions.includes(l.id)"
            @click="emit('toggleRegion', l.id)"
          >
            {{ l.label }}
          </button>
        </div>
      </section>
      <p v-else class="hint">In Lanes view, choose regions with the Lanes menu.</p>

      <section>
        <h3 class="heading">Detail</h3>
        <div class="flex items-center gap-2 text-xs">
          <span class="hint">Fewer</span>
          <input
            type="range"
            :min="DETAIL_MIN"
            :max="DETAIL_MAX"
            step="1"
            :value="filters.detail"
            aria-label="Detail level"
            class="flex-1"
            @input="emit('setDetail', Number(($event.target as HTMLInputElement).value))"
          />
          <span class="hint">More</span>
        </div>
        <p class="hint mt-1">
          {{ filters.detail === 0 ? 'Automatic: zoom in to reveal more events.' : 'Adjusts how many events show at each zoom level.' }}
        </p>
      </section>

      <button class="clear w-full py-1.5 rounded-lg text-xs font-semibold" :disabled="!activeCount && filters.detail === 0" @click="emit('clear')">
        Clear all filters
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { LANES, type LaneId } from '@/engine/dateflow/lanes'
import { DETAIL_MAX, DETAIL_MIN, type Filters } from '@/engine/dateflow/filters'
import { usePopover } from '@/composables/usePopover'
import type { ViewMode } from '@/stores/dateflow'

const props = defineProps<{ filters: Filters; categories: string[]; mode: ViewMode }>()
const emit = defineEmits<{
  toggleCategory: [c: string]
  toggleRegion: [id: LaneId]
  setDetail: [detail: number]
  clear: []
}>()

const PANEL_W = 320
const { open, rootEl, panelLeft, toggle } = usePopover(PANEL_W)

const activeCount = computed(
  () => props.filters.categories.length + (props.mode === 'world' ? props.filters.regions.length : 0),
)
</script>

<style scoped>
.btn {
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
.btn.active {
  box-shadow: inset 0 0 0 1.5px var(--df-text-2);
}
.panel {
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
  margin-bottom: 0.5rem;
}
.hint {
  font-size: 11px;
  color: var(--df-muted);
}
.chip {
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--df-btn);
  color: var(--df-text-2);
  border: 1px solid transparent;
}
.chip:hover {
  background: var(--df-btn-hover);
}
.chip.on {
  background: var(--df-text);
  color: var(--df-bg);
}
.clear {
  color: var(--df-text-2);
}
.clear:hover:not(:disabled) {
  background: var(--df-btn);
  color: var(--df-text);
}
.clear:disabled {
  opacity: 0.4;
}
input[type='range'] {
  accent-color: var(--df-text-2);
}
</style>
