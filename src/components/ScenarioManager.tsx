import { useState } from 'react'
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

function metricTone(value: number) {
  if (value > 0) return 'text-emerald-400'
  if (value < 0) return 'text-rose-400'
  return 'text-dark-text-muted'
}

export function ScenarioManager({
  scenarios,
  activeScenarioId,
  setActiveScenarioId,
  createScenario,
  duplicateScenario,
  renameScenario,
  removeScenario,
  summaries,
}: Props) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem('uf_collapsed_scenarios')
      return stored !== null ? stored === 'true' : false
    } catch {
      return false
    }
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const activeScenario = scenarios.find((scenario) => scenario.id === activeScenarioId)
  const activeSummary = summaries.find((summary) => summary.id === activeScenarioId)

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    try {
      localStorage.setItem('uf_collapsed_scenarios', String(next))
    } catch {
      // Storage can fail in private mode or quota pressure.
    }
  }

  const startEditing = (scenario: FinanceScenario) => {
    setEditingId(scenario.id)
    setDraftName(scenario.name)
  }

  const finishEditing = () => {
    if (editingId) renameScenario(editingId, draftName)
    setEditingId(null)
    setDraftName('')
  }

  const cancelEditing = () => {
    setEditingId(null)
    setDraftName('')
  }

  return (
    <section className="overflow-hidden rounded-lg border border-dark-border bg-dark-card">
      <div
        className={`flex cursor-pointer select-none items-center gap-3 px-5 py-4 transition-colors hover:bg-dark-hover/50 ${
          collapsed ? '' : 'border-b border-dark-border-subtle'
        }`}
        onClick={toggleCollapsed}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white">
          <Layers3 size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h2 className="text-lg font-semibold text-dark-text">Cenarios</h2>
            {activeScenario && (
              <span className="truncate text-sm font-medium text-primary-400">{activeScenario.name}</span>
            )}
          </div>
          {activeSummary && (
            <p className="truncate text-xs text-dark-text-muted">
              Base {formatCurrency(activeSummary.availableForBudget)} | aporte direto{' '}
              {formatCurrency(activeSummary.directInvestmentTarget)} | livre{' '}
              <span className={metricTone(activeSummary.balanceAfterCosts)}>
                {formatCurrency(activeSummary.balanceAfterCosts)}
              </span>
            </p>
          )}
        </div>

        <div className="hidden items-center gap-3 text-right sm:flex">
          {activeSummary && (
            <div className="leading-tight">
              <span className="block text-[10px] uppercase tracking-wide text-dark-text-muted">Selecionado</span>
              <span className={`text-sm font-bold ${metricTone(activeSummary.balanceAfterCosts)}`}>
                {formatCurrency(activeSummary.balanceAfterCosts)}
              </span>
            </div>
          )}
          <span className="text-xs text-dark-text-muted">{scenarios.length} cenarios</span>
        </div>

        <ChevronDown
          size={18}
          className={`shrink-0 text-dark-text-muted transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`}
        />
      </div>

      {!collapsed && (
        <div>
          <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-dark-text-muted">
                    Alterne entre sua realidade atual e uma simulacao futura sem sobrescrever dados.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {scenarios.map((scenario) => {
                  const isActive = scenario.id === activeScenarioId
                  const summary = summaries.find((item) => item.id === scenario.id)

                  return (
                    <button
                      key={scenario.id}
                      type="button"
                      onClick={() => setActiveScenarioId(scenario.id)}
                      className={`min-w-52 rounded-lg border px-3 py-2 text-left transition-colors ${
                        isActive
                          ? 'border-primary-500 bg-primary-500/10'
                          : 'border-dark-border bg-dark-surface hover:border-dark-border-subtle hover:bg-dark-hover'
                      }`}
                    >
                      <span className={`block truncate text-sm font-semibold ${isActive ? 'text-primary-400' : 'text-dark-text'}`}>
                        {scenario.name}
                      </span>
                      <span className="mt-1 flex items-center justify-between gap-3 text-xs text-dark-text-muted">
                        <span>{summary ? formatCurrency(summary.availableForBudget) : formatCurrency(0)}</span>
                        <span className={metricTone(summary?.balanceAfterCosts ?? 0)}>
                          {summary ? formatCurrency(summary.balanceAfterCosts) : formatCurrency(0)}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              <button
                type="button"
                onClick={() => duplicateScenario(activeScenarioId)}
                className="inline-flex items-center gap-2 rounded-lg border border-dark-border bg-dark-surface px-3 py-2 text-sm font-medium text-dark-text-secondary transition-colors hover:border-primary-500/50 hover:text-primary-400"
                title="Duplicar cenario ativo"
              >
                <Copy size={15} />
                Duplicar
              </button>
              <button
                type="button"
                onClick={createScenario}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-500"
                title="Criar cenario vazio"
              >
                <Plus size={15} />
                Novo
              </button>
            </div>
          </div>

          <div className="border-t border-dark-border-subtle p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {scenarios.map((scenario) => {
                const summary = summaries.find((item) => item.id === scenario.id)
                const isActive = scenario.id === activeScenarioId
                const canRemove = scenarios.length > 1

                return (
                  <article
                    key={scenario.id}
                    className={`rounded-lg border p-3 ${
                      isActive ? 'border-primary-500/60 bg-primary-500/10' : 'border-dark-border bg-dark-surface'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {editingId === scenario.id ? (
                        <div className="flex min-w-0 flex-1 gap-2">
                          <input
                            value={draftName}
                            onChange={(event) => setDraftName(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') finishEditing()
                              if (event.key === 'Escape') cancelEditing()
                            }}
                            className="min-w-0 flex-1 rounded-lg border border-dark-border bg-dark-input px-2 py-1 text-sm text-dark-text outline-none focus:border-primary-500"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={finishEditing}
                            className="rounded-lg p-1.5 text-emerald-400 transition-colors hover:bg-emerald-500/10"
                            aria-label="Salvar nome"
                          >
                            <Check size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="rounded-lg p-1.5 text-dark-text-muted transition-colors hover:bg-dark-hover hover:text-dark-text"
                            aria-label="Cancelar edicao"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setActiveScenarioId(scenario.id)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <h3 className="truncate text-sm font-semibold text-dark-text">{scenario.name}</h3>
                            <p className="text-xs text-dark-text-muted">
                              {summary ? `${summary.savingsRate.toFixed(0)}% alocado em investimentos` : 'Sem valores'}
                            </p>
                          </button>
                          <div className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              onClick={() => startEditing(scenario)}
                              className="rounded-lg p-1.5 text-dark-text-muted transition-colors hover:bg-dark-hover hover:text-primary-400"
                              aria-label={`Renomear ${scenario.name}`}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeScenario(scenario.id)}
                              disabled={!canRemove}
                              className="rounded-lg p-1.5 text-dark-text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label={`Remover ${scenario.name}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {summary && (
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <dt className="text-dark-text-muted">Custos</dt>
                          <dd className="font-semibold text-rose-400">{formatCurrency(summary.totalCosts)}</dd>
                        </div>
                        <div>
                          <dt className="text-dark-text-muted">Desejos</dt>
                          <dd className="font-semibold text-violet-400">{formatCurrency(summary.totalWantsAmount)}</dd>
                        </div>
                        <div>
                          <dt className="text-dark-text-muted">Aporte direto</dt>
                          <dd className="font-semibold text-emerald-400">{formatCurrency(summary.directInvestmentTarget)}</dd>
                        </div>
                        <div>
                          <dt className="text-dark-text-muted">Livre</dt>
                          <dd className={`font-semibold ${metricTone(summary.balanceAfterCosts)}`}>
                            {formatCurrency(summary.balanceAfterCosts)}
                          </dd>
                        </div>
                      </dl>
                    )}
                  </article>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
