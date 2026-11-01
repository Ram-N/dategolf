<template>
  <div class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 border-b toolbar">
    <div class="mr-auto">
      <h1 class="text-xl font-black tracking-tight title">DateRoll</h1>
      <p class="text-xs tabular-nums range">
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
        class="w-52 px-3 py-1.5 rounded-lg border text-sm outline-none jump"
        :class="{ error: jumpError }"
        @input="jumpError = false"
      />
      <button type="submit" class="btn">Go</button>
    </form>

    <div class="flex items-center gap-1">
      <button class="btn w-9" aria-label="Zoom out" @click="emit('zoomOut')">−</button>
      <button class="btn w-9" aria-label="Zoom in" @click="emit('zoomIn')">+</button>
      <button class="btn" @click="emit('reset')">Reset</button>
      <button
        class="btn w-9"
        :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
        :title="theme === 'dark' ? 'Light mode' : 'Dark mode'"
        @click="emit('toggleTheme')"
      >
        {{ theme === 'dark' ? '☀' : '☾' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { View } from '@/engine/dateroll/timeScale'
import type { Theme } from '@/stores/dateroll'
import { formatYear, parseYear } from '@/utils/formatYear'

defineProps<{ view: View; theme: Theme }>()
const emit = defineEmits<{
  zoomIn: []
  zoomOut: []
  reset: []
  jump: [year: number]
  toggleTheme: []
}>()

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
.toolbar {
  border-color: var(--dr-border-soft);
}
.title {
  color: var(--dr-text);
}
.range {
  color: var(--dr-text-2);
}
.jump {
  background: var(--dr-surface);
  border-color: var(--dr-border);
  color: var(--dr-text);
}
.jump::placeholder {
  color: var(--dr-muted);
}
.jump:focus {
  border-color: var(--dr-text-2);
}
.jump.error {
  border-color: #e66767;
}
.btn {
  height: 2.25rem;
  padding: 0 0.75rem;
  border-radius: 0.5rem;
  background: var(--dr-btn);
  color: var(--dr-text);
  font-size: 0.875rem;
  font-weight: 600;
  transition: background 0.15s;
}
.btn:hover {
  background: var(--dr-btn-hover);
}
</style>
