export interface DatePickQuestion {
  eventId: string
  eventName: string
  eventYear: number
  description: string
  categories: string[]
  region: string
  choices: number[] // 4 years, deterministically shuffled
  correctIndex: number // index of correct year in choices[]
}

export interface DatePickChallenge {
  id: string // "datepick-YYYY-MM-DD"
  date: string
  questions: DatePickQuestion[]
}

export interface DatePickAnswer {
  questionIndex: number
  selectedIndex: number | null // null = unanswered
  isCorrect: boolean
}

export interface DatePickGameState {
  challengeDate: string
  questions: DatePickQuestion[]
  currentQuestion: number
  answers: DatePickAnswer[]
  completed: boolean
}

export interface DatePickStats {
  streak: number
  bestScore: number | null // out of 8
  totalGames: number
  lastPlayedDate: string | null
}
