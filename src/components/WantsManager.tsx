import { useState } from 'react'
import { Heart, Plus, SlidersHorizontal, Trash2 } from 'lucide-react'
import { Card } from './Card'
import { CurrencyInput } from './CurrencyInput'
import { HeaderMetric } from './HeaderMetric'
import type { WantAllocationMode, WantItem } from '../types'
import { formatCurrency } from '../utils'

interface Props {
  wants: WantItem[]
  addWant: (name: string, mode?: WantAllocationMode, fixedAmount?: number) => void
  removeWant: (id: string) => void
  updateWantPercentage: (id: string, percentage: number) => void
  updateWantFixedAmount: (id: string, fixedAmount: number) => void
  updateWantMode: (id: string, mode: WantAllocationMode) => void
  wantAllocations: (WantItem & { amount: number; mode: WantAllocationMode; fixedAmount: number })[]
  totalWantsPercentage: number
  fixedWantsAmount: number
  variableWantsBase: number
  totalWantsAmount: number
  desejosAmount: number
  availableForBudget: number
}

const SUGGESTIONS: { name: string; mode: WantAllocationMode }[] = [
  { name: 'Streaming', mode: 'fixed' },
  { name: 'Academia', mode: 'fixed' },
  { name: 'Assinaturas', mode: 'fixed' },
  { name: 'Viagens', mode: 'percentage' },
  { name: 'Comer fora', mode: 'percentage' },
  { name: 'Cinema / Shows', mode: 'percentage' },
  { name: 'Roupas', mode: 'percentage' },
  { name: 'Jogos / Hobbies', mode: 'percentage' },
  { name: 'Delivery', mode: 'percentage' },
  { name: 'Presentes', mode: 'percentage' },
]

