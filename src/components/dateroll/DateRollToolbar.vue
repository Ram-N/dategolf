<template>
  <div class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 border-b border-zinc-800">
    <div class="mr-auto">
      <h1 class="text-xl font-black tracking-tight text-white">DateRoll</h1>
      <p class="text-xs text-zinc-500 tabular-nums">
        {{ formatYear(Math.round(view.start)) }} – {{ formatYear(Math.round(view.end)) }}
        · {{ Math.round(view.end - view.start).toLocaleString() }} years
      </p>
    </div>

    <form class="flex items-center gap-2" @submit.prevent="submitJump">
      <input
        v-model="jumpInput"
        type="text"
        placeholder="Jump to year (e.g. 500 BC)"
        aria-label="Jump to year"
        class="w-48 px-3 py-1.5 rounded-lg bg-zinc-900 border text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-500"
        :class="jumpError ? 'border-red-500' : 'border-zinc-700'"
        @input="jumpError = false"
      />
      <button type="submit" class="btn">Go</button>
    </form>

    <div class="flex items-center gap-1">
      <button class="btn w-9" aria-label="Zoom out" @click="emit('zoomOut')">−</button>
      <button class="btn w-9" aria-label="Zoom in" @click="emit('zoomIn')">+</button>
      <button class="btn" @click="emit('reset')">Reset</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { View } from '@/engine/dateroll/timeScale'
import { formatYear, parseYear } from '@/utils/formatYear'

defineProps<{ view: View }>()
const emit = defineEmits<{ zoomIn: []; zoomOut: []; reset: []; jump: [year: number] }>()

const jumpInput = ref('')
const jumpError = ref(false)

function submitJump() {
  const year = parseYear(jumpInput.value)
  if (year === null) {
    jumpError.value = true
    return
  }
  emit('jump', year)
}
</script>

<style scoped>
.btn {
  height: 2.25rem;
  padding: 0 0.75rem;
  border-radius: 0.5rem;
  background: #27272a;
  color: #e4e4e7;
  font-size: 0.875rem;
  font-weight: 600;
  transition: background 0.15s;
}
.btn:hover {
  background: #3f3f46;
}
</style>
