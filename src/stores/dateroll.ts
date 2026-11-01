import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Event } from '@/types'
import {
  FULL_VIEW,
  centerOn,
  easeOutCubic,
  interpolateView,
  makeView,
  pan,
  span,
  zoomAround,
  type View,
} from '@/engine/dateroll/timeScale'

const VIEW_KEY = 'dateroll:view'
const THEME_KEY = 'dateroll:theme'
const JUMP_SPAN = 100 // "Jump to year" opens a 100-year window, the spec's default zoom
const ANIM_MS = 350

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

export type Theme = 'light' | 'dark'

function loadTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // fall through to the system preference
  }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export const useDateRollStore = defineStore('dateroll', () => {
  // ── State ──────────────────────────────────────────────────────────────────
  const events = ref<Event[]>([])
  const isLoading = ref(true)
  const view = ref<View>(loadView())
  const selectedEventId = ref<string | null>(null)
  const theme = ref<Theme>(loadTheme())

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

  watch(theme, (t) => {
    try {
      localStorage.setItem(THEME_KEY, t)
    } catch {
      // storage unavailable — theme just won't persist
    }
  })

  // ── Actions ────────────────────────────────────────────────────────────────
  async function load() {
    const eventsModule = await import('@/data/events.json')
    events.value = eventsModule.default as Event[]
    isLoading.value = false
  }

  // ── View animation ─────────────────────────────────────────────────────────
  // Buttons, jump and reset ease to their target; direct input (wheel, drag, pinch)
  // applies instantly and cancels any animation in flight.
  let animFrame: number | null = null
  let animTarget: View | null = null

  function stopAnimation() {
    if (animFrame !== null) cancelAnimationFrame(animFrame)
    animFrame = null
    animTarget = null
  }

  function animateTo(target: View) {
    stopAnimation()
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      view.value = target
      return
    }
    const from = view.value
    const t0 = performance.now()
    animTarget = target
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / ANIM_MS)
      view.value = interpolateView(from, target, easeOutCubic(t))
      if (t < 1) {
        animFrame = requestAnimationFrame(step)
      } else {
        animFrame = null
        animTarget = null
      }
    }
    animFrame = requestAnimationFrame(step)
  }

  /** Where the view is heading — so repeated clicks build on the target, not a mid-animation frame. */
  const goal = () => animTarget ?? view.value
  const centerOf = (v: View) => (v.start + v.end) / 2

  // ── Direct input (instant) ───────────────────────────────────────────────
  function zoomAt(anchorYear: number, factor: number) {
    stopAnimation()
    view.value = zoomAround(view.value, anchorYear, factor)
  }

  function panBy(deltaYears: number) {
    stopAnimation()
    view.value = pan(view.value, deltaYears)
  }

  /** Move the view so `year` is centred, keeping the current zoom. */
  function centerAt(year: number, animate = false) {
    const target = centerOn(year, span(goal()))
    if (animate) return animateTo(target)
    stopAnimation()
    view.value = target
  }

  // ── Buttons (animated) ───────────────────────────────────────────────────
  const zoomIn = () => animateTo(zoomAround(goal(), centerOf(goal()), 0.5))
  const zoomOut = () => animateTo(zoomAround(goal(), centerOf(goal()), 2))

  function jumpTo(year: number) {
    animateTo(centerOn(year, Math.min(span(goal()), JUMP_SPAN)))
  }

  function reset() {
    animateTo(FULL_VIEW)
  }

  function select(id: string | null) {
    selectedEventId.value = id
  }

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  return {
    events,
    isLoading,
    view,
    viewSpan,
    selectedEvent,
    theme,
    load,
    zoomAt,
    zoomIn,
    zoomOut,
    panBy,
    centerAt,
    jumpTo,
    reset,
    select,
    toggleTheme,
  }
})
