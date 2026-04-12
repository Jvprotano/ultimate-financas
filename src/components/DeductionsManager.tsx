import { useState } from 'react'
import { ShieldCheck, Plus, Trash2, TrendingUp } from 'lucide-react'
import { Card } from './Card'
import { CurrencyInput } from './CurrencyInput'
import type { DeductionItem, DeductionType } from '../types'
import { DEDUCTION_TYPE_LABELS, INVESTMENT_DEDUCTION_TYPES } from '../types/constants'
import { formatCurrency } from '../utils'

interface Props {
  deductions: DeductionItem[]
  addDeduction: (name: string, value: number, type: DeductionType) => void
  removeDeduction: (id: string) => void
  totalDeductions: number
  investmentDeductions: number
}

export function DeductionsManager({ deductions, addDeduction, removeDeduction, totalDeductions, investmentDeductions }: Props) {
  const [name, setName] = useState('')
  const [value, setValue] = useState(0)
  const [type, setType] = useState<DeductionType>('previdencia_privada')

  const handleAdd = () => {
    if (!name.trim() || value <= 0) return
    addDeduction(name.trim(), value, type)
    setName('')
    setValue(0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd()
  }

  const isInvestmentType = (t: DeductionType) => INVESTMENT_DEDUCTION_TYPES.includes(t)

  return (
    <Card
      title="Descontos na Fonte"
      icon={<ShieldCheck size={18} />}
      accentColor="bg-amber-500"
      collapsible
      storageKey="deductions"
      headerExtra={
        totalDeductions > 0 ? (
          <span className="text-sm font-bold text-amber-400">{formatCurrency(totalDeductions)}</span>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-dark-text-muted">
          Previdencia privada, plano de saude, vale-alimentacao e outros descontos retidos antes do pagamento.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nome do desconto"
            className="w-full px-3 py-2.5 rounded-xl border border-dark-border bg-dark-input text-dark-text text-sm
              focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as DeductionType)}
            className="w-full px-3 py-2.5 rounded-xl border border-dark-border bg-dark-input text-dark-text text-sm
              focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
          >
            {(Object.entries(DEDUCTION_TYPE_LABELS) as [DeductionType, string][]).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <CurrencyInput value={value} onChange={setValue} />
          </div>
          <button
            onClick={handleAdd}
            disabled={!name.trim() || value <= 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-medium
              hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus size={16} />
            Adicionar
          </button>
        </div>

        {deductions.length > 0 && (
          <div className="space-y-2">
            {deductions.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between px-3 py-2.5 bg-dark-surface rounded-xl group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-dark-text block truncate">{d.name}</span>
                    {isInvestmentType(d.type) && (
                      <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-400">
                        <TrendingUp size={10} />
                        Investimento
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-dark-text-muted">{DEDUCTION_TYPE_LABELS[d.type]}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-amber-400">{formatCurrency(d.value)}</span>
                  <button
                    onClick={() => removeDeduction(d.id)}
                    className="p-1.5 rounded-lg text-dark-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors
                      opacity-0 group-hover:opacity-100"
                    aria-label={`Remover ${d.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex justify-between px-3 py-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <span className="text-sm font-medium text-amber-400">Total descontos</span>
              <span className="text-sm font-bold text-amber-400">{formatCurrency(totalDeductions)}</span>
            </div>
            {investmentDeductions > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <TrendingUp size={14} className="text-emerald-400 shrink-0" />
                <span className="text-xs text-emerald-400">
                  {formatCurrency(investmentDeductions)} conta como investimento no seu orçamento
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
