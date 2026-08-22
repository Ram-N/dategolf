import type {
  Event,
  GameState,
  DailyChallenge,
  HoleResult,
  BetterAlternative,
  ScoreStatus,
} from '@/types'

// ── Constants ─────────────────────────────────────────────────────────────────
const HOLES_PER_GAME = 5
const MAX_ALTERNATIVES = 2

// Score thresholds per hole (cumulative score / holes played)
const SCORE_THRESHOLDS = {
  good: 20,    // avg ≤ 20 years per hole → green
  warning: 75, // avg ≤ 75 → orange
  // > 75 → danger/red
}

// ── Core helpers ──────────────────────────────────────────────────────────────
export function penalty(targetYear: number, eventYear: number): number {
  return Math.abs(targetYear - eventYear)
}

export function getScoreStatus(score: number, holesPlayed: number): ScoreStatus {
  if (holesPlayed === 0) return 'good'
  const avg = score / holesPlayed
  if (avg <= SCORE_THRESHOLDS.good) return 'good'
  if (avg <= SCORE_THRESHOLDS.warning) return 'warning'
  return 'danger'
}

// ── Alternatives ──────────────────────────────────────────────────────────────
export function findBetterAlternatives(
  targetYear: number,
  usedIds: string[],
  events: Event[],
  playerEventId: string,
): BetterAlternative[] {
  const playerPenalty = penalty(targetYear, events.find(e => e.id === playerEventId)!.year)

  const candidates = events
    .filter(e => !usedIds.includes(e.id) && e.id !== playerEventId)
    .map(e => ({ e, p: penalty(targetYear, e.year) }))
    .filter(({ p }) => p < playerPenalty)
    .sort((a, b) => a.p - b.p)

  // Try to return one from each side of the target for educational value
  const before = candidates.filter(({ e }) => e.year <= targetYear)
  const after = candidates.filter(({ e }) => e.year > targetYear)

  const picked: typeof candidates = []
  const beforeFirst = before[0]
  const afterFirst = after[0]
  if (beforeFirst) picked.push(beforeFirst)
  if (afterFirst) picked.push(afterFirst)

  // If we only found candidates on one side, fill with next best overall
  if (picked.length < MAX_ALTERNATIVES) {
    for (const c of candidates) {
      if (picked.length >= MAX_ALTERNATIVES) break
      if (!picked.includes(c)) picked.push(c)
    }
  }

  return picked.slice(0, MAX_ALTERNATIVES).map(({ e, p }) => ({
    eventId: e.id,
    eventName: e.name,
    eventYear: e.year,
    penalty: p,
  }))
}

// ── Game lifecycle ─────────────────────────────────────────────────────────────
export function createGame(challenge: DailyChallenge): GameState {
  return {
    challengeId: challenge.id,
    challengeDate: challenge.date,
    targetYears: challenge.targetYears,
    currentHole: 0,
    usedEventIds: [],
    holeResults: [],
    totalScore: 0,
    completed: false,
  }
}

export function selectEvent(
  state: GameState,
  eventId: string,
  events: Event[],
): { newState: GameState; result: HoleResult } {
  if (state.completed) {
    throw new Error('Game is already complete')
  }
  if (state.currentHole >= HOLES_PER_GAME) {
    throw new Error('All holes have been played')
  }
  if (state.usedEventIds.includes(eventId)) {
    throw new Error(`Event "${eventId}" has already been used in this round`)
  }

  const event = events.find(e => e.id === eventId)
  if (!event) {
    throw new Error(`Event "${eventId}" not found`)
  }

  const holeIndex = state.currentHole
  const targetYear = state.targetYears[holeIndex] ?? 0
  const holePenalty = penalty(targetYear, event.year)

  // Find alternatives *before* adding this event to usedIds
  const betterAlts = findBetterAlternatives(targetYear, state.usedEventIds, events, eventId)
  const isOptimal = betterAlts.length === 0

  const result: HoleResult = {
    holeIndex,
    targetYear,
    eventId: event.id,
    eventName: event.name,
    eventYear: event.year,
    penalty: holePenalty,
    isOptimal,
    betterAlternatives: betterAlts,
  }

  const newUsedIds = [...state.usedEventIds, eventId]
  const newHoleResults = [...state.holeResults, result]
  const newTotal = state.totalScore + holePenalty
  const newHole = holeIndex + 1
  const newCompleted = newHole >= HOLES_PER_GAME

  const newState: GameState = {
    ...state,
    currentHole: newHole,
    usedEventIds: newUsedIds,
    holeResults: newHoleResults,
    totalScore: newTotal,
    completed: newCompleted,
  }

  return { newState, result }
}

export function isComplete(state: GameState): boolean {
  return state.completed
}
