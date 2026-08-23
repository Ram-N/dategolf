<template>
  <div class="flex flex-col gap-6 px-4">
    <!-- Result banner -->
    <div
      class="rounded-xl p-4 text-center"
      :class="isCorrect ? 'bg-green-900/40 border border-green-700' : 'bg-red-900/40 border border-red-700'"
    >
      <div class="text-2xl mb-1">{{ isCorrect ? '✓' : '✗' }}</div>
      <div class="text-lg font-bold" :class="isCorrect ? 'text-green-400' : 'text-red-400'">
        {{ isCorrect ? 'Correct!' : 'Not quite' }}
      </div>
      <div class="text-sm text-zinc-300 mt-1">
        The answer is <span class="font-bold text-white">{{ formatYear(question.eventYear) }}</span>
      </div>
    </div>

    <!-- Event details -->
    <div class="space-y-3">
      <h3 class="text-base font-bold text-white">{{ question.eventName }}</h3>
      <p class="text-sm text-zinc-400 leading-relaxed">{{ question.description }}</p>
    </div>

    <!-- Choice summary -->
    <div class="grid grid-cols-2 gap-2">
      <div
        v-for="(year, index) in question.choices"
        :key="index"
        class="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm"
        :class="choiceRevealClass(index)"
      >
        <span class="font-mono font-bold">{{ formatYear(year) }}</span>
        <span v-if="index === question.correctIndex" class="ml-auto text-green-400 text-xs">✓</span>
        <span v-else-if="index === selectedIndex" class="ml-auto text-red-400 text-xs">✗</span>
      </div>
    </div>

    <!-- Next button -->
    <button
      class="w-full py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-zinc-200 active:scale-95 transition-all"
      @click="emit('next')"
    >
      {{ isLastQuestion ? 'See Results' : 'Next Question' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DatePickQuestion } from '@/types/datepick'

const props = defineProps<{
  question: DatePickQuestion
  selectedIndex: number | null
  isLastQuestion: boolean
}>()

const emit = defineEmits<{
  next: []
}>()

const isCorrect = computed(() => props.selectedIndex === props.question.correctIndex)

function formatYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} BCE` : String(year)
}

function choiceRevealClass(index: number): string {
  if (index === props.question.correctIndex) {
    return 'border-green-600 bg-green-900/30 text-green-300'
  }
  if (index === props.selectedIndex) {
    return 'border-red-600 bg-red-900/30 text-red-300'
  }
  return 'border-zinc-800 bg-zinc-900 text-zinc-500'
}
</script>
