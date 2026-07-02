import { useState } from 'react'
import { Plus, Receipt, Trash2 } from 'lucide-react'
import { Card } from './Card'
import { CurrencyInput } from './CurrencyInput'
import { HeaderMetric } from './HeaderMetric'
import { Meter, PrimaryButton, SuggestionChip, } from './ui'
import { inputClass, selectClass } from '../utils'
import type { CostItem, CostCategory } from '../types'
import {
  BUDGET_AREA_COLORS,
  COST_CATEGORIES,
  COST_CATEGORY_COLORS,
  COST_CATEGORY_LABELS,
} from '../types/constants'
import { formatCurrency } from '../utils'

interface Props {
  costs: CostItem[]
  addCost: (name: string, value: number, category: CostCategory) => void
  removeCost: (id: string) => void
  totalCosts: number
  necessidadesTarget: number
}

const QUICK_SUGGESTIONS: { cat: CostCategory; name: string }[] = [
  { cat: 'moradia', name: 'Aluguel' },
  { cat: 'moradia', name: 'Condomínio' },
  { cat: 'contas', name: 'Energia' },
  { cat: 'contas', name: 'Internet' },
  { cat: 'contas', name: 'Celular' },
  { cat: 'alimentacao', name: 'Supermercado' },
  { cat: 'transporte', name: 'Combustível' },
  { cat: 'saude', name: 'Academia' },
]

export function CostManager({ costs, addCost, removeCost, totalCosts, necessidadesTarget }: Props) {
  const [name, setName] = useState('')
  const [value, setValue] = useState(0)
  const [category, setCategory] = useState<CostCategory>('moradia')
  const selectedCat = COST_CATEGORIES.find((c) => c.key === category)
  const remaining = necessidadesTarget - totalCosts

  const handleAdd = () => {
    if (!name.trim() || value <= 0) return
    addCost(name.trim(), value, category)
    setName('')
    setValue(0)
  }

  const sortedCosts = [...costs].sort((a, b) => b.value - a.value)

  return (
    <Card
      title="Custos fixos"
      icon={<Receipt size={17} />}
      collapsible
      storageKey="costs"
      headerExtra={
        totalCosts > 0 ? (
          <HeaderMetric amount={totalCosts} baseAmount={necessidadesTarget} label="Total" tone="slate" />
        ) : undefined
      }
    >
      <div className="space-y-4">
        {necessidadesTarget > 0 && (
          <div>
            <div className="mb-1.5 flex items-baseline justify-between text-xs">
              <span className="text-dark-text-muted">Meta de necessidades: {formatCurrency(necessidadesTarget)}</span>
              <span className={`font-medium tabular-nums ${remaining >= 0 ? 'text-primary-400' : 'text-rose-400'}`}>
                {remaining >= 0 ? `${formatCurrency(remaining)} de folga` : `${formatCurrency(-remaining)} acima`}
              </span>
            </div>
            <Meter value={totalCosts} max={necessidadesTarget} color={BUDGET_AREA_COLORS.necessidades} />
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {QUICK_SUGGESTIONS.filter((s) => !costs.some((c) => c.name === s.name)).map((s) => (
            <SuggestionChip
              key={s.name}
              label={s.name}
              onClick={() => {
                setCategory(s.cat)
                setName(s.name)
              }}
            />
          ))}
        </div>

        <div className="rounded-lg border border-dark-border bg-dark-surface/60 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Nome do custo"
              className={inputClass}
            />
            <select value={category} onChange={(e) => setCategory(e.target.value as CostCategory)} className={selectClass}>
              {COST_CATEGORIES.map(({ key, label }) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {selectedCat && <p className="mt-1.5 px-1 text-[11px] text-dark-text-muted">Ex: {selectedCat.hint}</p>}
          <div className="mt-2 flex gap-2">
            <div className="flex-1">
              <CurrencyInput value={value} onChange={setValue} />
            </div>
            <PrimaryButton onClick={handleAdd} disabled={!name.trim() || value <= 0}>
              <Plus size={15} />
              Adicionar
            </PrimaryButton>
          </div>
        </div>

        {sortedCosts.length > 0 && (
          <ul className="space-y-1.5">
            {sortedCosts.map((c) => (
              <li key={c.id} className="group flex items-center justify-between rounded-lg bg-dark-surface px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: COST_CATEGORY_COLORS[c.category] }}
                  />
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-medium text-dark-text">{c.name}</span>
                    <span className="text-xs text-dark-text-muted">{COST_CATEGORY_LABELS[c.category]}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="text-sm font-medium tabular-nums text-dark-text">{formatCurrency(c.value)}</span>
                  <button
                    onClick={() => removeCost(c.id)}
                    className="rounded-md p-1.5 text-dark-text-muted opacity-0 transition-all hover:bg-rose-500/10 hover:text-rose-400 group-hover:opacity-100"
                    aria-label={`Remover ${c.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}
