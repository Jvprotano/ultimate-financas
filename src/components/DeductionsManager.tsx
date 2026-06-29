import { useState } from 'react'
import { Handshake, Plus, ShieldCheck, Trash2, TrendingUp } from 'lucide-react'
import { Card } from './Card'
import { CurrencyInput } from './CurrencyInput'
import { HeaderMetric } from './HeaderMetric'
import type { DeductionItem, DeductionType } from '../types'
import { DEDUCTION_TYPE_LABELS, INVESTMENT_DEDUCTION_TYPES } from '../types/constants'
import { formatCurrency } from '../utils'

interface Props {
  deductions: DeductionItem[]
  addDeduction: (name: string, value: number, type: DeductionType, employerContribution?: number) => void
  removeDeduction: (id: string) => void
  updateDeductionEmployerContribution: (id: string, employerContribution: number) => void
  totalDeductions: number
  investmentDeductions: number
  employerInvestmentContributions: number
  availableForBudget: number
}

export function DeductionsManager({
  deductions,
  addDeduction,
  removeDeduction,
  updateDeductionEmployerContribution,
  totalDeductions,
  investmentDeductions,
  employerInvestmentContributions,
  availableForBudget,
}: Props) {
  const [name, setName] = useState('')
  const [value, setValue] = useState(0)
  const [employerContribution, setEmployerContribution] = useState(0)
  const [type, setType] = useState<DeductionType>('previdencia_privada')
  const isInvestmentType = (t: DeductionType) => INVESTMENT_DEDUCTION_TYPES.includes(t)
  const isInvestment = isInvestmentType(type)
  const totalInvestmentViaPayroll = investmentDeductions + employerInvestmentContributions

  const handleAdd = () => {
    if (!name.trim() || value <= 0) return
    addDeduction(name.trim(), value, type, isInvestment ? employerContribution : 0)
    setName('')
    setValue(0)
    setEmployerContribution(0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd()
  }

  return (
    <Card
      title="Descontos e Beneficios"
      icon={<ShieldCheck size={18} />}
      accentColor="bg-amber-500"
      collapsible
      storageKey="deductions"
      headerExtra={
        totalDeductions > 0 ? (
          <HeaderMetric amount={totalDeductions} baseAmount={availableForBudget} label="Folha" tone="amber" />
        ) : undefined
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2.5">
            <span className="block text-xs text-amber-300">Desconta do salario</span>
            <strong className="text-sm text-amber-200">{formatCurrency(totalDeductions)}</strong>
          </div>
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5">
            <span className="block text-xs text-emerald-300">Investe via folha</span>
            <strong className="text-sm text-emerald-200">{formatCurrency(totalInvestmentViaPayroll)}</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nome do desconto"
            className="w-full rounded-lg border border-dark-border bg-dark-input px-3 py-2.5 text-sm text-dark-text transition-all focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as DeductionType)}
            className="w-full rounded-lg border border-dark-border bg-dark-input px-3 py-2.5 text-sm text-dark-text transition-all focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          >
            {(Object.entries(DEDUCTION_TYPE_LABELS) as [DeductionType, string][]).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className={`grid gap-2 ${isInvestment ? 'sm:grid-cols-2' : ''}`}>
          <div>
            <span className="mb-1.5 block text-xs font-medium text-dark-text-muted">Seu desconto</span>
            <CurrencyInput value={value} onChange={setValue} />
          </div>
          {isInvestment && (
            <div>
              <span className="mb-1.5 block text-xs font-medium text-dark-text-muted">Contrapartida da empresa</span>
              <CurrencyInput value={employerContribution} onChange={setEmployerContribution} />
            </div>
          )}
        </div>

        <button
          onClick={handleAdd}
          disabled={!name.trim() || value <= 0}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={16} />
          Adicionar desconto
        </button>

        {deductions.length > 0 && (
          <div className="space-y-2">
            {deductions.map((deduction) => {
              const isInvestmentDeduction = isInvestmentType(deduction.type)
              const contribution = deduction.employerContribution ?? 0

              return (
                <div key={deduction.id} className="rounded-lg bg-dark-surface px-3 py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="block truncate text-sm font-medium text-dark-text">{deduction.name}</span>
                        {isInvestmentDeduction && (
                          <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                            <TrendingUp size={10} />
                            Investimento
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-dark-text-muted">{DEDUCTION_TYPE_LABELS[deduction.type]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-amber-300">{formatCurrency(deduction.value)}</span>
                      <button
                        onClick={() => removeDeduction(deduction.id)}
                        className="rounded-lg p-1.5 text-dark-text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                        aria-label={`Remover ${deduction.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {isInvestmentDeduction && (
                    <div className="mt-3 grid gap-2 border-t border-dark-border-subtle pt-3 sm:grid-cols-[1fr_auto] sm:items-end">
                      <div>
                        <span className="mb-1.5 flex items-center gap-1.5 text-xs text-emerald-300">
                          <Handshake size={12} />
                          Empresa contribui
                        </span>
                        <CurrencyInput
                          value={contribution}
                          onChange={(next) => updateDeductionEmployerContribution(deduction.id, next)}
                        />
                      </div>
                      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-right">
                        <span className="block text-[11px] text-emerald-300">Total previdencia</span>
                        <strong className="text-sm text-emerald-100">
                          {formatCurrency(deduction.value + contribution)}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Card>
  )
}
