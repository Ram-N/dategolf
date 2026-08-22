// ── Event ─────────────────────────────────────────────────────────────────────
export interface Event {
  id: string
  name: string
  year: number // BCE years are negative (e.g. -44 = 44 BCE)
  categories: string[]
  region: string
  aliases: string[]
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  importance: 1 | 2 | 3 | 4 | 5
}

// ── Hole Result ────────────────────────────────────────────────────────────────
export interface BetterAlternative {
  eventId: string
  eventName: string
  eventYear: number
  penalty: number
}

export interface HoleResult {
  holeIndex: number // 0-based
  targetYear: number
  eventId: string
  eventName: string
  eventYear: number
  penalty: number
  isOptimal: boolean // true if no better unused alternative existed
  betterAlternatives: BetterAlternative[]
}

// ── Game State ─────────────────────────────────────────────────────────────────
export interface GameState {
  challengeId: string
  challengeDate: string // "YYYY-MM-DD"
  targetYears: number[]
  currentHole: number // 0-based, 0-4 during play, 5 when complete
  usedEventIds: string[]
  holeResults: HoleResult[]
  totalScore: number
  completed: boolean
}

// ── Daily Challenge ────────────────────────────────────────────────────────────
export interface DailyChallenge {
  id: string
  date: string // "YYYY-MM-DD"
  targetYears: number[]
}

// ── Persistence ───────────────────────────────────────────────────────────────
export interface PlayerStats {
  streak: number
  longestStreak: number
  bestScore: number | null
  totalGames: number
  recentScores: number[] // last 10 scores
  lastPlayedDate: string | null
}

export interface PersistedSession {
  date: string
  state: GameState
}

// ── Score status ──────────────────────────────────────────────────────────────
export type ScoreStatus = 'good' | 'warning' | 'danger'
