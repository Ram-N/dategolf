import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Event } from '@/types'
import type { DatePickGameState, DatePickStats } from '@/types/datepick'
import { generateDatePickChallenge } from '@/engine/datepick/challengeGenerator'
import {
  saveSession,
  loadSession,
  recordCompletion,
  loadStats,
} from '@/services/datepickPersistence'

export const useDatePickStore = defineStore('datepick', () => {
  // ── State ──────────────────────────────────────────────────────────────────
  const events = ref<Event[]>([])
  const gameState = ref<DatePickGameState | null>(null)
  const phase = ref<'landing' | 'playing' | 'revealing' | 'complete'>('landing')
  const isLoading = ref(true)
  const stats = ref<DatePickStats | null>(null)

  // ── Computed ───────────────────────────────────────────────────────────────
  const currentQuestion = computed(() =>
    gameState.value
      ? gameState.value.questions[gameState.value.currentQuestion] ?? null
      : null,
  )

  const currentAnswer = computed(() =>
    gameState.value
      ? (gameState.value.answers[gameState.value.currentQuestion] ?? null)
      : null,
  )

  const score = computed(
    () => gameState.value?.answers.filter((a) => a.isCorrect).length ?? 0,
  )

  const isComplete = computed(() => gameState.value?.completed ?? false)

  const progress = computed(() => ({
    current: gameState.value?.currentQuestion ?? 0,
    total: gameState.value?.questions.length ?? 8,
  }))

  // ── Actions ────────────────────────────────────────────────────────────────
  async function init(todayDate: string) {
    isLoading.value = true

    // Load events from JSON
    const eventsModule = await import('@/data/events.json')
    events.value = eventsModule.default as Event[]

    // Try to resume a saved session for today
    const saved = loadSession(todayDate)
    if (saved) {
      gameState.value = saved
      phase.value = saved.completed ? 'landing' : 'playing'
    } else {
      const challenge = generateDatePickChallenge(todayDate, events.value)
      gameState.value = {
        challengeDate: todayDate,
        questions: challenge.questions,
        currentQuestion: 0,
        answers: [],
        completed: false,
      }
      phase.value = 'landing'
    }

    stats.value = loadStats()
    isLoading.value = false
  }

  function startChallenge() {
    phase.value = 'playing'
  }

  function pickAnswer(selectedIndex: number) {
    if (!gameState.value || phase.value !== 'playing') return

    const qIndex = gameState.value.currentQuestion
    const question = gameState.value.questions[qIndex]
    if (!question) return

    const isCorrect = selectedIndex === question.correctIndex

    gameState.value.answers[qIndex] = {
      questionIndex: qIndex,
      selectedIndex,
      isCorrect,
    }

    phase.value = 'revealing'
    saveSession(gameState.value)
  }

  function advanceFromReveal() {
    if (!gameState.value) return

    const nextIndex = gameState.value.currentQuestion + 1
    if (nextIndex >= gameState.value.questions.length) {
      // All questions answered
      gameState.value.completed = true
      saveSession(gameState.value)
      stats.value = recordCompletion(gameState.value)
      phase.value = 'complete'
    } else {
      gameState.value.currentQuestion = nextIndex
      phase.value = 'playing'
    }
  }

  return {
    // state
    events,
    gameState,
    phase,
    isLoading,
    stats,
    // computed
    currentQuestion,
    currentAnswer,
    score,
    isComplete,
    progress,
    // actions
    init,
    startChallenge,
    pickAnswer,
    advanceFromReveal,
  }
})
