<template>
  <div class="flex items-center justify-between px-4 py-3">
    <div class="flex gap-1.5">
      <span
        v-for="i in totalQuestions"
        :key="i"
        class="w-3 h-3 rounded-full"
        :class="dotClass(i - 1)"
      />
    </div>
    <div class="text-sm font-mono text-zinc-400">
      <span class="text-white font-bold">{{ score }}</span>
      <span class="mx-1">/</span>
      <span>{{ currentQuestion + 1 }} of {{ totalQuestions }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DatePickAnswer } from '@/types/datepick'

const props = defineProps<{
  currentQuestion: number
  totalQuestions: number
  score: number
  answers: DatePickAnswer[]
}>()

function dotClass(index: number): string {
  if (index > props.currentQuestion) return 'bg-zinc-700'
  const answer = props.answers[index]
  if (!answer) return 'bg-zinc-500'
  return answer.isCorrect ? 'bg-green-500' : 'bg-red-500'
}
</script>
