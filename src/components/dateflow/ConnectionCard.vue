<template>
  <!-- A story thread's link in words (doc 17): shown on hover, pinned on click or tap. -->
  <div class="card" :class="{ pinned }" :style="{ left: `${left}px`, top: `${top}px`, width: `${WIDTH}px` }"
       role="dialog" :aria-label="`Connection: ${arc.fromName} ${arc.verb} ${arc.toName}`">
    <div class="head">
      <span class="swatch" :style="{ background: `var(--df-arc-${arc.kind})` }" />
      <span class="verb">{{ arc.verb }}</span>
      <span v-if="arc.debated" class="tag">debated</span>
      <button v-if="pinned" class="close" aria-label="Close (Esc)" @click="emit('close')">✕</button>
    </div>
    <p class="ends">
      <strong>{{ arc.fromName }}</strong>
      <span class="arrow">→</span>
      <strong>{{ arc.toName }}</strong>
    </p>
    <p v-if="arc.why" class="why">{{ arc.why }}</p>
    <p class="foot">
      {{ arc.gap }}<template v-if="arc.kind === 'then'"> · came next, not a cause</template>
      <template v-if="arc.debated"> · one view among several</template>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import type { Arc } from './StoryArcs.vue'

const WIDTH = 300
const HEIGHT = 170 // a generous estimate, so the card stays inside the timeline
const GAP = 14

const props = defineProps<{
  arc: Arc
  x: number // pointer position inside the timeline
  y: number
  bounds: { width: number; height: number }
  pinned: boolean
}>()
const emit = defineEmits<{ close: [] }>()

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
// Right of the pointer if it fits, else left of it; below it if it fits, else above.
const left = computed(() => {
  const x = props.x + GAP + WIDTH <= props.bounds.width ? props.x + GAP : props.x - GAP - WIDTH
  return clamp(x, 8, Math.max(8, props.bounds.width - WIDTH - 8))
})
const top = computed(() => {
  const y = props.y + GAP + HEIGHT <= props.bounds.height ? props.y + GAP : props.y - GAP - HEIGHT
  return clamp(y, 8, Math.max(8, props.bounds.height - HEIGHT - 8))
})

// Esc closes a pinned card only: caught on the way down (capture), so the story's own Esc doesn't close it too.
function onKey(e: KeyboardEvent) {
  if (e.key !== 'Escape' || !props.pinned) return
  e.stopImmediatePropagation()
  emit('close')
}
onMounted(() => window.addEventListener('keydown', onKey, true))
onUnmounted(() => window.removeEventListener('keydown', onKey, true))
</script>

<style scoped>
.card {
  position: absolute;
  z-index: 20;
  padding: 0.6rem 0.75rem;
  border-radius: 0.75rem;
  background: var(--df-surface);
  border: 1px solid var(--df-border);
  color: var(--df-text);
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.35);
  pointer-events: none; /* a hover card never blocks the thread under the pointer */
  font-size: 0.8125rem;
  line-height: 1.4;
}
.card.pinned {
  pointer-events: auto;
}
.head {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.swatch {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 9999px;
  flex-shrink: 0;
}
.verb {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--df-text-2);
}
.tag {
  font-size: 0.6875rem;
  padding: 0 0.4rem;
  border-radius: 9999px;
  border: 1px dashed var(--df-text-2);
  color: var(--df-text-2);
}
.close {
  margin-left: auto;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  color: var(--df-text-2);
}
.close:hover {
  background: var(--df-btn);
  color: var(--df-text);
}
.ends {
  margin-top: 0.35rem;
}
.arrow {
  margin: 0 0.3rem;
  color: var(--df-text-2);
}
.why {
  margin-top: 0.35rem;
}
.foot {
  margin-top: 0.35rem;
  font-size: 0.75rem;
  color: var(--df-text-2);
}
</style>
