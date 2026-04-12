export interface VocabItem {
  id: string
  unit: string
  word: string
  definition: string
  timesCorrect: number
  timesIncorrect: number
}

export type GameMode = "wordToDefinition" | "definitionToWord" | "dragMatch"

export interface Progress {
  correctAnswers: number
  incorrectAnswers: number
  streak: number
}
