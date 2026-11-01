<template>
  <div ref="rootEl" class="relative">
    <button
      class="btn"
      :aria-expanded="open"
      aria-haspopup="true"
      @click="toggleOpen"
    >
      Lanes ▾
    </button>
    <div v-if="open" class="panel absolute top-11 z-40 w-64 rounded-xl border p-2"
      :style="{ left: panelLeft + 'px' }" role="menu">
      <div
        v-for="(id, i) in state.order"
        :key="id"
        class="flex items-center gap-2 px-2 py-1 rounded-lg row"
      >
        <label class="flex items-center gap-2 flex-1 cursor-pointer text-sm">
          <input
            type="checkbox"
            :checked="state.visible.includes(id)"
            :disabled="state.visible.length === 1 && state.visible.includes(id)"
            @change="emit('toggle', id)"
          />
          {{ labelOf(id) }}
        </label>
        <button class="move" :disabled="i === 0" :aria-label="`Move ${labelOf(id)} up`" @click="emit('move', id, -1)">↑</button>
        <button
          class="move"
          :disabled="i === state.order.length - 1"
          :aria-label="`Move ${labelOf(id)} down`"
          @click="emit('move', id, 1)"
        >
          ↓
        </button>
      </div>
      <button class="reset w-full mt-1 py-1.5 rounded-lg text-xs font-semibold" @click="emit('reset')">
        Restore default lanes
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { LANES, type LaneId, type LaneState } from '@/engine/dateflow/lanes'
import { usePopover } from '@/composables/usePopover'

defineProps<{ state: LaneState }>()
const emit = defineEmits<{ toggle: [id: LaneId]; move: [id: LaneId, dir: -1 | 1]; reset: [] }>()

const { open, rootEl, panelLeft, toggle: toggleOpen } = usePopover(256) // panel is w-64

const LABELS = new Map(LANES.map((l) => [l.id, l.label]))
const labelOf = (id: LaneId) => LABELS.get(id) ?? id
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
.panel {
  background: var(--df-surface);
  border-color: var(--df-border);
  color: var(--df-text);
  box-shadow: 0 10px 30px rgb(0 0 0 / 0.25);
}
.row:hover {
  background: var(--df-btn);
}
.move {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.375rem;
  color: var(--df-text-2);
}
.move:hover:not(:disabled) {
  background: var(--df-btn-hover);
  color: var(--df-text);
}
.move:disabled {
  opacity: 0.3;
}
.reset {
  color: var(--df-text-2);
}
.reset:hover {
  background: var(--df-btn);
  color: var(--df-text);
}
</style>
