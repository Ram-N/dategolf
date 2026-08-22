<template>
  <div class="flex flex-col h-screen max-w-lg mx-auto overflow-hidden">

    <!-- Loading -->
    <div v-if="store.isLoading" class="flex-1 flex items-center justify-center">
      <div class="text-gray-500 text-sm animate-pulse">Loading today's challenge…</div>
    </div>

    <!-- Landing -->
    <template v-else-if="store.phase === 'landing'">
      <div class="flex-1 flex flex-col items-center justify-center px-6 text-center bg-gray-950">

        <p class="text-xs uppercase tracking-widest text-gray-500 mb-2">Daily Challenge</p>
        <h1 class="text-4xl font-black text-white mb-1">DateGolf</h1>
        <p class="text-sm text-gray-500 mb-10">Match events to target years. Lowest penalty wins.</p>

        <!-- Already played today -->
        <template v-if="store.gameState?.completed">
          <p class="text-xs uppercase tracking-widest text-gray-500 mb-1">You already played today</p>
          <div class="text-6xl font-black text-white mb-1">{{ store.totalScore }}</div>
          <p class="text-sm text-gray-500 mb-6">total years off across 5 holes</p>

          <!-- Quick hole summary -->
          <div class="w-full max-w-sm mb-8 space-y-2">
            <div
              v-for="(result, i) in store.holeResults"
              :key="i"
              class="flex items-center justify-between bg-gray-900 rounded-xl px-4 py-2 border border-gray-800"
            >
              <div class="text-left">
                <div class="text-xs text-gray-500">Hole {{ i + 1 }} · {{ formatYear(result.targetYear) }}</div>
                <div class="text-sm text-white truncate max-w-[200px]">{{ result.eventName }}</div>
              </div>
              <div class="text-lg font-bold ml-3" :class="penaltyClass(result.penalty)">+{{ result.penalty }}</div>
            </div>
          </div>

          <button
            class="w-full max-w-sm py-4 rounded-xl bg-white text-gray-900 font-bold text-lg hover:bg-gray-100 transition-colors mb-3"
            @click="store.phase = 'complete'"
          >
            View Full Results
          </button>
          <p class="text-xs text-gray-600 mb-8">Come back tomorrow for a new challenge</p>
        </template>

        <!-- Not yet played -->
        <template v-else>
          <button
            class="w-full max-w-sm py-5 rounded-2xl bg-green-500 text-white font-black text-xl hover:bg-green-400 transition-colors mb-10 shadow-lg shadow-green-900/40"
            @click="store.startChallenge()"
          >
            Start Daily Challenge
          </button>
        </template>

        <!-- Stats (shown for all players) -->
        <div v-if="store.playerStats && store.playerStats.totalGames > 0" class="flex gap-6">
          <div class="text-center">
            <div class="text-2xl font-bold text-white">{{ store.playerStats.streak }}</div>
            <div class="text-xs text-gray-500 uppercase tracking-widest">Streak</div>
          </div>
          <div class="w-px bg-gray-800" />
          <div class="text-center">
            <div class="text-2xl font-bold text-white">{{ store.playerStats.bestScore ?? '—' }}</div>
            <div class="text-xs text-gray-500 uppercase tracking-widest">Best</div>
          </div>
          <div class="w-px bg-gray-800" />
          <div class="text-center">
            <div class="text-2xl font-bold text-white">{{ store.playerStats.totalGames }}</div>
            <div class="text-xs text-gray-500 uppercase tracking-widest">Games</div>
          </div>
        </div>

      </div>
    </template>

    <!-- Final score -->
    <template v-else-if="store.phase === 'complete'">
      <GameHeader
        :currentHole="store.currentHole"
        :totalScore="store.totalScore"
        :scoreStatus="store.scoreStatus"
        :completed="true"
      />
      <FinalScoreView
        :gameState="store.gameState!"
        :holeResults="store.holeResults"
        :totalScore="store.totalScore"
        :scoreStatus="store.scoreStatus"
        :stats="store.playerStats"
      />
    </template>

    <!-- Answer reveal -->
    <template v-else-if="store.phase === 'revealing' && store.lastHoleResult">
      <GameHeader
        :currentHole="store.currentHole"
        :totalScore="store.totalScore"
        :scoreStatus="store.scoreStatus"
        :completed="false"
      />
      <AnswerReveal
        :result="store.lastHoleResult"
        :totalScore="store.totalScore"
        :scoreStatus="store.scoreStatus"
        :isLastHole="store.currentHole >= 5"
        @next="store.advanceFromReveal()"
      />
    </template>

    <!-- Playing -->
    <template v-else-if="store.phase === 'playing'">
      <GameHeader
        :currentHole="store.currentHole"
        :totalScore="store.totalScore"
        :scoreStatus="store.scoreStatus"
        :completed="false"
      />

      <TargetYear
        v-if="store.targetYear !== null && store.targetYear !== undefined"
        :year="(store.targetYear as number)"
        :currentHole="store.currentHole"
      />

      <div class="flex-1 overflow-hidden flex flex-col">
        <EventFinder
          :events="store.events"
          :usedIds="store.usedEventIds"
          @select="onEventSelected"
        />
      </div>
    </template>

    <!-- Confirm modal -->
    <ConfirmSelection
      v-if="pendingEvent"
      :event="pendingEvent"
      @confirm="onConfirm"
      @cancel="pendingEvent = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Event } from '@/types'
import { useGameStore } from '@/stores/game'
import GameHeader from '@/components/GameHeader.vue'
import TargetYear from '@/components/TargetYear.vue'
import EventFinder from '@/components/EventFinder.vue'
import ConfirmSelection from '@/components/ConfirmSelection.vue'
import AnswerReveal from '@/components/AnswerReveal.vue'
import FinalScoreView from '@/components/FinalScoreView.vue'

const store = useGameStore()
const pendingEvent = ref<Event | null>(null)

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

onMounted(() => {
  store.init(getTodayDate())
})

function formatYear(y: number) {
  return y < 0 ? `${Math.abs(y)} BCE` : String(y)
}

function penaltyClass(p: number) {
  if (p <= 5) return 'text-green-400'
  if (p <= 30) return 'text-yellow-400'
  return 'text-red-400'
}

function onEventSelected(event: Event) {
  pendingEvent.value = event
}

function onConfirm() {
  if (!pendingEvent.value) return
  store.pickEvent(pendingEvent.value.id)
  pendingEvent.value = null
}
</script>
