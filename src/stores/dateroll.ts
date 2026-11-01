import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Event } from '@/types'
import {
  FULL_VIEW,
  centerOn,
  makeView,
  pan,
  span,
  zoomAround,
  type View,
} from '@/engine/dateroll/timeScale'

const VIEW_KEY = 'dateroll:view'
const JUMP_SPAN = 100 // "Jump to year" opens a 100-year window, the spec's default zoom

function loadView(): View {
  try {
    const raw = localStorage.getItem(VIEW_KEY)
    if (!raw) return FULL_VIEW
    const v = JSON.parse(raw) as View
    return makeView(v.start, v.end - v.start)
  } catch {
    return FULL_VIEW
  }
}

export const useDateRollStore = defineStore('dateroll', () => {
  // ── State ──────────────────────────────────────────────────────────────────
  const events = ref<Event[]>([])
  const isLoading = ref(true)
  const view = ref<View>(loadView())
  const selectedEventId = ref<string | null>(null)

  // ── Computed ───────────────────────────────────────────────────────────────
  const selectedEvent = computed(
    () => events.value.find((e) => e.id === selectedEventId.value) ?? null,
  )
  const viewSpan = computed(() => span(view.value))

  watch(view, (v) => {
    try {
      localStorage.setItem(VIEW_KEY, JSON.stringify(v))
    } catch {
      // storage unavailable — view just won't persist
    }
  })

  // ── Actions ────────────────────────────────────────────────────────────────
  async function load() {
    const eventsModule = await import('@/data/events.json')
    events.value = eventsModule.default as Event[]
    isLoading.value = false
  }

  function zoomAt(anchorYear: number, factor: number) {
    view.value = zoomAround(view.value, anchorYear, factor)
  }

  const center = () => (view.value.start + view.value.end) / 2
  const zoomIn = () => zoomAt(center(), 0.5)
  const zoomOut = () => zoomAt(center(), 2)

  function panBy(deltaYears: number) {
    view.value = pan(view.value, deltaYears)
  }

  function jumpTo(year: number) {
    view.value = centerOn(year, Math.min(viewSpan.value, JUMP_SPAN))
  }

  function reset() {
    view.value = FULL_VIEW
  }

  function select(id: string | null) {
    selectedEventId.value = id
  }

  return {
    events,
    isLoading,
    view,
    viewSpan,
    selectedEvent,
    load,
    zoomAt,
    zoomIn,
    zoomOut,
    panBy,
    jumpTo,
    reset,
    select,
  }
})
