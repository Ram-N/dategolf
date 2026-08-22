<template>
  <header class="flex items-center justify-between px-4 py-3 border-b border-gray-800">
    <div class="flex items-center gap-2">
      <span class="text-lg font-bold tracking-tight text-white">DateGolf</span>
      <span class="text-xs text-gray-500 uppercase tracking-widest">Daily History Golf</span>
    </div>

    <div class="flex items-center gap-4">
      <!-- Hole indicators -->
      <div class="flex gap-1">
        <div
          v-for="i in 5"
          :key="i"
          class="w-2 h-2 rounded-full transition-colors"
          :class="holeIndicatorClass(i - 1)"
        />
      </div>

      <!-- Score -->
      <div class="text-right">
        <div class="text-xs text-gray-500 uppercase tracking-widest">Score</div>
        <div class="text-lg font-bold tabular-nums" :class="scoreClass">
          {{ totalScore }}
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ScoreStatus } from '@/types'

const props = defineProps<{
  currentHole: number
  totalScore: number
  scoreStatus: ScoreStatus
  completed: boolean
}>()

const scoreClass = computed(() => {
  return {
    'score-good': props.scoreStatus === 'good',
    'score-warning': props.scoreStatus === 'warning',
    'score-danger': props.scoreStatus === 'danger',
  }
})

function holeIndicatorClass(index: number) {
  if (index < props.currentHole) return 'bg-gray-400' // played
  if (index === props.currentHole && !props.completed) return 'bg-white ring-1 ring-white ring-offset-1 ring-offset-gray-950' // current
  return 'bg-gray-700' // upcoming
}
</script>
