import { useState } from 'react'
import { Target, Plus, Trash2 } from 'lucide-react'
import { Card } from './Card'
import type { DiversificationSlice } from '../types'
import { formatCurrency } from '../utils'

interface Props {
  diversification: DiversificationSlice[]
  updateDiversification: (slices: DiversificationSlice[]) => void
  addDiversificationSlice: (name: string, percentage: number, color: string) => void
  removeDiversificationSlice: (id: string) => void
  investmentAllocation: (DiversificationSlice & { amount: number })[]
  totalInvestment: number
  investmentDeductions: number
  directInvestmentTarget: number
}

const PRESET_COLORS = ['#3b82f6', '#34d399', '#fbbf24', '#a78bfa', '#fb7185', '#22d3ee', '#f472b6', '#a3e635']

const SUGGESTIONS = [
  'Renda Fixa',
  'Acoes',
  'Fundos Imobiliarios',
  'Criptomoedas',
  'Acoes Internacionais',
  'Tesouro Direto',
  'ETFs',
  'Poupanca',
]

export function DiversificationSelector({
  diversification,
  updateDiversification,
  addDiversificationSlice,
  removeDiversificationSlice,
  investmentAllocation,
  totalInvestment,
  investmentDeductions,
  directInvestmentTarget,
}: Props) {
  const [newName, setNewName] = useState('')

  const totalPct = diversification.reduce((s, d) => s + d.percentage, 0)

  const handlePercentageChange = (id: string, value: number) => {
    const clamped = Math.max(0, Math.min(100, value))
    updateDiversification(
      diversification.map((d) => (d.id === id ? { ...d, percentage: clamped } : d)),
    )
  }

  const handleAdd = (name: string) => {
    if (!name.trim()) return
    const usedColors = new Set(diversification.map((d) => d.color))
    const color = PRESET_COLORS.find((c) => !usedColors.has(c)) || PRESET_COLORS[0]
    addDiversificationSlice(name.trim(), 0, color)
    setNewName('')
  }

  const handleSuggestionClick = (name: string) => {
    if (diversification.some((d) => d.name === name)) return
    handleAdd(name)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd(newName)
  }

  const unallocatedPct = 100 - totalPct
  const unallocatedAmount = directInvestmentTarget - (directInvestmentTarget * totalPct) / 100

  return (
    <Card
      title="Diversificacao de Investimentos"
      icon={<Target size={18} />}
      accentColor="bg-emerald-600"
      collapsible
      storageKey="diversification"
      headerExtra={
        directInvestmentTarget > 0 ? (
          <span className="text-sm font-bold text-emerald-400">{formatCurrency(directInvestmentTarget)}</span>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {/* Investment summary */}
        {totalInvestment > 0 && (
          <div className="space-y-2 p-3 bg-dark-surface rounded-xl border border-dark-border">
            <div className="flex justify-between text-sm">
              <span className="text-dark-text-secondary">Meta investimentos</span>
              <span className="font-bold text-emerald-400">{formatCurrency(totalInvestment)}</span>
            </div>
            {investmentDeductions > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-dark-text-secondary">Previdencia (fonte)</span>
                  <span className="font-semibold text-amber-400">- {formatCurrency(investmentDeductions)}</span>
                </div>
                <div className="border-t border-dark-border-subtle pt-2 flex justify-between text-sm">
                  <span className="text-dark-text font-medium">Aporte direto</span>
                  <span className="font-bold text-dark-text">{formatCurrency(directInvestmentTarget)}</span>
                </div>
              </>
            )}
            <p className="text-[11px] text-dark-text-muted">
              Distribua o aporte direto entre suas classes de investimento{investmentDeductions > 0 ? ' (sem previdencia)' : ''}.
            </p>
          </div>
        )}

        {/* Quick suggestions */}
        <div>
          <p className="text-xs text-dark-text-muted mb-2">Adicione classes de investimento:</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.filter((s) => !diversification.some((d) => d.name === s)).map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-2.5 py-1 rounded-lg bg-dark-surface border border-dark-border text-xs text-dark-text-secondary
                  hover:border-emerald-500/50 hover:text-emerald-400 transition-colors"
              >
                + {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Custom add */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Outra classe..."
            className="flex-1 px-3 py-2 rounded-xl border border-dark-border bg-dark-input text-dark-text text-sm
              focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
          />
          <button
            onClick={() => handleAdd(newName)}
            disabled={!newName.trim()}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium
              hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Sliders */}
        {diversification.length > 0 && (
          <div className="space-y-3">
            {diversification.map((slice) => {
              const allocation = investmentAllocation.find((a) => a.id === slice.id)
              return (
                <div key={slice.id} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                      <span className="text-sm font-medium text-dark-text truncate">{slice.name}</span>
                      <button
                        onClick={() => removeDiversificationSlice(slice.id)}
                        className="p-1 rounded text-dark-text-muted hover:text-rose-400 transition-colors
                          opacity-0 group-hover:opacity-100 shrink-0"
                        aria-label={`Remover ${slice.name}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold text-emerald-400 w-10 text-right">
                        {slice.percentage}%
                      </span>
                      <span className="text-sm font-bold text-dark-text w-24 text-right">
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
                    className="w-full h-2 rounded-full appearance-none cursor-pointer
                      bg-dark-border accent-emerald-500
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500
                      [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer
                      [&::-webkit-slider-thumb]:hover:bg-emerald-400
                      [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
                      [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-emerald-500
                      [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                  />
                </div>
              )
            })}

            {/* Total / unallocated */}
            <div className="pt-3 border-t border-dark-border-subtle space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-dark-text-secondary">Alocado</span>
                <span className={`font-bold ${totalPct > 100 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {totalPct}%
                  {directInvestmentTarget > 0 && ` — ${formatCurrency((directInvestmentTarget * totalPct) / 100)}`}
                </span>
              </div>
              {totalPct > 100 && (
                <p className="text-xs text-rose-400 font-medium">
                  Alocacao excede 100%. Ajuste os sliders.
                </p>
              )}
              {unallocatedPct > 0 && totalPct <= 100 && (
                <div className="flex justify-between text-sm">
                  <span className="text-dark-text-muted">Livre para alocar</span>
                  <span className="font-medium text-dark-text-muted">
                    {unallocatedPct}%
                    {directInvestmentTarget > 0 && ` — ${formatCurrency(unallocatedAmount)}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
