<template>
  <div class="flex flex-col min-h-screen bg-gray-950">
    <div class="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center">

      <p class="text-xs uppercase tracking-widest text-gray-500 mb-2">Final Score</p>
      <div class="text-7xl font-black tabular-nums mb-2" :class="scoreStatusClass">
        {{ totalScore }}
      </div>
      <p class="text-sm text-gray-500 mb-8">
        {{ scoreLabel }}
      </p>

      <!-- Per-hole breakdown -->
      <div class="w-full max-w-sm mb-6">
        <div class="space-y-2">
          <div
            v-for="(result, i) in holeResults"
            :key="i"
            class="flex items-center justify-between bg-gray-900 rounded-xl px-4 py-3 border border-gray-800"
          >
            <div class="text-left">
              <div class="text-xs text-gray-500">Hole {{ i + 1 }} · Target {{ formatYear(result.targetYear) }}</div>
              <div class="text-sm font-medium text-white">{{ result.eventName }}</div>
              <div class="text-xs text-gray-600">{{ formatYear(result.eventYear) }}</div>
            </div>
            <div class="text-right ml-3">
              <div class="text-xl font-bold" :class="holePenaltyClass(result.penalty)">
                +{{ result.penalty }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div v-if="stats" class="flex gap-4 mb-8">
        <div class="text-center">
          <div class="text-2xl font-bold text-white">{{ stats.streak }}</div>
          <div class="text-xs text-gray-500 uppercase tracking-widest">Streak</div>
        </div>
        <div class="w-px bg-gray-800" />
        <div class="text-center">
          <div class="text-2xl font-bold text-white">{{ stats.bestScore ?? '—' }}</div>
          <div class="text-xs text-gray-500 uppercase tracking-widest">Best</div>
        </div>
        <div class="w-px bg-gray-800" />
        <div class="text-center">
          <div class="text-2xl font-bold text-white">{{ stats.totalGames }}</div>
          <div class="text-xs text-gray-500 uppercase tracking-widest">Games</div>
        </div>
      </div>

    </div>

    <!-- Share button -->
    <div class="px-4 pb-8 space-y-3">
      <button
        class="w-full py-4 rounded-xl bg-white text-gray-900 font-bold text-lg hover:bg-gray-100 transition-colors"
        @click="onShare"
      >
        {{ shareLabel }}
      </button>
      <p class="text-xs text-gray-600 text-center">Come back tomorrow for a new challenge</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { HoleResult, PlayerStats, ScoreStatus } from '@/types'
import type { GameState } from '@/types'
import { shareResult } from '@/services/sharing'

const props = defineProps<{
  gameState: GameState
  holeResults: HoleResult[]
  totalScore: number
  scoreStatus: ScoreStatus
  stats: PlayerStats | null
}>()

const shareLabel = ref('Share Result')

function formatYear(y: number) {
  return y < 0 ? `${Math.abs(y)} BCE` : String(y)
}

function holePenaltyClass(p: number) {
  if (p <= 5) return 'text-green-400'
  if (p <= 30) return 'text-yellow-400'
  return 'text-red-400'
}

const scoreStatusClass = computed(() => ({
  'score-good': props.scoreStatus === 'good',
  'score-warning': props.scoreStatus === 'warning',
  'score-danger': props.scoreStatus === 'danger',
}))

const scoreLabel = computed(() => {
  if (props.scoreStatus === 'good') return 'Excellent historical intuition!'
  if (props.scoreStatus === 'warning') return 'Solid round — keep studying!'
  return 'History is hard. You\'ll do better tomorrow!'
})

async function onShare() {
  const outcome = await shareResult(props.gameState)
  if (outcome === 'copied') {
    shareLabel.value = 'Copied!'
    setTimeout(() => (shareLabel.value = 'Share Result'), 2000)
  } else if (outcome === 'shared') {
    shareLabel.value = 'Shared!'
    setTimeout(() => (shareLabel.value = 'Share Result'), 2000)
  } else {
    shareLabel.value = 'Could not share'
    setTimeout(() => (shareLabel.value = 'Share Result'), 2000)
  }
}
</script>
