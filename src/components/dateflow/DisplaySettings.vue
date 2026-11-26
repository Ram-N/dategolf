<template>
  <!-- Display ▾ (doc 20): set-once settings, each a visible pair so the active one is never in doubt -->
  <div class="flex flex-col gap-2 p-1" data-keep-open>
    <div class="df-heading">Colours</div>
    <div class="df-seg" role="group" aria-label="Colours" data-help="colours">
      <button
        v-for="c in COLOR_MODES"
        :key="c.id"
        class="df-seg-btn flex-1"
        :class="{ active: colorMode === c.id }"
        :aria-pressed="colorMode === c.id"
        :title="c.hint"
        @click="colorMode !== c.id && emit('toggleColors')"
      >
        {{ c.label }}
      </button>
    </div>
    <div class="df-heading mt-1">Page</div>
    <div class="df-seg" role="group" aria-label="Light or dark" data-help="theme">
      <button
        v-for="t in THEMES"
        :key="t.id"
        class="df-seg-btn flex-1"
        :class="{ active: theme === t.id }"
        :aria-pressed="theme === t.id"
        @click="theme !== t.id && emit('toggleTheme')"
      >
        {{ t.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ColorMode, Theme } from '@/stores/dateflow'

defineProps<{ colorMode: ColorMode; theme: Theme }>()
const emit = defineEmits<{ toggleColors: []; toggleTheme: [] }>()

const COLOR_MODES: { id: ColorMode; label: string; hint: string }[] = [
  { id: 'colorful', label: 'Colorful', hint: 'Colorful: a colour for each family of events' },
  { id: 'subtle', label: 'Subtle', hint: 'Subtle: three colours, easier to tell apart for colour-blind eyes' },
]
const THEMES: { id: Theme; label: string }[] = [
  { id: 'light', label: '☀ Light' },
  { id: 'dark', label: '☾ Dark' },
]
</script>
