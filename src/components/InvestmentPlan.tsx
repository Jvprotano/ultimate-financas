import { useState } from 'react'
import { Plus, Target, Trash2 } from 'lucide-react'
import { Card } from './Card'
import { HeaderMetric } from './HeaderMetric'
import { PrimaryButton, SuggestionChip, } from './ui'
import { inputClass } from '../utils'
import type { DiversificationSlice } from '../types'
import { DIVERSIFICATION_PRESET_COLORS } from '../types/constants'
import { formatCurrency } from '../utils'

interface Props {
  diversification: DiversificationSlice[]
  updateDiversification: (slices: DiversificationSlice[]) => void
  addDiversificationSlice: (name: string, percentage: number, color: string) => void
  removeDiversificationSlice: (id: string) => void
  investmentAllocation: (DiversificationSlice & { amount: number })[]
  investmentTarget: number
  investmentDeductions: number
  employerInvestmentContributions: number
  directInvestmentTarget: number
}

const SUGGESTIONS = [
  'Renda Fixa',
  'Ações',
  'Fundos Imobiliários',
  'Criptomoedas',
  'Ações Internacionais',
  'ETFs',
]

export function InvestmentPlan({
  diversification,
  updateDiversification,
  addDiversificationSlice,
  removeDiversificationSlice,
  investmentAllocation,
  investmentTarget,
  investmentDeductions,
  employerInvestmentContributions,
  directInvestmentTarget,
}: Props) {
  const [newName, setNewName] = useState('')
  const totalPct = diversification.reduce((s, d) => s + d.percentage, 0)
  const unallocatedPct = 100 - totalPct

  const handlePercentageChange = (id: string, value: number) => {
    const clamped = Math.max(0, Math.min(100, value))
    updateDiversification(diversification.map((d) => (d.id === id ? { ...d, percentage: clamped } : d)))
  }

  const handleAdd = (name: string) => {
    if (!name.trim()) return
    const usedColors = new Set(diversification.map((d) => d.color))
    const color = DIVERSIFICATION_PRESET_COLORS.find((c) => !usedColors.has(c)) || DIVERSIFICATION_PRESET_COLORS[0]
    addDiversificationSlice(name.trim(), 0, color)
    setNewName('')
  }

  return (
    <Card
      title="Investimentos"
      icon={<Target size={17} />}
      collapsible
      storageKey="investments"
      headerExtra={
        directInvestmentTarget > 0 ? (
          <HeaderMetric amount={directInvestmentTarget} baseAmount={0} label="Aporte direto" tone="primary" />
        ) : undefined
      }
    >
      <div className="space-y-4">
        {investmentTarget > 0 && (
          <dl className="space-y-1.5 rounded-lg border border-dark-border bg-dark-surface p-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-dark-text-secondary">Meta do mês</dt>
              <dd className="font-medium tabular-nums text-dark-text">{formatCurrency(investmentTarget)}</dd>
            </div>
            {investmentDeductions > 0 && (
              <div className="flex justify-between">
                <dt className="text-dark-text-secondary">Já investido via folha</dt>
                <dd className="font-medium tabular-nums text-dark-text-secondary">
                  − {formatCurrency(investmentDeductions)}
                </dd>
              </div>
            )}
            <div className="flex justify-between border-t border-dark-border-subtle pt-1.5">
              <dt className="font-medium text-dark-text">Aporte direto pela conta</dt>
              <dd className="font-semibold tabular-nums text-primary-400">{formatCurrency(directInvestmentTarget)}</dd>
            </div>
            {employerInvestmentContributions > 0 && (
              <p className="pt-1 text-xs text-dark-text-muted">
                A empresa ainda contribui com {formatCurrency(employerInvestmentContributions)} de previdência — bônus
                que não reduz sua meta.
              </p>
            )}
          </dl>
        )}

        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.filter((s) => !diversification.some((d) => d.name === s)).map((s) => (
            <SuggestionChip key={s} label={s} onClick={() => handleAdd(s)} />
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd(newName)}
            placeholder="Outra classe de ativo..."
            className={`${inputClass} flex-1`}
          />
          <PrimaryButton onClick={() => handleAdd(newName)} disabled={!newName.trim()}>
            <Plus size={15} />
          </PrimaryButton>
        </div>

        {diversification.length > 0 && (
          <div className="space-y-3">
            {diversification.map((slice) => {
              const allocation = investmentAllocation.find((a) => a.id === slice.id)
              return (
                <div key={slice.id} className="group">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
                      <span className="truncate text-sm font-medium text-dark-text">{slice.name}</span>
                      <button
                        onClick={() => removeDiversificationSlice(slice.id)}
                        className="shrink-0 rounded p-1 text-dark-text-muted opacity-0 transition-all hover:text-rose-400 group-hover:opacity-100"
                        aria-label={`Remover ${slice.name}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-sm">
                      <span className="w-10 text-right text-xs font-medium tabular-nums text-dark-text-secondary">
                        {slice.percentage}%
                      </span>
                      <span className="w-24 text-right font-medium tabular-nums text-dark-text">
                        {allocation ? formatCurrency(allocation.amount) : '—'}
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={slice.percentage}
                    onChange={(e) => handlePercentageChange(slice.id, parseInt(e.target.value))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-dark-border accent-primary-500 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary-400 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-400"
                  />
                </div>
              )
            })}

            <div className="flex justify-between border-t border-dark-border-subtle pt-3 text-sm">
              <span className="text-dark-text-secondary">Distribuído</span>
              <span className={`font-semibold tabular-nums ${totalPct > 100 ? 'text-rose-400' : 'text-dark-text'}`}>
                {totalPct}%
                {directInvestmentTarget > 0 && ` · ${formatCurrency((directInvestmentTarget * totalPct) / 100)}`}
              </span>
            </div>
            {totalPct > 100 && (
              <p className="text-xs font-medium text-rose-400">A distribuição passa de 100%. Ajuste os pesos.</p>
            )}
            {unallocatedPct > 0 && totalPct <= 100 && directInvestmentTarget > 0 && (
              <p className="text-xs text-dark-text-muted">
                {unallocatedPct}% do aporte ({formatCurrency((directInvestmentTarget * unallocatedPct) / 100)}) ainda sem
                destino.
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
