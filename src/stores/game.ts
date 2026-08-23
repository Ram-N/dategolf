import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Event, GameState, HoleResult, PlayerStats, DailyChallenge } from '@/types'
import { createGame, selectEvent, getScoreStatus } from '@/engine/gameEngine'
import { generateDailyChallenge } from '@/engine/challengeGenerator'
import { saveSession, loadSession, recordCompletion, loadStats } from '@/services/persistence'
import { initSearch } from '@/services/eventSearch'

export const useGameStore = defineStore('game', () => {
  // ── State ──────────────────────────────────────────────────────────────────
  const events = ref<Event[]>([])
  const gameState = ref<GameState | null>(null)
  const lastHoleResult = ref<HoleResult | null>(null)
  const playerStats = ref<PlayerStats | null>(null)
  const challenge = ref<DailyChallenge | null>(null)
  const isLoading = ref(true)
  const phase = ref<'landing' | 'playing' | 'revealing' | 'complete'>('landing')

  // ── Computed ───────────────────────────────────────────────────────────────
  const currentHole = computed(() => gameState.value?.currentHole ?? 0)
  const totalScore = computed(() => gameState.value?.totalScore ?? 0)
  const targetYear = computed(() =>
    gameState.value ? gameState.value.targetYears[gameState.value.currentHole] : null,
  )
  const usedEventIds = computed(() => gameState.value?.usedEventIds ?? [])
  const holeResults = computed(() => gameState.value?.holeResults ?? [])
  const isComplete = computed(() => gameState.value?.completed ?? false)
  const scoreStatus = computed(() =>
    getScoreStatus(totalScore.value, holeResults.value.length),
  )

  // ── Actions ────────────────────────────────────────────────────────────────
  async function init(todayDate: string) {
    isLoading.value = true

    // Load events from JSON
    const eventsModule = await import('@/data/events.json')
    events.value = eventsModule.default as Event[]
    initSearch(events.value)

    // Load today's challenge from pre-generated file; fall back to generator
    const mmdd = todayDate.slice(5) // "2026-08-22" → "08-22"
    try {
      const res = await fetch('/data/daily_challenges.json')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const allChallenges = (await res.json()) as Record<string, number[]>
      const targetYears = allChallenges[mmdd]
      if (!targetYears || targetYears.length !== 5) throw new Error('Missing entry')
      challenge.value = { id: `challenge-${todayDate}`, date: todayDate, targetYears }
    } catch {
      challenge.value = generateDailyChallenge(todayDate)
    }

    // Try to resume a saved game
    const saved = loadSession(todayDate)
    if (saved) {
      gameState.value = saved
      // Resume mid-game directly; completed or fresh → show landing
      phase.value = saved.completed ? 'landing' : 'playing'
    } else {
      gameState.value = createGame(challenge.value)
      phase.value = 'landing'
    }

    playerStats.value = loadStats()
    isLoading.value = false
  }

  function pickEvent(eventId: string) {
    if (!gameState.value || !events.value.length) return

    const { newState, result } = selectEvent(gameState.value, eventId, events.value)
    gameState.value = newState
    lastHoleResult.value = result
    phase.value = 'revealing'

    saveSession(newState)

    if (newState.completed) {
      playerStats.value = recordCompletion(newState)
    }
  }

  function startChallenge() {
    phase.value = 'playing'
  }

  function advanceFromReveal() {
    if (!gameState.value) return
    if (gameState.value.completed) {
      phase.value = 'complete'
    } else {
      phase.value = 'playing'
      lastHoleResult.value = null
    }
  }

  return {
    // state
    events,
    gameState,
    lastHoleResult,
    playerStats,
    challenge,
    isLoading,
    phase,
    // computed
    currentHole,
    totalScore,
    targetYear,
    usedEventIds,
    holeResults,
    isComplete,
    scoreStatus,
    // actions
    init,
    startChallenge,
    pickEvent,
    advanceFromReveal,
  }
})
