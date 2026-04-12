"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { useVocabStore } from "@/lib/vocab-store"
import { LiquidButton } from "@/components/ui/liquid-glass-button"
import { GameMode } from "@/lib/types"
import { ALL_UNITS } from "@/lib/vocab-data"
import QuizModes from "@/components/game/QuizModes"
import DragMatchGame from "@/components/game/DragMatchGame"

// Dynamic imports to avoid SSR issues with WebGL / Three.js
const ShaderAnimation = dynamic(
  () => import("@/components/ui/shader-animation").then((m) => ({ default: m.ShaderAnimation })),
  { ssr: false }
)
const ShaderBackground = dynamic(
  () => import("@/components/ui/shader-background"),
  { ssr: false }
)

type Screen = "landing" | "playing" | "results"

const MODES: { value: GameMode; label: string }[] = [
  { value: "wordToDefinition", label: "Word → Definition" },
  { value: "definitionToWord", label: "Definition → Word" },
  { value: "dragMatch", label: "Drag Match" },
]

const QUIZ_LENGTHS = [5, 10, 20, 30, 50, 0] // 0 = unlimited

function gradeFromPct(pct: number) {
  if (pct >= 93) return { letter: "A", color: "text-emerald-400" }
  if (pct >= 90) return { letter: "A−", color: "text-emerald-400" }
  if (pct >= 87) return { letter: "B+", color: "text-green-400" }
  if (pct >= 83) return { letter: "B", color: "text-green-400" }
  if (pct >= 80) return { letter: "B−", color: "text-green-400" }
  if (pct >= 77) return { letter: "C+", color: "text-yellow-400" }
  if (pct >= 73) return { letter: "C", color: "text-yellow-400" }
  if (pct >= 70) return { letter: "C−", color: "text-yellow-400" }
  if (pct >= 60) return { letter: "D", color: "text-orange-400" }
  return { letter: "F", color: "text-red-400" }
}

