<template>
  <div class="fixed inset-0 bg-black/70 flex items-end z-50" @click.self="emit('cancel')">
    <div
      class="w-full max-w-lg mx-auto bg-gray-900 rounded-t-2xl p-6 pb-8 border-t border-gray-700"
      role="dialog"
      aria-modal="true"
      :aria-label="`Confirm selection: ${event.name}`"
    >
      <div class="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-6" />

      <p class="text-xs uppercase tracking-widest text-gray-500 mb-1">You selected</p>
      <h2 class="text-xl font-bold text-white mb-1">{{ event.name }}</h2>
      <p class="text-sm text-gray-400 mb-4">{{ event.description }}</p>
      <p class="text-xs text-gray-600">
        {{ event.categories.join(' · ') }} · {{ event.region }}
      </p>

      <div class="flex gap-3 mt-6">
        <button
          class="flex-1 py-3 rounded-xl border border-gray-700 text-gray-300 font-medium hover:bg-gray-800 transition-colors"
          @click="emit('cancel')"
        >
          Cancel
        </button>
        <button
          class="flex-1 py-3 rounded-xl bg-white text-gray-900 font-bold hover:bg-gray-100 transition-colors"
          @click="emit('confirm')"
        >
          Lock In
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Event } from '@/types'

defineProps<{ event: Event }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>
