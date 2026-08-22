<template>
  <div class="flex flex-col h-screen max-w-lg mx-auto overflow-hidden">

    <!-- Loading -->
    <div v-if="store.isLoading" class="flex-1 flex items-center justify-center">
      <div class="text-gray-500 text-sm animate-pulse">Loading today's challenge…</div>
    </div>

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

function onEventSelected(event: Event) {
  pendingEvent.value = event
}

function onConfirm() {
  if (!pendingEvent.value) return
  store.pickEvent(pendingEvent.value.id)
  pendingEvent.value = null
}
</script>