export default function GamePage() {
  const {
    mode, progress, items, resetProgress, setMode,
    selectedUnits, toggleUnit, setSelectedUnits,
    quizLength, setQuizLength,
    dragMatchDirection, setDragMatchDirection,
    getActiveItems,
  } = useVocabStore()

  const [screen, setScreen] = useState<Screen>("landing")
  const [sessionStart, setSessionStart] = useState<{ correct: number; incorrect: number }>({ correct: 0, incorrect: 0 })

  const sessionCorrect = progress.correctAnswers - sessionStart.correct
  const sessionIncorrect = progress.incorrectAnswers - sessionStart.incorrect
  const sessionTotal = sessionCorrect + sessionIncorrect
  const sessionPct = sessionTotal > 0 ? Math.round((sessionCorrect / sessionTotal) * 100) : 0
  const grade = gradeFromPct(sessionPct)

  const activeItems = getActiveItems()

  // Auto-end session when quiz length is reached (quiz modes only)
  useEffect(() => {
    if (screen === "playing" && mode !== "dragMatch" && quizLength > 0 && sessionTotal >= quizLength) {
      setScreen("results")
    }
  }, [sessionTotal, quizLength, screen, mode])

  // Weakest units based on stored timesIncorrect/timesCorrect ratio
  const unitStats = items.reduce<Record<string, { correct: number; incorrect: number }>>((acc, item) => {
    const key = item.unit || "No Unit"
    if (!acc[key]) acc[key] = { correct: 0, incorrect: 0 }
    acc[key].correct += item.timesCorrect
    acc[key].incorrect += item.timesIncorrect
    return acc
  }, {})

  const weakestUnits = Object.entries(unitStats)
    .filter(([, s]) => s.correct + s.incorrect > 0)
    .sort(([, a], [, b]) => {
      const rA = a.incorrect / (a.correct + a.incorrect)
      const rB = b.incorrect / (b.correct + b.incorrect)
      return rB - rA
    })
    .slice(0, 3)

  const startQuiz = () => {
    setSessionStart({ correct: progress.correctAnswers, incorrect: progress.incorrectAnswers })
    setScreen("playing")
  }

  const endSession = () => {
    setScreen("results")
  }

  const playAgain = () => {
    setSessionStart({ correct: progress.correctAnswers, incorrect: progress.incorrectAnswers })
    setScreen("playing")
  }

  const goHome = () => {
    setScreen("landing")
  }

  // ── LANDING ────────────────────────────────────────────────────────────
  if (screen === "landing") {
    return (
      <div className="relative min-h-screen overflow-hidden bg-black">
        <ShaderAnimation />

        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-16 text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white/40 tracking-widest uppercase backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {activeItems.length} Terms · {selectedUnits.length} Units
          </div>

          {/* Title */}
          <h1 className="text-white font-black tracking-tight leading-none mb-2">
            <span className="block text-5xl sm:text-7xl">Vocab</span>
            <span className="block text-5xl sm:text-7xl bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              Master
            </span>
          </h1>
          <p className="text-white/30 text-sm mt-3 mb-8 tracking-wide">
            AP Human Geography · Full Word List
          </p>

          {/* Mode selector */}
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                className={`rounded-full px-4 py-1.5 text-xs border transition-all ${
                  mode === m.value
                    ? "border-white/50 bg-white/15 text-white backdrop-blur-sm"
                    : "border-white/10 text-white/30 hover:border-white/30 hover:text-white/60"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Drag match direction toggle */}
          {mode === "dragMatch" && (
            <div className="flex gap-2 justify-center mb-6">
              {(["wordToDefinition", "definitionToWord"] as const).map((dir) => (
                <button
                  key={dir}
                  onClick={() => setDragMatchDirection(dir)}
                  className={`rounded-full px-4 py-1.5 text-xs border transition-all ${
                    dragMatchDirection === dir
                      ? "border-violet-400/60 bg-violet-500/20 text-violet-300"
                      : "border-white/10 text-white/30 hover:border-white/30 hover:text-white/60"
                  }`}
                >
                  {dir === "wordToDefinition" ? "Word → Definition" : "Definition → Word"}
                </button>
              ))}
            </div>
          )}

          {/* Quiz length picker (not for drag match) */}
          {mode !== "dragMatch" && (
            <div className="flex items-center gap-2 justify-center mb-6">
              <span className="text-white/25 text-xs uppercase tracking-widest">Quiz length:</span>
              <div className="flex gap-1.5">
                {QUIZ_LENGTHS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setQuizLength(n)}
                    className={`rounded-full px-3 py-1 text-xs border transition-all ${
                      quizLength === n
                        ? "border-white/50 bg-white/15 text-white"
                        : "border-white/10 text-white/30 hover:border-white/30 hover:text-white/60"
                    }`}
                  >
                    {n === 0 ? "∞" : n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Unit selector */}
          <div className="mb-10 w-full max-w-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/25 text-xs uppercase tracking-widest">Units</span>
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedUnits(ALL_UNITS)}
                  className="text-white/30 text-xs hover:text-white/60 transition-colors"
                >
                  All
                </button>
                <button
                  onClick={() => {
                    // Keep only the first if trying to deselect all
                    if (selectedUnits.length > 1) setSelectedUnits([ALL_UNITS[0]])
                  }}
                  className="text-white/30 text-xs hover:text-white/60 transition-colors"
                >
                  None
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {ALL_UNITS.map((unit) => {
                const isSelected = selectedUnits.includes(unit)
                const shortName = unit.replace(/Unit \d+: /, "")
                return (
                  <button
                    key={unit}
                    onClick={() => toggleUnit(unit)}
                    className={`rounded-full px-3 py-1.5 text-xs border transition-all ${
                      isSelected
                        ? "border-violet-400/50 bg-violet-500/20 text-violet-200"
                        : "border-white/10 text-white/25 hover:border-white/25 hover:text-white/50"
                    }`}
                  >
                    {shortName}
                  </button>
                )
              })}
            </div>
          </div>

          {/* CTA */}
          {activeItems.length > 0 ? (
            <LiquidButton size="xxl" onClick={startQuiz}>
              Start Quiz →
            </LiquidButton>
          ) : (
            <div className="text-white/40 text-sm">
              Select at least one unit to begin
            </div>
          )}

          {/* Stats if returning */}
          {(progress.correctAnswers + progress.incorrectAnswers) > 0 && (
            <div className="mt-10 flex gap-6 text-center">
              <div>
                <p className="text-white text-2xl font-bold">{progress.correctAnswers}</p>
                <p className="text-white/30 text-xs">Correct</p>
              </div>
              <div className="w-px bg-white/10" />
              <div>
                <p className="text-white text-2xl font-bold">{progress.incorrectAnswers}</p>
                <p className="text-white/30 text-xs">Incorrect</p>
              </div>
              <div className="w-px bg-white/10" />
              <div>
                <p className="text-white text-2xl font-bold">{progress.streak}</p>
                <p className="text-white/30 text-xs">Streak</p>
              </div>
            </div>
          )}

        </div>
      </div>
    )
  }

  // ── RESULTS ────────────────────────────────────────────────────────────
  if (screen === "results") {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <ShaderBackground />

        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-16 text-center">
          <p className="text-white/30 text-xs uppercase tracking-[0.25em] mb-6">Session Complete</p>

          {/* Grade */}
          <div className={`text-8xl font-black mb-2 ${grade.color}`}>{grade.letter}</div>
          <p className="text-white/60 text-2xl font-semibold mb-1">
            {sessionCorrect} / {sessionTotal}
          </p>
          <p className="text-white/30 text-sm mb-8">{sessionPct}% accuracy this session</p>

          {/* Stats row */}
          <div className="flex gap-8 mb-8">
            <div className="text-center">
              <p className="text-green-400 text-2xl font-bold">{sessionCorrect}</p>
              <p className="text-white/30 text-xs">Correct</p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-center">
              <p className="text-red-400 text-2xl font-bold">{sessionIncorrect}</p>
              <p className="text-white/30 text-xs">Incorrect</p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-center">
              <p className="text-blue-400 text-2xl font-bold">{progress.streak}</p>
              <p className="text-white/30 text-xs">Peak Streak</p>
            </div>
          </div>

          {/* Weakest units */}
          {weakestUnits.length > 0 && (
            <div className="mb-10 w-full max-w-sm">
              <p className="text-white/25 text-xs uppercase tracking-widest mb-3">Focus Areas</p>
              <div className="space-y-2">
                {weakestUnits.map(([unit, s]) => {
                  const total = s.correct + s.incorrect
                  const pct = total > 0 ? Math.round((s.incorrect / total) * 100) : 0
                  return (
                    <div
                      key={unit}
                      className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 backdrop-blur-sm"
                    >
                      <span className="text-white/50 text-xs truncate flex-1 text-left">{unit}</span>
                      <span className="text-red-400 text-xs font-semibold ml-3">{pct}% wrong</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <LiquidButton size="xxl" onClick={playAgain}>
              Play Again →
            </LiquidButton>
            <LiquidButton size="xl" onClick={goHome}>
              Home
            </LiquidButton>
          </div>

        </div>
      </div>
    )
  }

  // ── PLAYING ────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <ShaderAnimation />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 py-3 bg-black/50 backdrop-blur-md border-b border-white/10">
          <div className="flex items-center gap-5 text-sm">
            <span className="text-green-400 font-semibold tabular-nums">
              ✓ {sessionCorrect}
            </span>
            <span className="text-red-400 font-semibold tabular-nums">
              ✗ {sessionIncorrect}
            </span>
            <span className="text-blue-400 font-semibold tabular-nums">
              🔥 {progress.streak}
            </span>
            {quizLength > 0 && mode !== "dragMatch" && (
              <span className="text-white/30 text-xs tabular-nums">
                {sessionTotal}/{quizLength}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-white/25 text-xs hidden sm:block">
              {MODES.find((m) => m.value === mode)?.label}
            </span>
            <button
              onClick={endSession}
              className="text-white/30 hover:text-white/70 text-xs transition-colors px-3 py-1 rounded-full border border-white/10 hover:border-white/30"
            >
              End Session
            </button>
          </div>
        </div>

        {/* Quiz content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 overflow-auto">
          {mode === "dragMatch" ? <DragMatchGame /> : <QuizModes mode={mode} />}
        </div>
      </div>
    </div>
  )
}
