<template>
  <div class="flex flex-col items-center py-8 px-4">
    <p class="text-xs uppercase tracking-widest text-gray-500 mb-2">Target Year</p>
    <div class="text-6xl font-black tabular-nums text-white tracking-tight">
      {{ displayYear }}
    </div>
    <p class="text-xs text-gray-600 mt-2">Hole {{ currentHole + 1 }} of 5</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  year: number
  currentHole: number
}>()

const displayYear = computed(() => {
  if (props.year < 0) return `${Math.abs(props.year)} BCE`
  return String(props.year)
})
</script>
