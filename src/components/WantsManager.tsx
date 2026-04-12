import { useState } from 'react'
import { Heart, Plus, Trash2 } from 'lucide-react'
import { Card } from './Card'
import type { WantItem } from '../types'
import { formatCurrency } from '../utils'

interface Props {
  wants: WantItem[]
  addWant: (name: string) => void
  removeWant: (id: string) => void
  updateWantPercentage: (id: string, percentage: number) => void
  wantAllocations: (WantItem & { amount: number })[]
  totalWantsPercentage: number
  desejosAmount: number
}

const SUGGESTIONS = [
  'Viagens',
  'Comer fora',
  'Cinema / Shows',
  'Roupas',
  'Jogos / Hobbies',
  'Streaming',
  'Delivery',
  'Presentes',
  'Cuidados pessoais',
  'Eletronicos',
]

export function WantsManager({
  wants,
  addWant,
  removeWant,
  updateWantPercentage,
  wantAllocations,
  totalWantsPercentage,
  desejosAmount,
}: Props) {
  const [newName, setNewName] = useState('')

  const handleAdd = () => {
    if (!newName.trim()) return
    addWant(newName.trim())
    setNewName('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd()
  }

  const handleSuggestionClick = (name: string) => {
    if (wants.some((w) => w.name === name)) return
    addWant(name)
  }

  const unallocatedPct = 100 - totalWantsPercentage
  const unallocatedAmount = desejosAmount - (desejosAmount * totalWantsPercentage) / 100

  return (
    <Card
      title="Desejos"
      icon={<Heart size={18} />}
      accentColor="bg-violet-600"
      collapsible
      storageKey="wants"
    >
      <div className="space-y-4">
        {/* Budget info */}
        {desejosAmount > 0 && (
          <div className="px-3 py-2.5 bg-violet-500/10 rounded-xl border border-violet-500/20">
            <div className="flex justify-between items-center">
              <span className="text-sm text-violet-400">Orçamento para desejos</span>
              <span className="text-sm font-bold text-violet-400">{formatCurrency(desejosAmount)}</span>
            </div>
          </div>
        )}

        {/* Quick suggestions */}
        <div>
          <p className="text-xs text-dark-text-muted mb-2">Adicione seus desejos:</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.filter((s) => !wants.some((w) => w.name === s)).map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-2.5 py-1 rounded-lg bg-dark-surface border border-dark-border text-xs text-dark-text-secondary
                  hover:border-violet-500/50 hover:text-violet-400 transition-colors"
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
            placeholder="Outro desejo..."
            className="flex-1 px-3 py-2 rounded-xl border border-dark-border bg-dark-input text-dark-text text-sm
              focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
          />
          <button
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium
              hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Sliders */}
        {wantAllocations.length > 0 && (
          <div className="space-y-3">
            {wantAllocations.map((w) => (
              <div key={w.id} className="group">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm font-medium text-dark-text truncate">{w.name}</span>
                    <button
                      onClick={() => removeWant(w.id)}
                      className="p-1 rounded text-dark-text-muted hover:text-rose-400 transition-colors
                        opacity-0 group-hover:opacity-100 shrink-0"
                      aria-label={`Remover ${w.name}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-semibold text-violet-400 w-10 text-right">
                      {w.percentage}%
                    </span>
                    <span className="text-sm font-bold text-dark-text w-24 text-right">
                      {formatCurrency(w.amount)}
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={w.percentage}
                  onChange={(e) => updateWantPercentage(w.id, parseInt(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer
                    bg-dark-border accent-violet-500
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-500
                    [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-webkit-slider-thumb]:hover:bg-violet-400
                    [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
                    [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-violet-500
                    [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                />
              </div>
            ))}

            {/* Total / unallocated */}
            <div className="pt-3 border-t border-dark-border-subtle space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-dark-text-secondary">Alocado</span>
                <span className={`font-bold ${totalWantsPercentage > 100 ? 'text-rose-400' : 'text-violet-400'}`}>
                  {totalWantsPercentage}%
                  {desejosAmount > 0 && ` — ${formatCurrency((desejosAmount * totalWantsPercentage) / 100)}`}
                </span>
              </div>
              {totalWantsPercentage > 100 && (
                <p className="text-xs text-rose-400 font-medium">
                  Alocacao excede 100%. Ajuste os sliders.
                </p>
              )}
              {unallocatedPct > 0 && totalWantsPercentage <= 100 && (
                <div className="flex justify-between text-sm">
                  <span className="text-dark-text-muted">Livre para alocar</span>
                  <span className="font-medium text-dark-text-muted">
                    {unallocatedPct}%
                    {desejosAmount > 0 && ` — ${formatCurrency(unallocatedAmount)}`}
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