export function WantsManager({
  wants,
  addWant,
  removeWant,
  updateWantPercentage,
  updateWantFixedAmount,
  updateWantMode,
  wantAllocations,
  totalWantsPercentage,
  fixedWantsAmount,
  variableWantsBase,
  totalWantsAmount,
  desejosAmount,
  availableForBudget,
}: Props) {
  const [newName, setNewName] = useState('')
  const [newMode, setNewMode] = useState<WantAllocationMode>('percentage')
  const [newFixedAmount, setNewFixedAmount] = useState(0)
  const remainingAmount = desejosAmount - totalWantsAmount
  const variableAmount = totalWantsAmount - fixedWantsAmount

  const handleAdd = () => {
    if (!newName.trim()) return
    addWant(newName.trim(), newMode, newMode === 'fixed' ? newFixedAmount : 0)
    setNewName('')
    setNewFixedAmount(0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd()
  }

  const handleSuggestionClick = (name: string, mode: WantAllocationMode) => {
    if (wants.some((want) => want.name === name)) return
    addWant(name, mode, 0)
  }

  return (
    <Card
      title="Desejos e Variaveis"
      icon={<Heart size={18} />}
      accentColor="bg-violet-600"
      collapsible
      storageKey="wants"
      headerExtra={
        totalWantsAmount > 0 ? (
          <HeaderMetric amount={totalWantsAmount} baseAmount={availableForBudget} label="Usado" tone="violet" />
        ) : undefined
      }
    >
      <div className="space-y-5">
        {desejosAmount > 0 && (
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-2.5">
              <span className="block text-xs text-violet-300">Meta de desejos</span>
              <strong className="text-sm text-violet-100">{formatCurrency(desejosAmount)}</strong>
            </div>
            <div className="rounded-lg border border-dark-border bg-dark-surface px-3 py-2.5">
              <span className="block text-xs text-dark-text-muted">Fixos</span>
              <strong className="text-sm text-dark-text">{formatCurrency(fixedWantsAmount)}</strong>
            </div>
            <div
              className={`rounded-lg border px-3 py-2.5 ${
                remainingAmount >= 0
                  ? 'border-emerald-500/20 bg-emerald-500/10'
                  : 'border-rose-500/20 bg-rose-500/10'
              }`}
            >
              <span className={`block text-xs ${remainingAmount >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {remainingAmount >= 0 ? 'Ainda livre' : 'Faltando'}
              </span>
              <strong className={`text-sm ${remainingAmount >= 0 ? 'text-emerald-100' : 'text-rose-100'}`}>
                {formatCurrency(Math.abs(remainingAmount))}
              </strong>
            </div>
          </div>
        )}

        <div>
          <p className="mb-2 text-xs text-dark-text-muted">Atalhos com tipo sugerido:</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.filter((suggestion) => !wants.some((want) => want.name === suggestion.name)).map(
              (suggestion) => (
                <button
                  key={suggestion.name}
                  onClick={() => handleSuggestionClick(suggestion.name, suggestion.mode)}
                  className="rounded-lg border border-dark-border bg-dark-surface px-2.5 py-1 text-xs text-dark-text-secondary transition-colors hover:border-violet-500/50 hover:text-violet-300"
                >
                  + {suggestion.name} {suggestion.mode === 'fixed' ? '(fixo)' : ''}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="rounded-lg border border-dark-border bg-dark-surface p-3">
          <div className="grid gap-2 lg:grid-cols-[1fr_auto_auto] lg:items-end">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-dark-text-muted">Novo desejo</span>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ex: Netflix, viagem, restaurantes..."
                className="w-full rounded-lg border border-dark-border bg-dark-input px-3 py-2.5 text-sm text-dark-text transition-all focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />
            </label>

            <div>
              <span className="mb-1.5 block text-xs font-medium text-dark-text-muted">Tipo</span>
              <div className="grid grid-cols-2 rounded-lg border border-dark-border bg-dark-input p-1">
                {(['percentage', 'fixed'] as WantAllocationMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setNewMode(mode)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                      newMode === mode ? 'bg-violet-600 text-white' : 'text-dark-text-muted hover:text-dark-text'
                    }`}
                  >
                    {mode === 'percentage' ? '%' : 'R$'}
                  </button>
                ))}
              </div>
            </div>

            {newMode === 'fixed' && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-dark-text-muted">Valor fixo</span>
                <CurrencyInput value={newFixedAmount} onChange={setNewFixedAmount} />
              </label>
            )}
          </div>

          <button
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={16} />
            Adicionar desejo
          </button>
        </div>

        {wantAllocations.length > 0 && (
          <div className="space-y-3">
            {wantAllocations.map((want) => {
              const isFixed = want.mode === 'fixed'

              return (
                <div key={want.id} className="rounded-lg border border-dark-border bg-dark-surface p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-dark-text">{want.name}</h3>
                      <p className="text-xs text-dark-text-muted">
                        {isFixed ? 'Valor fixo mensal' : `Percentual sobre ${formatCurrency(variableWantsBase)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <strong className="text-sm text-dark-text">{formatCurrency(want.amount)}</strong>
                      <button
                        onClick={() => removeWant(want.id)}
                        className="rounded-lg p-1.5 text-dark-text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                        aria-label={`Remover ${want.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 lg:grid-cols-[auto_1fr] lg:items-center">
                    <div className="grid grid-cols-2 rounded-lg border border-dark-border bg-dark-input p-1">
                      {(['percentage', 'fixed'] as WantAllocationMode[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => updateWantMode(want.id, mode)}
                          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                            want.mode === mode ? 'bg-violet-600 text-white' : 'text-dark-text-muted hover:text-dark-text'
                          }`}
                        >
                          {mode === 'percentage' ? '%' : 'R$'}
                        </button>
                      ))}
                    </div>

                    {isFixed ? (
                      <CurrencyInput value={want.fixedAmount} onChange={(next) => updateWantFixedAmount(want.id, next)} />
                    ) : (
                      <div>
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-dark-text-muted">
                            <SlidersHorizontal size={12} />
                            Peso no saldo flexivel
                          </span>
                          <span className="font-semibold text-violet-300">{want.percentage}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={want.percentage}
                          onChange={(e) => updateWantPercentage(want.id, parseInt(e.target.value))}
                          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-dark-border accent-violet-500 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-violet-500 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-500 [&::-webkit-slider-thumb]:shadow-md"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            <div className="rounded-lg border border-dark-border bg-dark-surface p-3">
              <div className="grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <span className="block text-xs text-dark-text-muted">Fixos</span>
                  <strong className="text-dark-text">{formatCurrency(fixedWantsAmount)}</strong>
                </div>
                <div>
                  <span className="block text-xs text-dark-text-muted">Variaveis</span>
                  <strong className={totalWantsPercentage > 100 ? 'text-rose-300' : 'text-violet-300'}>
                    {totalWantsPercentage}% - {formatCurrency(variableAmount)}
                  </strong>
                </div>
                <div>
                  <span className="block text-xs text-dark-text-muted">Total usado</span>
                  <strong className={totalWantsAmount > desejosAmount ? 'text-rose-300' : 'text-emerald-300'}>
                    {formatCurrency(totalWantsAmount)}
                  </strong>
                </div>
              </div>
              {totalWantsPercentage > 100 && (
                <p className="mt-2 text-xs font-medium text-rose-300">
                  Os desejos variaveis passam de 100% do saldo flexivel.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
