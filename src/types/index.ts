// ── Event ─────────────────────────────────────────────────────────────────────
export interface Event {
  id: string
  name: string
  year: number // BCE years are negative (e.g. -44 = 44 BCE)
  categories: string[]
  region: string
  aliases: string[]
  description: string // what happened; DatePick shows it before the guess, so it never gives the year
  significance?: string // "Why it matters" (reviewed); shown only after the guess, so it may name years
  difficulty: 'easy' | 'medium' | 'hard'
  importance: number // 1–9; higher = more prominent (DateFlow bolds 7+, DatePick weights by it)
  dateflowOnly?: boolean // date too disputed to guess: shown in DateFlow, excluded from DateGolf/DatePick
  approximate?: boolean // "c." date: shown with "c." everywhere; DatePick keeps wrong answers approxMinGap(year) away
  dateDisplay?: string // the true range for an approximate date, e.g. "c. 4000–3500 BCE"
}

// ── Hole Result ────────────────────────────────────────────────────────────────
export interface BetterAlternative {
  eventId: string
  eventName: string
  eventYear: number
  eventApproximate?: boolean // show the year with "c."
  penalty: number
}

export interface HoleResult {
  holeIndex: number // 0-based
  targetYear: number
  eventId: string
  eventName: string
  eventYear: number
  eventApproximate?: boolean // show the year with "c."
  eventDateDisplay?: string
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
