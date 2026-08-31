<template>
  <div class="flex flex-col h-screen max-w-lg mx-auto overflow-hidden bg-zinc-950 text-white">
    <!-- Loading -->
    <div v-if="store.isLoading" class="flex-1 flex items-center justify-center">
      <div class="text-zinc-500 text-sm">Loading…</div>
    </div>

    <template v-else>
      <!-- Landing -->
      <div v-if="store.phase === 'landing'" class="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        <div class="text-center">
          <div class="text-xs uppercase tracking-widest text-zinc-500 mb-2">Daily Challenge</div>
          <h1 class="text-4xl font-black text-white tracking-tight">DatePick</h1>
          <p class="mt-3 text-zinc-400 text-sm max-w-xs mx-auto leading-relaxed">
            8 historical events. For each one, pick the correct year from 4 choices.
          </p>
        </div>

        <!-- Already played -->
        <div v-if="store.isComplete" class="w-full space-y-4">
          <div class="text-center py-4 bg-zinc-800 rounded-2xl">
            <div class="text-4xl font-black text-white">{{ store.score }}<span class="text-xl text-zinc-400"> / {{ store.progress.total }}</span></div>
            <div class="text-sm text-zinc-400 mt-1">Today's score</div>
          </div>
          <button
            class="w-full py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-zinc-200 active:scale-95 transition-all"
            @click="viewResults"
          >
            View Results
          </button>
        </div>

        <!-- Not yet played -->
        <div v-else class="w-full space-y-4">
          <div v-if="store.stats" class="grid grid-cols-2 gap-3 text-center">
            <div class="bg-zinc-800 rounded-xl py-3">
              <div class="text-2xl font-bold text-white">{{ store.stats.streak }}</div>
              <div class="text-xs text-zinc-500 mt-0.5">Day streak</div>
            </div>
            <div class="bg-zinc-800 rounded-xl py-3">
              <div class="text-2xl font-bold text-white">{{ store.stats.bestScore ?? '—' }}</div>
              <div class="text-xs text-zinc-500 mt-0.5">Best score</div>
            </div>
          </div>
          <button
            class="w-full py-4 rounded-xl bg-white text-black font-bold hover:bg-zinc-200 active:scale-95 transition-all"
            @click="store.startChallenge()"
          >
            Start Challenge
          </button>
        </div>

        <div class="text-xs text-zinc-700">{{ todayDate }}</div>
      </div>

      <!-- Playing -->
      <template v-else-if="store.phase === 'playing'">
        <DatePickHeader
          :current-question="store.progress.current"
          :total-questions="store.progress.total"
          :score="store.score"
          :answers="store.gameState?.answers ?? []"
        />
        <div class="flex-1 overflow-y-auto py-4">
          <QuestionCard
            v-if="store.currentQuestion"
            :question="store.currentQuestion"
            :selected-index="store.currentAnswer?.selectedIndex ?? null"
            @pick="store.pickAnswer"
          />
        </div>
      </template>

      <!-- Revealing -->
      <template v-else-if="store.phase === 'revealing'">
        <DatePickHeader
          :current-question="store.progress.current"
          :total-questions="store.progress.total"
          :score="store.score"
          :answers="store.gameState?.answers ?? []"
        />
        <div class="flex-1 overflow-y-auto py-4">
          <QuestionReveal
            v-if="store.currentQuestion"
            :question="store.currentQuestion"
            :selected-index="store.currentAnswer?.selectedIndex ?? null"
            :is-last-question="store.progress.current === store.progress.total - 1"
            @next="store.advanceFromReveal()"
          />
        </div>
      </template>

      <!-- Complete -->
      <template v-else-if="store.phase === 'complete'">
        <div class="flex-1 overflow-y-auto">
          <DatePickResults
            v-if="store.gameState"
            :game-state="store.gameState"
            :stats="store.stats"
          />
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useDatePickStore } from '@/stores/datepick'
import DatePickHeader from '@/components/datepick/DatePickHeader.vue'
import QuestionCard from '@/components/datepick/QuestionCard.vue'
import QuestionReveal from '@/components/datepick/QuestionReveal.vue'
import DatePickResults from '@/components/datepick/DatePickResults.vue'

const store = useDatePickStore()
const todayDate = ref('')

onMounted(() => {
  todayDate.value = new Date().toISOString().slice(0, 10)
  store.init(todayDate.value)
})

function viewResults() {
  store.phase = 'complete'
}
</script>
