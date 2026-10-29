<template>
  <div v-if="dateLinks" class="border-t border-zinc-800 pt-4 space-y-1">
    <div class="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
      Ways to Remember {{ year < 0 ? Math.abs(year) + ' BCE' : year }}
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
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getDateLinks } from '@/utils/dateLinkLookup'

const props = defineProps<{
  eventId: string
  year: number
}>()

const dateLinks = computed(() => getDateLinks(props.eventId))

const openGroups = ref<boolean[]>([])

watch(
  () => props.eventId,
  () => {
    openGroups.value = []
  },
  { immediate: true },
)

function toggleGroup(index: number) {
  openGroups.value[index] = !openGroups.value[index]
}

function timelineYear(item: string): string {
  const i = item.indexOf(' — ')
  return i >= 0 ? item.slice(0, i) : item
}

function timelineDesc(item: string): string {
  const i = item.indexOf(' — ')
  return i >= 0 ? item.slice(i + 3) : ''
}
</script>
