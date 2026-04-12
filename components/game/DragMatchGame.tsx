"use client"

import { useState, useEffect, useCallback } from "react"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core"
import { useVocabStore } from "@/lib/vocab-store"
import { VocabItem } from "@/lib/types"
import { LiquidButton } from "@/components/ui/liquid-glass-button"

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const ROUND_SIZE = 6

// Draggable pill component
function DraggablePill({ id, label, matched }: { id: string; label: string; matched: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id })
  if (matched) {
    return (
      <div className="border border-green-400/30 rounded-full px-4 py-2 bg-green-500/10 text-green-300/50 text-sm line-clamp-1">
        {label}
      </div>
    )
  }
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`border border-white/20 rounded-full px-4 py-2.5 bg-white/10 text-white text-sm cursor-grab select-none backdrop-blur-sm transition-all ${
        isDragging ? "opacity-20" : "hover:bg-white/20 hover:border-white/40 active:cursor-grabbing"
      }`}
    >
      {label}
    </div>
  )
}

// Drop zone component
function DropZone({ id, label, matchedLabel }: { id: string; label: string; matchedLabel: string | null }) {
  const { isOver, setNodeRef } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl px-4 py-3 text-sm min-h-[52px] transition-all border backdrop-blur-sm ${
        matchedLabel
          ? "bg-green-500/15 border-green-400/40 text-white/80"
          : isOver
          ? "bg-blue-500/20 border-blue-400/60 text-white/70"
          : "bg-white/5 border-dashed border-white/20 text-white/50"
      }`}
    >
      <span>{label}</span>
      {matchedLabel && (
        <span className="ml-2 text-green-300 font-semibold text-xs">← {matchedLabel}</span>
      )}
    </div>
  )
}

export default function DragMatchGame() {
  const { getActiveItems, updateProgress, dragMatchDirection } = useVocabStore()
  const activeItems = getActiveItems()

  const [roundItems, setRoundItems] = useState<VocabItem[]>([])
  const [draggableOrder, setDraggableOrder] = useState<VocabItem[]>([])
  const [matches, setMatches] = useState<Record<string, string>>({})
  const [activeId, setActiveId] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null)

  const sensors = useSensors(useSensor(PointerSensor))

  // In wordToDefinition: drag words (id = item.id), drop onto definitions (id = item.id)
  // In definitionToWord: drag definitions (id = item.id + "-def"), drop onto words (id = item.id + "-word")
  const isDefToWord = dragMatchDirection === "definitionToWord"

  const startRound = useCallback(() => {
    const selected = shuffle(activeItems).slice(0, ROUND_SIZE)
    setRoundItems(selected)
    setDraggableOrder(shuffle([...selected]))
    setMatches({})
    setSubmitted(false)
    setScore(null)
  }, [activeItems])

  useEffect(() => {
    if (activeItems.length > 0) startRound()
  }, [startRound])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const dragId = active.id as string
    const dropId = over.id as string

    // Remove any existing assignment of this draggable to any drop zone
    const cleaned: Record<string, string> = {}
    for (const [dId, wId] of Object.entries(matches)) {
      if (wId !== dragId) cleaned[dId] = wId
    }
    cleaned[dropId] = dragId
    setMatches(cleaned)
  }

  const handleSubmit = () => {
    let correct = 0
    for (const [dropId, dragId] of Object.entries(matches)) {
      let isCorrect: boolean
      let itemId: string

      if (isDefToWord) {
        // dropId = itemId + "-word", dragId = itemId + "-def"
        const dropItemId = dropId.replace("-word", "")
        const dragItemId = dragId.replace("-def", "")
        isCorrect = dropItemId === dragItemId
        itemId = dropItemId
      } else {
        // dropId = itemId, dragId = itemId
        isCorrect = dropId === dragId
        itemId = dropId
      }

      if (isCorrect) correct++
      updateProgress(isCorrect, itemId)
    }
    setScore({ correct, total: roundItems.length })
    setSubmitted(true)
  }

  if (activeItems.length === 0) {
    return (
      <div className="text-center space-y-2">
        <p className="text-white/50">No vocabulary items in selected units.</p>
        <p className="text-white/30 text-sm">Select more units on the home screen.</p>
      </div>
    )
  }

  const matchedDragIds = new Set(Object.values(matches))
  const activeDragItem = activeId ? roundItems.find((i) =>
    isDefToWord ? i.id + "-def" === activeId : i.id === activeId
  ) : null

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <p className="text-white/40 text-xs text-center uppercase tracking-[0.15em]">
          {isDefToWord
            ? "Drag each definition onto its matching word"
            : "Drag each word onto its matching definition"}
        </p>

        <div className="grid grid-cols-2 gap-6">
          {/* Left column: draggables */}
          <div className="space-y-2">
            <p className="text-white/30 text-xs font-semibold uppercase tracking-widest mb-3">
              {isDefToWord ? "Definitions" : "Words"}
            </p>
            {draggableOrder.map((item) => {
              const dragId = isDefToWord ? item.id + "-def" : item.id
              const label = isDefToWord ? item.definition : item.word
              return (
                <DraggablePill
                  key={dragId}
                  id={dragId}
                  label={label}
                  matched={matchedDragIds.has(dragId)}
                />
              )
            })}
          </div>

          {/* Right column: drop zones */}
          <div className="space-y-2">
            <p className="text-white/30 text-xs font-semibold uppercase tracking-widest mb-3">
              {isDefToWord ? "Words" : "Definitions"}
            </p>
            {roundItems.map((item) => {
              const dropId = isDefToWord ? item.id + "-word" : item.id
              const dropLabel = isDefToWord ? item.word : item.definition
              const matchedDragId = matches[dropId] ?? null
              let matchedLabel: string | null = null
              if (matchedDragId) {
                const matchedItemId = isDefToWord
                  ? matchedDragId.replace("-def", "")
                  : matchedDragId
                const matchedItem = roundItems.find((i) => i.id === matchedItemId)
                matchedLabel = matchedItem
                  ? (isDefToWord ? matchedItem.definition : matchedItem.word)
                  : null
              }
              return (
                <DropZone
                  key={dropId}
                  id={dropId}
                  label={dropLabel}
                  matchedLabel={matchedLabel}
                />
              )
            })}
          </div>
        </div>

        {!submitted && (
          <div className="flex justify-center pt-2">
            <LiquidButton
              onClick={handleSubmit}
              disabled={Object.keys(matches).length === 0}
              size="xl"
            >
              Submit Matches
            </LiquidButton>
          </div>
        )}

        {submitted && score && (
          <div className="space-y-4">
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 text-center">
              <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Round Score</p>
              <p className="text-white text-4xl font-black">{score.correct}/{score.total}</p>
              <p className="text-white/40 text-sm mt-1">
                {Math.round((score.correct / score.total) * 100)}% accuracy
              </p>
            </div>

            {/* Result breakdown */}
            <div className="space-y-1.5">
              {roundItems.map((item) => {
                const dropId = isDefToWord ? item.id + "-word" : item.id
                const matchedDragId = matches[dropId]
                const matchedItemId = matchedDragId
                  ? (isDefToWord ? matchedDragId.replace("-def", "") : matchedDragId)
                  : null
                const correct = matchedItemId === item.id
                const matchedItem = matchedItemId ? roundItems.find((i) => i.id === matchedItemId) : null
                const chosenLabel = matchedItem
                  ? (isDefToWord ? matchedItem.definition : matchedItem.word)
                  : "—"
                return (
                  <div
                    key={item.id}
                    className={`flex gap-2 text-xs px-3 py-1.5 rounded-lg ${
                      correct ? "text-green-300 bg-green-500/10" : "text-red-300 bg-red-500/10"
                    }`}
                  >
                    <span>{correct ? "✓" : "✗"}</span>
                    <span>
                      <strong>{item.word}</strong>
                      {!correct && (
                        <span className="text-white/40 ml-1">← you chose: {chosenLabel}</span>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-center pt-2">
              <LiquidButton onClick={startRound} size="xl">
                New Round →
              </LiquidButton>
            </div>
          </div>
        )}
      </div>

      <DragOverlay>
        {activeDragItem && (
          <div className="border border-white/40 rounded-full px-4 py-2.5 bg-white/20 backdrop-blur-xl shadow-2xl text-white text-sm cursor-grabbing">
            {isDefToWord ? activeDragItem.definition : activeDragItem.word}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
