<template>
  <!-- Shown wherever an approximate event's year is revealed: a "c." alone is easy to miss -->
  <div role="note" class="rounded-lg border border-amber-600/60 bg-amber-950/60 px-3 py-2 text-left">
    <div class="text-xs font-bold uppercase tracking-widest text-amber-400">≈ Approximate date</div>
    <p class="text-sm text-amber-100 mt-1 leading-snug">
      <template v-if="range">Historians' dates: <span class="font-semibold">{{ range }}</span>. </template>
      The year shown is a conventional estimate, not a known exact date.
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ range?: string }>()
</script>
