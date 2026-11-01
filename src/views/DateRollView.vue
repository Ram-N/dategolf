<template>
  <div class="dateroll flex flex-col h-[calc(100dvh-40px)]" :data-theme="store.theme">
    <DateRollToolbar
      :view="store.view"
      :theme="store.theme"
      @zoom-in="store.zoomIn()"
      @zoom-out="store.zoomOut()"
      @reset="store.reset()"
      @jump="store.jumpTo"
      @toggle-theme="store.toggleTheme()"
    />

    <DateRollMinimap v-if="!store.isLoading" :years="eventYears" :view="store.view" @center-at="store.centerAt" />

    <div v-if="store.isLoading" class="flex-1 flex items-center justify-center text-sm muted">
      Loading…
    </div>
    <div v-else class="flex-1 min-h-[320px]">
      <DateRollTimeline
        ref="timeline"
        :events="store.events"
        :durations="store.durations"
        :view="store.view"
        :selected-id="store.selectedEvent?.id ?? null"
        :selected-duration-id="store.selectedDuration?.id ?? null"
        @zoom-at="store.zoomAt"
        @pan-by="store.panBy"
        @select="store.select"
        @select-duration="store.selectDuration"
      />
    </div>

    <div class="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2 border-t text-[11px] footer">
      <span v-for="g in CATEGORY_GROUPS" :key="g.id" class="flex items-center gap-1.5 secondary">
        <span class="inline-block w-2.5 h-2.5 rounded-full" :style="{ background: `var(--dr-${g.id})` }" />
        {{ g.label }}
      </span>
      <span class="flex items-center gap-1.5 secondary">
        <span class="inline-block w-4 h-2.5 rounded-sm kind-empire" /> Empire
      </span>
      <span class="flex items-center gap-1.5 secondary">
        <span class="inline-block w-4 h-2.5 rounded-sm kind-period" /> Period
      </span>
      <span v-if="hiddenCount > 0" class="secondary">· {{ hiddenCount }} more in view — zoom in to reveal</span>
      <span class="ml-auto muted">Scroll to zoom · drag to move · ← → pan · + − zoom</span>
    </div>

    <EventInfoCard v-if="store.selectedEvent" :event="store.selectedEvent" @close="store.select(null)" />
    <DurationInfoCard
      v-if="store.selectedDuration"
      :duration="store.selectedDuration"
      :events="store.events"
      @close="store.selectDuration(null)"
      @open-event="store.select"
      @show-on-timeline="showSelectedDuration"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, useTemplateRef } from 'vue'
import { useDateRollStore } from '@/stores/dateroll'
import { CATEGORY_GROUPS } from '@/engine/dateroll/categoryGroups'
import DateRollToolbar from '@/components/dateroll/DateRollToolbar.vue'
import DateRollTimeline from '@/components/dateroll/DateRollTimeline.vue'
import DateRollMinimap from '@/components/dateroll/DateRollMinimap.vue'
import EventInfoCard from '@/components/EventInfoCard.vue'
import DurationInfoCard from '@/components/dateroll/DurationInfoCard.vue'

const store = useDateRollStore()
const timeline = useTemplateRef<InstanceType<typeof DateRollTimeline>>('timeline')
const hiddenCount = computed(() => timeline.value?.hiddenCount ?? 0)
const eventYears = computed(() => store.events.map((e) => e.year))

function onKey(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement || store.selectedEvent || store.selectedDuration) return
  if (e.key === 'ArrowLeft') store.panBy(-store.viewSpan * 0.1)
  else if (e.key === 'ArrowRight') store.panBy(store.viewSpan * 0.1)
  else if (e.key === '+' || e.key === '=') store.zoomIn()
  else if (e.key === '-') store.zoomOut()
}

function showSelectedDuration() {
  const d = store.selectedDuration
  if (!d) return
  store.selectDuration(null)
  store.showSpan(d.startYear, d.endYear)
}

onMounted(() => {
  if (store.isLoading) store.load()
  window.addEventListener('keydown', onKey)
})
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<style>
/* DateRoll theme tokens. Series colours are the validated reference palette
   (slots 1–3, all-pairs colourblind-safe) stepped separately for each surface. */
.dateroll[data-theme='dark'] {
  --dr-bg: #09090b;
  --dr-surface: #18181b;
  --dr-border: #3f3f46;
  --dr-border-soft: #27272a;
  --dr-text: #f4f4f5;
  --dr-text-2: #a1a1aa;
  --dr-muted: #71717a;
  --dr-grid: #1c1c20;
  --dr-axis: #52525b;
  --dr-milestone: #8b8b94;
  --dr-era: rgb(255 255 255 / 0.035);
  --dr-btn: #27272a;
  --dr-btn-hover: #3f3f46;
  --dr-power: #3987e5;
  --dr-knowledge: #d95926;
  --dr-culture: #199e70;
  --dr-other: #8b8b94;
}
.dateroll[data-theme='light'] {
  --dr-bg: #fcfcfb;
  --dr-surface: #ffffff;
  --dr-border: #d4d4d8;
  --dr-border-soft: #e7e7e5;
  --dr-text: #18181b;
  --dr-text-2: #52525b;
  --dr-muted: #71717a;
  --dr-grid: #efefed;
  --dr-axis: #a1a1aa;
  --dr-milestone: #71717a;
  --dr-era: rgb(0 0 0 / 0.035);
  --dr-btn: #f0efec;
  --dr-btn-hover: #e4e4e1;
  --dr-power: #2a78d6;
  --dr-knowledge: #eb6834;
  --dr-culture: #1baf7a;
  --dr-other: #8b8b94;
}
.dateroll {
  background: var(--dr-bg);
  color: var(--dr-text);
}
.dateroll .footer {
  border-color: var(--dr-border-soft);
}
.dateroll .secondary {
  color: var(--dr-text-2);
}
.dateroll .kind-empire {
  background: color-mix(in srgb, var(--dr-text-2) 40%, transparent);
  border: 1px solid var(--dr-text-2);
}
.dateroll .kind-period {
  background: color-mix(in srgb, var(--dr-text-2) 12%, transparent);
  border: 1px dashed var(--dr-text-2);
}
.dateroll .muted {
  color: var(--dr-muted);
}
</style>
