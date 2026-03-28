import { useState } from 'react'
import { Receipt, Plus, Trash2, ChevronDown } from 'lucide-react'
import { Card } from './Card'
import { CurrencyInput } from './CurrencyInput'
import type { CostItem, CostCategory } from '../types'
import { COST_CATEGORIES, COST_CATEGORY_LABELS, COST_CATEGORY_COLORS } from '../types/constants'
import { formatCurrency } from '../utils'

interface Props {
  costs: CostItem[]
  addCost: (name: string, value: number, category: CostCategory) => void
  removeCost: (id: string) => void
  totalCosts: number
}

export function CostManager({ costs, addCost, removeCost, totalCosts }: Props) {
  const [name, setName] = useState('')
  const [value, setValue] = useState(0)
  const [category, setCategory] = useState<CostCategory>('moradia')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const selectedCat = COST_CATEGORIES.find((c) => c.key === category)

  const handleAdd = () => {
    if (!name.trim() || value <= 0) return
    addCost(name.trim(), value, category)
    setName('')
    setValue(0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd()
  }

  const handleQuickAdd = (catKey: CostCategory, suggestion: string) => {
    setCategory(catKey)
    setName(suggestion)
    setShowSuggestions(false)
  }

  // Common quick-add suggestions
  const quickSuggestions: { cat: CostCategory; items: string[] }[] = [
    { cat: 'moradia', items: ['Aluguel', 'Condominio', 'IPTU'] },
    { cat: 'contas', items: ['Energia', 'Internet', 'Celular', 'Streaming'] },
    { cat: 'alimentacao', items: ['Supermercado', 'iFood/Delivery'] },
    { cat: 'transporte', items: ['Combustivel', 'Uber', 'Estacionamento'] },
    { cat: 'dividas', items: ['Cartao de Credito', 'Financiamento'] },
  ]

  return (
    <Card title="Custos Mensais" icon={<Receipt size={18} />} accentColor="bg-rose-500">
      <div className="space-y-4">
        {/* Quick suggestions toggle */}
        <button
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl
            bg-dark-surface border border-dark-border text-sm text-dark-text-secondary
            hover:bg-dark-hover transition-colors"
        >
          <span>Sugestoes rapidas de custos comuns</span>
          <ChevronDown size={16} className={`transition-transform ${showSuggestions ? 'rotate-180' : ''}`} />
        </button>

        {showSuggestions && (
          <div className="p-3 bg-dark-surface rounded-xl border border-dark-border space-y-3">
            {quickSuggestions.map(({ cat, items }) => {
              const catInfo = COST_CATEGORIES.find((c) => c.key === cat)
              return (
                <div key={cat}>
                  <span className="text-xs font-medium text-dark-text-muted mb-1.5 block">
                    {catInfo?.emoji} {catInfo?.label}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((item) => (
                      <button
                        key={item}
                        onClick={() => handleQuickAdd(cat, item)}
                        className="px-2.5 py-1 rounded-lg bg-dark-input border border-dark-border text-xs text-dark-text-secondary
                          hover:border-primary-500/50 hover:text-primary-400 transition-colors"
                      >
                        + {item}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Category selector with hints */}
        <div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as CostCategory)}
            className="w-full px-3 py-2.5 rounded-xl border border-dark-border bg-dark-input text-dark-text text-sm
              focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all"
          >
            {COST_CATEGORIES.map(({ key, label, emoji }) => (
              <option key={key} value={key}>
                {emoji} {label}
              </option>
            ))}
          </select>
          {selectedCat && (
            <p className="text-[11px] text-dark-text-muted mt-1 px-1">
              Ex: {selectedCat.hint}
            </p>
          )}
        </div>

        {/* Name + Value inputs */}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nome do custo (ex: Aluguel, Netflix...)"
          className="w-full px-3 py-2.5 rounded-xl border border-dark-border bg-dark-input text-dark-text text-sm
            focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all"
        />

        <div className="flex gap-2">
          <div className="flex-1">
            <CurrencyInput value={value} onChange={setValue} />
          </div>
          <button
            onClick={handleAdd}
            disabled={!name.trim() || value <= 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-medium
              hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus size={16} />
            Adicionar
          </button>
        </div>

        {/* Cost list */}
        {costs.length > 0 && (
          <div className="space-y-2">
            {costs.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between px-3 py-2.5 bg-dark-surface rounded-xl group"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: COST_CATEGORY_COLORS[c.category] }}
                  />
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-dark-text block truncate">{c.name}</span>
                    <span className="text-xs text-dark-text-muted">{COST_CATEGORY_LABELS[c.category]}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-dark-text">{formatCurrency(c.value)}</span>
                  <button
                    onClick={() => removeCost(c.id)}
                    className="p-1.5 rounded-lg text-dark-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors
                      opacity-0 group-hover:opacity-100"
                    aria-label={`Remover ${c.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex justify-between px-3 py-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
              <span className="text-sm font-medium text-rose-400">Total custos</span>
              <span className="text-sm font-bold text-rose-400">{formatCurrency(totalCosts)}</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
