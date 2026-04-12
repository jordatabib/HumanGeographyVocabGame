"use client"

import { useState, useEffect, useCallback } from "react"
import { useVocabStore } from "@/lib/vocab-store"
import { VocabItem, GameMode } from "@/lib/types"
import { LiquidButton } from "@/components/ui/liquid-glass-button"
import { cn } from "@/lib/utils"

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function getUniqueChoices(
  correct: VocabItem,
  allItems: VocabItem[],
  field: "definition" | "word",
  count = 4
): string[] {
  const others = allItems
    .filter((i) => i.id !== correct.id)
    .map((i) => i[field])
  const shuffled = shuffle(others).slice(0, count - 1)
  return shuffle([correct[field], ...shuffled])
}

interface QuizProps {
  mode: GameMode
}

export default function QuizModes({ mode }: QuizProps) {
  const { updateProgress, getWeightedItems, getActiveItems } = useVocabStore()
  const [currentItem, setCurrentItem] = useState<VocabItem | null>(null)
  const [choices, setChoices] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)

  const pickQuestion = useCallback(() => {
    const activeItems = getActiveItems()
    if (activeItems.length === 0) return
    const weighted = getWeightedItems()
    const item = weighted[Math.floor(Math.random() * weighted.length)]
    setCurrentItem(item)
    setSelected(null)
    setIsCorrect(null)

    const field = mode === "wordToDefinition" ? "definition" : "word"
    if (activeItems.length >= 2) {
      setChoices(getUniqueChoices(item, activeItems, field))
    } else {
      setChoices([item[field]])
    }
  }, [mode, getWeightedItems, getActiveItems])

  useEffect(() => {
    pickQuestion()
  }, [pickQuestion])

  const handleSelect = (choice: string) => {
    if (selected !== null || !currentItem) return
    const correctAnswer =
      mode === "wordToDefinition" ? currentItem.definition : currentItem.word
    const correct = choice === correctAnswer
    setSelected(choice)
    setIsCorrect(correct)
    updateProgress(correct, currentItem.id)
  }

  const activeItems = getActiveItems()
  if (activeItems.length === 0) {
    return (
      <div className="text-center space-y-2">
        <p className="text-white/50">No vocabulary items in selected units.</p>
        <p className="text-white/30 text-sm">Select more units on the home screen.</p>
      </div>
    )
  }

  if (!currentItem) return null

  const prompt =
    mode === "wordToDefinition" ? currentItem.word : currentItem.definition
  const promptLabel = mode === "wordToDefinition" ? "Word" : "Definition"
  const choiceLabel = mode === "wordToDefinition" ? "definition" : "word"
  const correctAnswer =
    mode === "wordToDefinition" ? currentItem.definition : currentItem.word

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Question card */}
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 text-center shadow-2xl">
        <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-4 font-medium">
          {promptLabel}
        </p>
        <p className="text-white text-2xl font-bold leading-snug">{prompt}</p>
        {currentItem.unit && (
          <p className="text-white/25 text-xs mt-4 tracking-wide">{currentItem.unit}</p>
        )}
      </div>

      {/* Answer choices */}
      <div className="space-y-3">
        <p className="text-white/35 text-xs text-center uppercase tracking-[0.15em]">
          Select the correct {choiceLabel}
        </p>
        <div className="grid grid-cols-1 gap-3">
          {choices.map((choice) => {
            const isThisCorrect = choice === correctAnswer
            const isThisSelected = choice === selected
            return (
              <LiquidButton
                key={choice}
                size="xl"
                onClick={() => handleSelect(choice)}
                disabled={selected !== null}
                className={cn(
                  "w-full justify-start px-6 text-left leading-snug",
                  selected !== null && isThisCorrect && "ring-2 ring-green-400",
                  selected !== null && isThisSelected && !isThisCorrect && "ring-2 ring-red-400"
                )}
              >
                <span className="line-clamp-3 text-sm">{choice}</span>
              </LiquidButton>
            )
          })}
        </div>
      </div>

      {/* Feedback */}
      {selected !== null && (
        <div className="flex flex-col items-center gap-4 pt-2">
          {isCorrect ? (
            <p className="text-green-400 font-semibold text-sm tracking-wide">✓ Correct!</p>
          ) : (
            <div className="text-center space-y-1">
              <p className="text-red-400 font-semibold text-sm">✗ Incorrect</p>
              <p className="text-white/40 text-xs">
                Correct: <span className="text-white/60">{correctAnswer}</span>
              </p>
            </div>
          )}
          <LiquidButton onClick={pickQuestion} size="lg">
            Next Question →
          </LiquidButton>
        </div>
      )}
    </div>
  )
}
