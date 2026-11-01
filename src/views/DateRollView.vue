<template>
  <div class="flex flex-col h-[calc(100dvh-40px)] bg-zinc-950 text-white">
    <DateRollToolbar
      :view="store.view"
      @zoom-in="store.zoomIn()"
      @zoom-out="store.zoomOut()"
      @reset="store.reset()"
      @jump="store.jumpTo"
    />

    <div v-if="store.isLoading" class="flex-1 flex items-center justify-center text-zinc-500 text-sm">
      Loading…
    </div>
    <div v-else class="flex-1 min-h-[320px]">
      <DateRollTimeline
        :events="store.events"
        :view="store.view"
        :selected-id="store.selectedEvent?.id ?? null"
        @zoom-at="store.zoomAt"
        @pan-by="store.panBy"
        @select="store.select"
      />
    </div>

    <p class="px-4 py-2 text-[11px] text-zinc-600 border-t border-zinc-900">
      Scroll to zoom · drag to move · ← → to pan · + − to zoom · click an event for details
    </p>

    <EventInfoCard v-if="store.selectedEvent" :event="store.selectedEvent" @close="store.select(null)" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useDateRollStore } from '@/stores/dateroll'
import DateRollToolbar from '@/components/dateroll/DateRollToolbar.vue'
import DateRollTimeline from '@/components/dateroll/DateRollTimeline.vue'
import EventInfoCard from '@/components/EventInfoCard.vue'

const store = useDateRollStore()

function onKey(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement || store.selectedEvent) return
  if (e.key === 'ArrowLeft') store.panBy(-store.viewSpan * 0.1)
  else if (e.key === 'ArrowRight') store.panBy(store.viewSpan * 0.1)
  else if (e.key === '+' || e.key === '=') store.zoomIn()
  else if (e.key === '-') store.zoomOut()
}

onMounted(() => {
  if (store.isLoading) store.load()
  window.addEventListener('keydown', onKey)
})
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>
