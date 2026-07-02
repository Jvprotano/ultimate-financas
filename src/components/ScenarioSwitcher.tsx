import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Copy, Layers3, Pencil, Plus, Trash2, X } from 'lucide-react'
import type { FinanceScenario, ScenarioSummary } from '../types'
import { formatCurrency } from '../utils'

interface Props {
  scenarios: FinanceScenario[]
  activeScenarioId: string
  setActiveScenarioId: (id: string) => void
  createScenario: () => void
  duplicateScenario: (id?: string) => void
  renameScenario: (id: string, name: string) => void
  removeScenario: (id: string) => void
  summaries: ScenarioSummary[]
}

export function ScenarioSwitcher({
  scenarios,
  activeScenarioId,
  setActiveScenarioId,
  createScenario,
  duplicateScenario,
  renameScenario,
  removeScenario,
  summaries,
}: Props) {
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const activeScenario = scenarios.find((scenario) => scenario.id === activeScenarioId)

  useEffect(() => {
    if (!open) return
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setEditingId(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const finishEditing = () => {
    if (editingId && draftName.trim()) renameScenario(editingId, draftName)
    setEditingId(null)
    setDraftName('')
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-lg border border-dark-border bg-dark-surface px-3 py-2 text-sm font-medium text-dark-text transition-colors hover:border-dark-text-muted/40"
      >
        <Layers3 size={14} className="text-dark-text-muted" />
        <span className="max-w-36 truncate">{activeScenario?.name ?? 'Cenário'}</span>
        <ChevronDown size={14} className={`text-dark-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-dark-border bg-dark-card shadow-xl shadow-black/40">
          <div className="max-h-72 overflow-y-auto p-1.5">
            {scenarios.map((scenario) => {
              const summary = summaries.find((item) => item.id === scenario.id)
              const isActive = scenario.id === activeScenarioId

              if (editingId === scenario.id) {
                return (
                  <div key={scenario.id} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5">
                    <input
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') finishEditing()
                        if (event.key === 'Escape') setEditingId(null)
                      }}
                      className="min-w-0 flex-1 rounded-md border border-dark-border bg-dark-input px-2 py-1.5 text-sm text-dark-text outline-none focus:border-primary-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={finishEditing}
                      className="rounded-md p-1.5 text-primary-400 hover:bg-primary-500/10"
                      aria-label="Salvar nome"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-md p-1.5 text-dark-text-muted hover:bg-dark-hover"
                      aria-label="Cancelar"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )
              }

              return (
                <div
                  key={scenario.id}
                  className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${
                    isActive ? 'bg-primary-500/10' : 'hover:bg-dark-hover'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveScenarioId(scenario.id)
                      setOpen(false)
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className={`block truncate text-sm font-medium ${isActive ? 'text-primary-300' : 'text-dark-text'}`}>
                      {scenario.name}
                    </span>
                    {summary && (
                      <span className="block text-[11px] tabular-nums text-dark-text-muted">
                        base {formatCurrency(summary.availableForBudget)} · livre{' '}
                        <span className={summary.balanceAfterPlan >= 0 ? 'text-primary-400' : 'text-rose-400'}>
                          {formatCurrency(summary.balanceAfterPlan)}
                        </span>
                      </span>
                    )}
                  </button>
                  <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(scenario.id)
                        setDraftName(scenario.name)
                      }}
                      className="rounded-md p-1.5 text-dark-text-muted hover:text-dark-text"
                      aria-label={`Renomear ${scenario.name}`}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeScenario(scenario.id)}
                      disabled={scenarios.length <= 1}
                      className="rounded-md p-1.5 text-dark-text-muted hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label={`Excluir ${scenario.name}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex gap-1.5 border-t border-dark-border-subtle p-1.5">
            <button
              type="button"
              onClick={() => {
                createScenario()
                setOpen(false)
              }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-dark-text-secondary transition-colors hover:bg-dark-hover hover:text-dark-text"
            >
              <Plus size={13} />
              Novo cenário
            </button>
            <button
              type="button"
              onClick={() => {
                duplicateScenario(activeScenarioId)
                setOpen(false)
              }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-dark-text-secondary transition-colors hover:bg-dark-hover hover:text-dark-text"
            >
              <Copy size={13} />
              Duplicar atual
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
