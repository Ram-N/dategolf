<template>
  <div class="flex flex-col gap-6 px-4 py-4 overflow-y-auto">
    <!-- Score headline -->
    <div class="text-center py-4">
      <div class="text-6xl font-black text-white">{{ score }}<span class="text-3xl text-zinc-400"> / {{ total }}</span></div>
      <div class="mt-2 text-zinc-400 text-sm">{{ scoreLabel }}</div>
      <div class="mt-1 text-xs text-zinc-600">{{ gameState.challengeDate }}</div>
    </div>

    <!-- Stats row -->
    <div v-if="stats" class="grid grid-cols-3 gap-2 text-center">
      <div class="bg-zinc-800 rounded-xl py-3">
        <div class="text-xl font-bold text-white">{{ stats.streak }}</div>
        <div class="text-xs text-zinc-500 mt-0.5">Streak</div>
      </div>
      <div class="bg-zinc-800 rounded-xl py-3">
        <div class="text-xl font-bold text-white">{{ stats.totalGames }}</div>
        <div class="text-xs text-zinc-500 mt-0.5">Played</div>
      </div>
      <div class="bg-zinc-800 rounded-xl py-3">
        <div class="text-xl font-bold text-white">{{ stats.bestScore ?? '—' }}</div>
        <div class="text-xs text-zinc-500 mt-0.5">Best</div>
      </div>
    </div>

    <!-- Per-question summary -->
    <div class="space-y-2">
      <div class="text-xs uppercase tracking-widest text-zinc-600 mb-1">Answers</div>
      <div
        v-for="(answer, i) in gameState.answers"
        :key="i"
        class="flex items-start gap-3 p-3 rounded-xl"
        :class="answer.isCorrect ? 'bg-green-900/20 border border-green-900' : 'bg-red-900/20 border border-red-900'"
      >
        <span class="text-lg mt-0.5">{{ answer.isCorrect ? '✅' : '❌' }}</span>
        <div class="min-w-0">
          <div class="text-sm font-semibold text-white truncate">{{ gameState.questions[i]?.eventName }}</div>
          <div class="text-xs text-zinc-400 mt-0.5">
            <span v-if="!answer.isCorrect" class="text-red-400">
              You chose {{ formatYear(gameState.questions[i]?.choices[answer.selectedIndex ?? 0] ?? 0) }} ·
            </span>
            Correct: <span class="font-bold text-white">{{ formatYear(gameState.questions[i]?.eventYear ?? 0) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Share button -->
    <button
      class="w-full py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-zinc-200 active:scale-95 transition-all"
      @click="share"
    >
      {{ shareStatus === 'copied' ? 'Copied!' : shareStatus === 'shared' ? 'Shared!' : 'Share Result' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DatePickGameState, DatePickStats } from '@/types/datepick'
import { shareResult } from '@/services/datepickSharing'

const props = defineProps<{
  gameState: DatePickGameState
  stats: DatePickStats | null
}>()

const shareStatus = ref<'idle' | 'shared' | 'copied' | 'error'>('idle')

const score = computed(() => props.gameState.answers.filter((a) => a.isCorrect).length)
const total = computed(() => props.gameState.questions.length)

const scoreLabel = computed(() => {
  const s = score.value
  const t = total.value
  if (s === t) return 'Perfect score!'
  if (s >= t * 0.75) return 'Great job!'
  if (s >= t * 0.5) return 'Not bad!'
  return 'Better luck tomorrow'
})

function formatYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} BCE` : String(year)
}

async function share() {
  const result = await shareResult(props.gameState)
  shareStatus.value = result
  setTimeout(() => (shareStatus.value = 'idle'), 2500)
}
</script>
