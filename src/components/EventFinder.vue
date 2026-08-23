<template>
  <div class="flex flex-col h-full">
    <!-- Search bar -->
    <div class="px-4 pb-3">
      <div class="relative">
        <input
          ref="inputEl"
          v-model="query"
          type="text"
          placeholder="Search events…"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
          class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 pr-10"
          @input="onInput"
          @keydown.enter.prevent="onEnter"
          @keydown.escape="clearQuery"
        />
        <button
          v-if="query"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
          @click="clearQuery"
          aria-label="Clear search"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Category filter chips -->
    <div class="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
      <button
        v-for="cat in categories"
        :key="cat"
        class="shrink-0 px-3 py-1 rounded-full text-xs border transition-colors"
        :class="
          activeCategory === cat
            ? 'bg-white text-gray-900 border-white'
            : 'bg-transparent text-gray-400 border-gray-700 hover:border-gray-500'
        "
        @click="toggleCategory(cat)"
      >
        {{ cat }}
      </button>
    </div>

    <!-- Results list -->
    <div class="flex-1 overflow-y-auto px-4">
      <p v-if="results.length === 0" class="text-center text-gray-600 py-8 text-sm">
        No events found. Try a different search.
      </p>

      <ul v-else class="space-y-1 pb-2">
        <li
          v-for="event in results.slice(0, 50)"
          :key="event.id"
          class="bg-gray-900 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-800 transition-colors border border-transparent hover:border-gray-700 active:scale-98"
          :class="{ 'opacity-40 pointer-events-none': usedIds.includes(event.id) }"
          role="button"
          tabindex="0"
          :aria-label="event.name"
          @click="emit('select', event)"
          @keydown.enter="emit('select', event)"
          @keydown.space.prevent="emit('select', event)"
        >
          <div class="text-sm font-medium text-white">{{ event.name }}</div>
        </li>
      </ul>
    </div>

    <!-- Always-visible count footer -->
    <div class="px-4 py-2 text-center text-xs text-gray-600 shrink-0">
      <template v-if="results.length === 0">—</template>
      <template v-else-if="results.length > 50">
        Showing 50 of {{ results.length }} — narrow your search to see more
      </template>
      <template v-else>
        Showing {{ results.length }} event{{ results.length === 1 ? '' : 's' }}
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { Event } from '@/types'
import { search, getCategories } from '@/services/eventSearch'

const props = defineProps<{
  events: Event[]
  usedIds: string[]
}>()

const emit = defineEmits<{
  select: [event: Event]
}>()

const query = ref('')
const activeCategory = ref<string | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)

const categories = computed(() => getCategories(props.events))

const results = computed(() =>
  search(query.value, props.events, props.usedIds, activeCategory.value ?? undefined),
)

function onInput() {
  // reactivity handles re-computation via `results`
}

function onEnter() {
  const first = results.value[0]
  if (first) {
    emit('select', first)
  }
}

function clearQuery() {
  query.value = ''
  inputEl.value?.focus()
}

function toggleCategory(cat: string) {
  activeCategory.value = activeCategory.value === cat ? null : cat
}

onMounted(() => {
  inputEl.value?.focus()
})
</script>
