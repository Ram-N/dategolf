<template>
  <div class="flex-1 flex flex-col overflow-hidden">

    <!-- Scrollable content area -->
    <div class="flex-1 overflow-y-auto flex flex-col items-center justify-start px-4 pt-6 pb-3 text-center">

      <!-- Optimal badge -->
      <div v-if="result.isOptimal" class="mb-3 inline-flex items-center gap-2 bg-green-900/50 border border-green-700 rounded-full px-4 py-1.5">
        <span class="text-green-400 text-sm font-semibold">Perfect choice!</span>
      </div>

      <!-- Event name -->
      <h2 class="text-2xl font-bold text-white mb-1">{{ result.eventName }}</h2>

      <!-- Year reveal -->
      <div class="text-5xl font-black tabular-nums my-2" :class="penaltyColorClass">
        {{ displayEventYear }}
      </div>

      <!-- Target vs event -->
      <div class="flex items-center gap-3 text-sm text-gray-400 mb-3">
        <span>Target: <span class="text-white font-medium">{{ displayTargetYear }}</span></span>
        <span class="text-gray-700">·</span>
        <span>Penalty: <span class="font-bold text-lg" :class="penaltyColorClass">+{{ result.penalty }}</span></span>
      </div>

      <!-- Running score -->
      <div class="bg-gray-900 rounded-xl px-6 py-2 mb-3 border border-gray-800">
        <span class="text-xs text-gray-500 uppercase tracking-widest">Running Total</span>
        <div class="text-2xl font-bold tabular-nums" :class="scoreStatusClass">{{ totalScore }}</div>
      </div>

      <!-- Timeline -->
      <div class="w-full max-w-md mb-4">
        <TimelineView :result="result" :events="events" />
      </div>

      <!-- Better alternatives cards -->
      <div v-if="result.betterAlternatives.length > 0" class="w-full max-w-md">
        <p class="text-xs text-gray-500 uppercase tracking-widest mb-2">Better choices were available</p>
        <div class="space-y-2">
          <div
            v-for="alt in result.betterAlternatives"
            :key="alt.eventId"
            class="bg-gray-900 rounded-xl px-4 py-2 flex justify-between items-center border border-gray-800"
          >
            <div class="text-left">
              <div class="text-sm font-medium text-white">{{ alt.eventName }}</div>
              <div class="text-xs text-gray-500">{{ formatYear(alt.eventYear) }}</div>
            </div>
            <div class="text-right">
              <div class="text-lg font-bold text-green-400">+{{ alt.penalty }}</div>
              <div class="text-xs text-gray-600">penalty</div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- CTA — always visible at bottom -->
    <div class="px-4 pb-5 pt-2 shrink-0">
      <button
        class="w-full py-3 rounded-xl bg-white text-gray-900 font-bold text-lg hover:bg-gray-100 transition-colors"
        @click="emit('next')"
      >
        {{ isLastHole ? 'See Final Score' : 'Next Round →' }}
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { HoleResult, ScoreStatus, Event } from '@/types'
import TimelineView from './TimelineView.vue'

const props = defineProps<{
  result: HoleResult
  totalScore: number
  scoreStatus: ScoreStatus
  isLastHole: boolean
  events?: Event[]
}>()

const emit = defineEmits<{ next: [] }>()

function formatYear(y: number) {
  return y < 0 ? `${Math.abs(y)} BCE` : String(y)
}

const displayEventYear = computed(() => formatYear(props.result.eventYear))
const displayTargetYear = computed(() => formatYear(props.result.targetYear))

const penaltyColorClass = computed(() => {
  if (props.result.penalty <= 5) return 'text-green-400'
  if (props.result.penalty <= 30) return 'text-yellow-400'
  return 'text-red-400'
})

const scoreStatusClass = computed(() => ({
  'score-good': props.scoreStatus === 'good',
  'score-warning': props.scoreStatus === 'warning',
  'score-danger': props.scoreStatus === 'danger',
}))
</script>
