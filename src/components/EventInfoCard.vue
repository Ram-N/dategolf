<template>
  <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" @click.self="emit('close')">
    <div
      class="flip-card w-full max-w-sm"
      role="dialog"
      aria-modal="true"
      :aria-label="`About: ${event.name}`"
    >
      <div class="flip-inner" :class="{ flipped }">

        <!-- Front: mirrors the tapped card -->
        <div class="flip-face bg-gray-900 rounded-2xl border border-gray-700 flex flex-col items-center justify-center p-6">
          <div class="text-lg font-bold text-white">{{ event.name }}</div>
          <div class="text-3xl font-black text-green-400 tabular-nums mt-2">{{ formatYear(event.year) }}</div>
        </div>

        <!-- Back: the details -->
        <div class="flip-face flip-back bg-gray-900 rounded-2xl border border-green-800 p-6 text-left overflow-y-auto">
          <button
            class="sticky top-0 float-right -mr-3 -mt-3 w-8 h-8 rounded-full bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white"
            aria-label="Close"
            @click="emit('close')"
          >
            ✕
          </button>
          <div class="text-3xl font-black text-green-400 tabular-nums">{{ formatYear(event.year) }}</div>
          <h2 class="text-xl font-bold text-white mt-1 mb-3 pr-8">{{ event.name }}</h2>
          <p class="text-sm text-gray-300 leading-relaxed mb-4">{{ event.description }}</p>
          <p class="text-xs text-gray-500 mb-4">
            {{ event.categories.join(' · ') }} · {{ event.region }}
          </p>
          <DateLinksSection :eventId="event.id" :year="event.year" />
          <!-- Optional extra content (DateRoll's "Meanwhile" section); DateGolf passes none -->
          <slot />
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatYear } from '@/utils/formatYear'
import { onMounted, onUnmounted, ref } from 'vue'
import type { Event } from '@/types'
import DateLinksSection from './DateLinksSection.vue'

defineProps<{ event: Event }>()
const emit = defineEmits<{ close: [] }>()

const flipped = ref(false)

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  // Wait a frame so the front face renders before the flip starts
  requestAnimationFrame(() => requestAnimationFrame(() => { flipped.value = true }))
})
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.flip-card {
  perspective: 1000px;
  height: min(32rem, 85vh);
}
.flip-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.6s ease;
}
.flip-inner.flipped {
  transform: rotateY(180deg);
}
.flip-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
}
.flip-back {
  transform: rotateY(180deg);
}
@media (prefers-reduced-motion: reduce) {
  .flip-inner {
    transition: none;
  }
}
</style>
