import { SlidersHorizontal } from 'lucide-react'
import { Card } from './Card'
import type { BudgetArea } from '../types'
import { BUDGET_AREA_COLORS, BUDGET_AREA_LABELS, BUDGET_MODELS } from '../types/constants'
import { formatCurrency } from '../utils'

interface Props {
  selectedModelId: string
  setSelectedModelId: (id: string) => void
  customModel: { n: number; d: number; i: number }
  setCustomModel: (m: { n: number; d: number; i: number }) => void
  availableForBudget: number
  budgetAllocation: Record<BudgetArea, number>
}

const AREAS: { area: BudgetArea; field: 'n' | 'd' | 'i' }[] = [
  { area: 'necessidades', field: 'n' },
  { area: 'desejos', field: 'd' },
  { area: 'investimentos', field: 'i' },
]

export function BudgetModelPicker({
  selectedModelId,
  setSelectedModelId,
  customModel,
  setCustomModel,
  availableForBudget,
  budgetAllocation,
}: Props) {
  const isCustom = selectedModelId === 'custom'
  const customTotal = customModel.n + customModel.d + customModel.i

  const handleCustomChange = (field: 'n' | 'd' | 'i', value: number) => {
    setCustomModel({ ...customModel, [field]: Math.max(0, Math.min(100, value)) })
  }

  return (
    <Card
      title="Modelo de orçamento"
      icon={<SlidersHorizontal size={17} />}
      collapsible
      storageKey="budget-model"
      headerExtra={
        <span className="text-sm font-semibold text-primary-400">
          {BUDGET_MODELS.find((m) => m.id === selectedModelId)?.name}
        </span>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {BUDGET_MODELS.map((model) => {
            const isSelected = selectedModelId === model.id
            return (
              <button
                key={model.id}
                onClick={() => setSelectedModelId(model.id)}
                className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  isSelected
                    ? 'border-primary-500/60 bg-primary-500/10'
                    : 'border-dark-border bg-dark-surface hover:border-dark-text-muted/40'
                }`}
              >
                <span className={`block text-sm font-semibold ${isSelected ? 'text-primary-300' : 'text-dark-text'}`}>
                  {model.name}
                </span>
                <span className="mt-0.5 block text-[11px] leading-tight text-dark-text-muted">{model.description}</span>
              </button>
            )
          })}
        </div>

        {isCustom && (
          <div className="rounded-lg border border-dark-border bg-dark-surface p-4">
            <div className="grid grid-cols-3 gap-3">
              {AREAS.map(({ area, field }) => (
                <div key={field}>
                  <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-dark-text-secondary">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: BUDGET_AREA_COLORS[area] }} />
                    {BUDGET_AREA_LABELS[area]}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={customModel[field]}
                      onChange={(e) => handleCustomChange(field, parseInt(e.target.value) || 0)}
                      className="w-full rounded-lg border border-dark-border bg-dark-input px-3 py-2 text-center text-sm font-semibold tabular-nums text-dark-text transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25"
                    />
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-dark-text-muted">
                      %
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {customTotal !== 100 && (
              <p className="mt-3 text-xs font-medium text-rose-400">
                As proporções somam {customTotal}% — ajuste para fechar 100%.
              </p>
            )}
          </div>
        )}

        {availableForBudget > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {AREAS.map(({ area }) => (
              <div key={area} className="rounded-lg bg-dark-surface px-3 py-2.5">
                <span className="flex items-center gap-1.5 text-xs text-dark-text-muted">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: BUDGET_AREA_COLORS[area] }} />
                  {BUDGET_AREA_LABELS[area]}
                </span>
                <strong className="mt-1 block text-sm font-semibold tabular-nums text-dark-text">
                  {formatCurrency(budgetAllocation[area])}
                </strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
