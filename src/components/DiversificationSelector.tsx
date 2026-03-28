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
}

const PRESET_COLORS = ['#3b82f6', '#34d399', '#fbbf24', '#a78bfa', '#fb7185', '#22d3ee', '#f472b6', '#a3e635']

export function DiversificationSelector({
  diversification,
  updateDiversification,
  addDiversificationSlice,
  removeDiversificationSlice,
  investmentAllocation,
  totalInvestment,
}: Props) {
  const [newName, setNewName] = useState('')
  const [newPct, setNewPct] = useState(10)

  const totalPct = diversification.reduce((s, d) => s + d.percentage, 0)

  const handlePercentageChange = (id: string, value: number) => {
    const clamped = Math.max(0, Math.min(100, value))
    updateDiversification(
      diversification.map((d) => (d.id === id ? { ...d, percentage: clamped } : d)),
    )
  }

  const handleAdd = () => {
    if (!newName.trim() || newPct <= 0) return
    const usedColors = new Set(diversification.map((d) => d.color))
    const color = PRESET_COLORS.find((c) => !usedColors.has(c)) || PRESET_COLORS[0]
    addDiversificationSlice(newName.trim(), newPct, color)
    setNewName('')
    setNewPct(10)
  }

  return (
    <Card title="Diversificacao de Investimentos" icon={<Target size={18} />} accentColor="bg-violet-600">
      <div className="space-y-4">
        <div className="space-y-2">
          {diversification.map((slice) => {
            const allocation = investmentAllocation.find((a) => a.id === slice.id)
            return (
              <div key={slice.id} className="flex items-center gap-3 group">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                <span className="text-sm font-medium text-dark-text flex-1 min-w-0 truncate">
                  {slice.name}
                </span>
                <div className="relative w-20">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={slice.percentage}
                    onChange={(e) => handlePercentageChange(slice.id, parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 rounded-lg border border-dark-border bg-dark-input text-dark-text text-sm text-center font-semibold
                      focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-dark-text-muted">%</span>
                </div>
                <span className="text-sm font-semibold text-dark-text-secondary w-28 text-right">
                  {allocation ? formatCurrency(allocation.amount) : '—'}
                </span>
                <button
                  onClick={() => removeDiversificationSlice(slice.id)}
                  className="p-1.5 rounded-lg text-dark-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors
                    opacity-0 group-hover:opacity-100"
                  aria-label={`Remover ${slice.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>

        {totalPct !== 100 && (
          <p className={`text-xs font-medium ${totalPct > 100 ? 'text-rose-400' : 'text-amber-400'}`}>
            Total: {totalPct}% — deve somar 100%
          </p>
        )}

        <div className="flex gap-2 pt-2 border-t border-dark-border-subtle">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nova classe (ex: Exterior)"
            className="flex-1 px-3 py-2 rounded-xl border border-dark-border bg-dark-input text-dark-text text-sm
              focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
          />
          <div className="relative w-20">
            <input
              type="number"
              min="1"
              max="100"
              value={newPct}
              onChange={(e) => setNewPct(parseInt(e.target.value) || 0)}
              className="w-full px-2 py-2 rounded-xl border border-dark-border bg-dark-input text-dark-text text-sm text-center
                focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-dark-text-muted">%</span>
          </div>
          <button
            onClick={handleAdd}
            disabled={!newName.trim() || newPct <= 0}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium
              hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>

        {totalInvestment > 0 && (
          <div className="flex justify-between px-3 py-2 bg-violet-500/10 rounded-xl border border-violet-500/20">
            <span className="text-sm font-medium text-violet-400">Total para investir</span>
            <span className="text-sm font-bold text-violet-400">{formatCurrency(totalInvestment)}</span>
          </div>
        )}
      </div>
    </Card>
  )
}
