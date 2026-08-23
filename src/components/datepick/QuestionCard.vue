<template>
  <div class="flex flex-col gap-6 px-4">
    <!-- Event info -->
    <div class="text-center">
      <div class="text-xs uppercase tracking-widest text-zinc-500 mb-2">
        {{ question.region }} · {{ question.categories.join(', ') }}
      </div>
      <h2 class="text-xl font-bold text-white leading-snug">
        {{ question.eventName }}
      </h2>
      <p class="mt-2 text-sm text-zinc-400 leading-relaxed line-clamp-3">
        {{ question.description }}
      </p>
    </div>

    <!-- Choice buttons -->
    <div class="grid grid-cols-2 gap-3">
      <button
        v-for="(year, index) in question.choices"
        :key="index"
        class="flex items-center gap-3 p-4 rounded-xl border text-left transition-all"
        :class="buttonClass(index)"
        :disabled="selectedIndex !== null"
        @click="emit('pick', index)"
      >
        <span
          class="text-xs font-bold text-zinc-400 bg-zinc-700 w-6 h-6 rounded flex items-center justify-center shrink-0"
        >
          {{ letters[index] }}
        </span>
        <span class="text-base font-mono font-bold text-white">{{ formatYear(year) }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DatePickQuestion } from '@/types/datepick'

const props = defineProps<{
  question: DatePickQuestion
  selectedIndex: number | null
}>()

const emit = defineEmits<{
  pick: [index: number]
}>()

const letters = ['A', 'B', 'C', 'D']

function formatYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} BCE` : String(year)
}

function buttonClass(index: number): string {
  if (props.selectedIndex === null) {
    return 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 hover:border-zinc-500 active:scale-95'
  }
  if (index === props.selectedIndex) {
    return 'border-blue-500 bg-blue-900/40'
  }
  return 'border-zinc-800 bg-zinc-900 opacity-40'
}
</script>
