"use client"

import { useState } from "react"
import Link from "next/link"
import { useVocabStore } from "@/lib/vocab-store"

export default function SettingsPage() {
  const { items, removeItem, resetToDefault } = useVocabStore()

  const [search, setSearch] = useState("")
  const [selectedUnit, setSelectedUnit] = useState<string>("All")
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [confirmReset, setConfirmReset] = useState(false)

  const toggleCollapse = (unitName: string) => {
    setCollapsed((prev) => ({ ...prev, [unitName]: !prev[unitName] }))
  }

  const allUnits = Array.from(new Set(items.map((i) => i.unit || "No Unit")))

  const filtered = items.filter((item) => {
    const inUnit = selectedUnit === "All" || (item.unit || "No Unit") === selectedUnit
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      item.word.toLowerCase().includes(q) ||
      item.definition.toLowerCase().includes(q)
    return inUnit && matchesSearch
  })

  const grouped = filtered.reduce<Record<string, typeof items>>((acc, item) => {
    const key = item.unit || "No Unit"
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  const inputCls =
    "w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors"

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Settings</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {items.length} terms · {allUnits.length} units
            </p>
          </div>
          <Link
            href="/game"
            className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Go to Game →
          </Link>
        </div>

        {/* Vocabulary list */}
        <section className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-semibold text-white/80">Vocabulary List</h2>
            {!confirmReset ? (
              <button
                onClick={() => setConfirmReset(true)}
                className="text-xs text-red-400 hover:text-red-300 underline transition-colors"
              >
                Reset to AP defaults
              </button>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-red-400 text-xs">Reset all data?</span>
                <button
                  onClick={() => { resetToDefault(); setConfirmReset(false) }}
                  className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-xs transition-colors"
                >
                  Yes, reset
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="border border-gray-700 text-gray-400 hover:text-gray-300 px-3 py-1 rounded text-xs transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Search + filter */}
          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search words or definitions..."
              className={`flex-1 min-w-[200px] ${inputCls}`}
            />
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="All">All Units ({items.length})</option>
              {allUnits.map((u) => (
                <option key={u} value={u}>
                  {u} ({items.filter((i) => (i.unit || "No Unit") === u).length})
                </option>
              ))}
            </select>
          </div>

          {filtered.length === 0 && (
            <p className="text-gray-500 text-sm">No items match your search.</p>
          )}

          {/* Grouped list */}
          {Object.entries(grouped).map(([unitName, unitItems]) => (
            <div key={unitName} className="border border-gray-800 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleCollapse(unitName)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-900 hover:bg-gray-800 text-left transition-colors"
              >
                <span className="text-sm font-medium text-gray-300">{unitName}</span>
                <span className="text-xs text-gray-500">
                  {unitItems.length} terms {collapsed[unitName] ? "▶" : "▼"}
                </span>
              </button>

              {!collapsed[unitName] && (
                <div className="divide-y divide-gray-800/50">
                  {unitItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between px-4 py-3 text-sm hover:bg-gray-900/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <span className="font-medium text-white/90">{item.word}</span>
                        <span className="text-gray-600 mx-1.5">—</span>
                        <span className="text-gray-400">{item.definition}</span>
                        {(item.timesCorrect > 0 || item.timesIncorrect > 0) && (
                          <span className="ml-2 text-xs text-gray-600">
                            ✓{item.timesCorrect} ✗{item.timesIncorrect}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="shrink-0 text-gray-600 hover:text-red-400 text-xs transition-colors"
                        aria-label="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}
