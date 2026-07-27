import { useState } from 'react'
import { Heart, Plus, Trash2 } from 'lucide-react'
import { Card } from './Card'
import { CurrencyInput } from './CurrencyInput'
import { HeaderMetric } from './HeaderMetric'
import { MeterWithMarker, PrimaryButton, SuggestionChip } from './ui'
import { formatCurrency, inputClass } from '../lib/format'
import { useCardsStore, useMetrics, useScenarioStore } from '../context/financasStore'
import { BUDGET_AREA_COLORS } from '../types/constants'

const SUGGESTIONS = [
  'Streaming',
  'Comer fora',
  'Delivery',
  'Viagens',
  'Roupas',
  'Jogos / Hobbies',
  'Cinema / Shows',
  'Presentes',
]

export function WantsManager() {
  const { wants, addWant, removeWant, updateWantAmount } = useScenarioStore()
  const { totalWantsAmount, budgetAllocation, availableForBudget, selectedModel } = useMetrics()
  const { summary } = useCardsStore()

  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState(0)

  const desejosTarget = budgetAllocation.desejos
  const remaining = desejosTarget - totalWantsAmount
  const realized = summary.personalByArea.desejos

  const handleAdd = () => {
    if (!newName.trim()) return
    addWant(newName.trim(), newAmount)
    setNewName('')
    setNewAmount(0)
  }

  return (
    <Card
      title="Desejos"
      icon={<Heart size={17} />}
      collapsible
      storageKey="wants"
      headerExtra={
        totalWantsAmount > 0 ? (
          <HeaderMetric
            amount={totalWantsAmount}
            baseAmount={availableForBudget}
            targetShare={selectedModel.desejos}
            label="Planejado"
            tone="slate"
          />
        ) : undefined
      }
    >
      <div className="space-y-4">
        {desejosTarget > 0 && (
          <div>
            <div className="mb-1.5 flex items-baseline justify-between text-xs">
              <span className="text-dark-text-muted">
                Meta de desejos: {formatCurrency(desejosTarget)}
              </span>
              <span
                className={`font-medium tabular-nums ${
                  remaining >= 0 ? 'text-primary-400' : 'text-rose-400'
                }`}
              >
                {remaining >= 0
                  ? `${formatCurrency(remaining)} livres`
                  : `${formatCurrency(-remaining)} acima`}
              </span>
            </div>
            {/* A barra é o planejado; o traço marca o que já saiu no cartão. */}
            <MeterWithMarker
              value={totalWantsAmount}
              marker={realized}
              max={desejosTarget}
              color={BUDGET_AREA_COLORS.desejos}
              markerLabel={`Já gasto no cartão: ${formatCurrency(realized)}`}
            />
            {realized > 0 && (
              <p className="mt-1.5 text-[11px] text-dark-text-muted">
                <span className="mr-1 inline-block h-2 w-[2px] translate-y-[1px] bg-dark-text/70" />
                {formatCurrency(realized)} já gastos no cartão neste ciclo
                {totalWantsAmount > 0 &&
                  ` — ${((realized / totalWantsAmount) * 100).toFixed(0)}% do planejado`}
                .
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.filter((s) => !wants.some((w) => w.name === s)).map((s) => (
            <SuggestionChip key={s} label={s} onClick={() => addWant(s, 0)} />
          ))}
        </div>

        <div className="rounded-lg border border-dark-border bg-dark-surface/60 p-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Novo desejo (ex: Netflix, viagem...)"
              className={`${inputClass} flex-1`}
            />
            <div className="w-full sm:w-40">
              <CurrencyInput value={newAmount} onChange={setNewAmount} />
            </div>
            <PrimaryButton onClick={handleAdd} disabled={!newName.trim()}>
              <Plus size={15} />
              Adicionar
            </PrimaryButton>
          </div>
        </div>

        {wants.length > 0 && (
          <ul className="space-y-1.5">
            {wants.map((want) => (
              <li
                key={want.id}
                className="group flex items-center justify-between gap-3 rounded-lg bg-dark-surface px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-dark-text">
                  {want.name}
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <div className="w-32">
                    <CurrencyInput
                      value={want.plannedAmount}
                      onChange={(next) => updateWantAmount(want.id, next)}
                      className="!py-1.5"
                    />
                  </div>
                  <button
                    onClick={() => removeWant(want.id)}
                    className="rounded-md p-1.5 text-dark-text-muted opacity-0 transition-all hover:bg-rose-500/10 hover:text-rose-400 focus-visible:opacity-100 group-hover:opacity-100"
                    aria-label={`Remover ${want.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {wants.length > 0 && desejosTarget > 0 && remaining < 0 && (
          <p className="text-xs font-medium text-rose-400">
            Os desejos passam da meta em {formatCurrency(-remaining)}. Corte algo aqui ou escolha um
            modelo com mais espaço para desejos.
          </p>
        )}
      </div>
    </Card>
  )
}
