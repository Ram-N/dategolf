<template>
  <header class="flex flex-col px-4 pt-3 border-b border-gray-800">
    <!-- Top row -->
    <div class="flex items-center justify-between pb-2">
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
    </div>

    <!-- Penalty bar -->
    <div class="flex items-center gap-2 pb-3">
      <div class="relative flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          v-for="(result, i) in holeResults"
          :key="result.holeIndex"
          class="absolute top-0 h-full transition-all duration-500 ease-out"
          :style="{
            left: `${segmentLeft(i)}%`,
            width: `${segmentWidth(result.penalty)}%`,
            backgroundColor: segmentColor(result.penalty),
          }"
        />
      </div>
      <span class="text-xs text-gray-700 tabular-nums w-8 text-right shrink-0">{{ scale }}</span>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ScoreStatus, HoleResult } from '@/types'

const SCALE_TIERS = [200, 500, 1000, 2000, 5000]

const props = defineProps<{
  currentHole: number
  totalScore: number
  scoreStatus: ScoreStatus
  completed: boolean
  holeResults: HoleResult[]
}>()

const scale = computed(() => {
  return SCALE_TIERS.find(t => props.totalScore < t * 0.85) ?? 5000
})

const scoreClass = computed(() => ({
  'score-good': props.scoreStatus === 'good',
  'score-warning': props.scoreStatus === 'warning',
  'score-danger': props.scoreStatus === 'danger',
}))

function holeIndicatorClass(index: number) {
  if (index < props.currentHole) return 'bg-gray-400'
  if (index === props.currentHole && !props.completed) return 'bg-white ring-1 ring-white ring-offset-1 ring-offset-gray-950'
  return 'bg-gray-700'
}

function segmentLeft(index: number): number {
  let total = 0
  for (let i = 0; i < index; i++) total += props.holeResults[i]?.penalty ?? 0
  return Math.min((total / scale.value) * 100, 100)
}

function segmentWidth(penalty: number): number {
  return Math.min((penalty / scale.value) * 100, 100)
}

function segmentColor(penalty: number): string {
  if (penalty <= 20) return '#22c55e'  // green-500
  if (penalty <= 75) return '#f59e0b'  // amber-400
  return '#ef4444'                      // red-500
}
</script>
