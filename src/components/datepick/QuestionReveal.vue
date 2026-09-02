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

    <!-- date-LINKS section -->
    <div v-if="dateLinks" class="border-t border-zinc-800 pt-4 space-y-1">
      <div class="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
        Ways to Remember {{ question.eventYear < 0 ? Math.abs(question.eventYear) + ' BCE' : question.eventYear }}
      </div>
      <div v-for="(group, gi) in dateLinks.groups" :key="gi">
        <button
          class="w-full flex items-center gap-2 py-2 text-left text-sm font-medium text-zinc-300 hover:text-white transition-colors"
          @click="toggleGroup(gi)"
        >
          <span class="text-zinc-500 text-xs w-3">{{ openGroups[gi] ? '▼' : '▶' }}</span>
          {{ group.label }}
        </button>
        <div v-if="openGroups[gi]" class="pl-5 pb-2 space-y-2">
          <template v-if="group.label === 'Event Timeline'">
            <div
              v-for="(item, ii) in group.items"
              :key="ii"
              class="text-xs leading-snug flex gap-2"
            >
              <span class="font-mono text-zinc-300 shrink-0">{{ timelineYear(item) }}</span>
              <span class="text-zinc-500">{{ timelineDesc(item) }}</span>
            </div>
          </template>
          <template v-else>
            <p
              v-for="(item, ii) in group.items"
              :key="ii"
              class="text-xs text-zinc-400 leading-relaxed"
            >
              {{ item }}
            </p>
          </template>
        </div>
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
import { computed, ref, watch } from 'vue'
import type { DatePickQuestion } from '@/types/datepick'
import { getDateLinks } from '@/utils/dateLinkLookup'

const props = defineProps<{
  question: DatePickQuestion
  selectedIndex: number | null
  isLastQuestion: boolean
}>()

const emit = defineEmits<{
  next: []
}>()

const isCorrect = computed(() => props.selectedIndex === props.question.correctIndex)

const dateLinks = computed(() => getDateLinks(props.question.eventId))

const openGroups = ref<boolean[]>([])

watch(
  () => props.question.eventId,
  () => {
    openGroups.value = []
  },
  { immediate: true },
)

function toggleGroup(index: number) {
  openGroups.value[index] = !openGroups.value[index]
}

function formatYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} BCE` : String(year)
}

function timelineYear(item: string): string {
  const i = item.indexOf(' — ')
  return i >= 0 ? item.slice(0, i) : item
}

function timelineDesc(item: string): string {
  const i = item.indexOf(' — ')
  return i >= 0 ? item.slice(i + 3) : ''
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
