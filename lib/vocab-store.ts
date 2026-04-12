import { create } from "zustand"
import { persist } from "zustand/middleware"
import { VocabItem, GameMode, Progress } from "./types"
import { SEEDED_ITEMS, ALL_UNITS } from "./vocab-data"

interface VocabStore {
  items: VocabItem[]
  mode: GameMode
  progress: Progress
  selectedUnits: string[]
  quizLength: number
  dragMatchDirection: "wordToDefinition" | "definitionToWord"

  removeItem: (id: string) => void
  setMode: (mode: GameMode) => void
  updateProgress: (correct: boolean, itemId: string) => void
  resetProgress: () => void
  resetToDefault: () => void
  setSelectedUnits: (units: string[]) => void
  toggleUnit: (unit: string) => void
  setQuizLength: (n: number) => void
  setDragMatchDirection: (dir: "wordToDefinition" | "definitionToWord") => void
  getWeightedItems: () => VocabItem[]
  getActiveItems: () => VocabItem[]
}

const defaultProgress: Progress = {
  correctAnswers: 0,
  incorrectAnswers: 0,
  streak: 0,
}

export const useVocabStore = create<VocabStore>()(
  persist(
    (set, get) => ({
      items: SEEDED_ITEMS,
      mode: "wordToDefinition",
      progress: defaultProgress,
      selectedUnits: ALL_UNITS,
      quizLength: 10,
      dragMatchDirection: "wordToDefinition",

      removeItem: (id) => {
        set((state) => ({ items: state.items.filter((i) => i.id !== id) }))
      },

      setMode: (mode) => set({ mode }),

      setSelectedUnits: (units) => set({ selectedUnits: units }),

      toggleUnit: (unit) => {
        const { selectedUnits } = get()
        if (selectedUnits.includes(unit)) {
          // Keep at least one unit selected
          if (selectedUnits.length === 1) return
          set({ selectedUnits: selectedUnits.filter((u) => u !== unit) })
        } else {
          set({ selectedUnits: [...selectedUnits, unit] })
        }
      },

      setQuizLength: (n) => set({ quizLength: n }),

      setDragMatchDirection: (dir) => set({ dragMatchDirection: dir }),

      updateProgress: (correct, itemId) => {
        set((state) => {
          const updatedItems = state.items.map((item) => {
            if (item.id !== itemId) return item
            return correct
              ? { ...item, timesCorrect: item.timesCorrect + 1 }
              : { ...item, timesIncorrect: item.timesIncorrect + 1 }
          })
          const progress = correct
            ? {
                correctAnswers: state.progress.correctAnswers + 1,
                incorrectAnswers: state.progress.incorrectAnswers,
                streak: state.progress.streak + 1,
              }
            : {
                correctAnswers: state.progress.correctAnswers,
                incorrectAnswers: state.progress.incorrectAnswers + 1,
                streak: 0,
              }
          return { items: updatedItems, progress }
        })
      },

      resetProgress: () => set({ progress: defaultProgress }),

      resetToDefault: () =>
        set({ items: SEEDED_ITEMS, progress: defaultProgress }),

      getActiveItems: () => {
        const { items, selectedUnits } = get()
        return items.filter((item) => selectedUnits.includes(item.unit || "No Unit"))
      },

      getWeightedItems: () => {
        const { items, selectedUnits } = get()
        const active = items.filter((item) => selectedUnits.includes(item.unit || "No Unit"))
        const weighted: VocabItem[] = []
        for (const item of active) {
          const weight = Math.max(1, 1 + item.timesIncorrect - item.timesCorrect)
          for (let i = 0; i < weight; i++) {
            weighted.push(item)
          }
        }
        return weighted
      },
    }),
    { name: "vocab-store" }
  )
)
