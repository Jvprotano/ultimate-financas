import { Clock3, Shield } from 'lucide-react'
import { Card } from './Card'
import { CurrencyInput } from './CurrencyInput'
import { HeaderMetric } from './HeaderMetric'
import { formatCurrency } from '../utils'

interface Props {
  totalCosts: number
  currentReserve: number
  setCurrentReserve: (value: number) => void
  fixedIncomeMonthlyAllocation: number
  availableForBudget: number
}

function formatMonths(months: number) {
  if (months <= 1) return '1 mes'
  if (months < 12) return `${months} meses`
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  if (remainingMonths === 0) return years === 1 ? '1 ano' : `${years} anos`
  return `${years}a ${remainingMonths}m`
}

export function EmergencyFund({
  totalCosts,
  currentReserve,
  setCurrentReserve,
  fixedIncomeMonthlyAllocation,
  availableForBudget,
}: Props) {
  const months = [3, 6, 12]
  const sixMonthReserve = totalCosts * 6
  const remainingToSixMonths = Math.max(0, sixMonthReserve - currentReserve)
  const progress = sixMonthReserve > 0 ? Math.min(100, (currentReserve / sixMonthReserve) * 100) : 0
  const monthsToGoal =
    remainingToSixMonths > 0 && fixedIncomeMonthlyAllocation > 0
      ? Math.ceil(remainingToSixMonths / fixedIncomeMonthlyAllocation)
      : 0

  return (
    <Card
      title="Reserva de Emergencia"
      icon={<Shield size={18} />}
      accentColor="bg-slate-600"
      collapsible
      storageKey="emergency"
      headerExtra={
        currentReserve > 0 || sixMonthReserve > 0 ? (
          <HeaderMetric amount={currentReserve} baseAmount={availableForBudget} label="Atual" tone="slate" />
        ) : undefined
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-dark-text-secondary">
              Valor atual da reserva
            </label>
            <CurrencyInput value={currentReserve} onChange={setCurrentReserve} />
          </div>
          <div className="rounded-lg border border-slate-500/20 bg-slate-500/10 px-3 py-2.5">
            <span className="block text-xs text-slate-300">Aporte mensal em renda fixa</span>
            <strong className="text-sm text-slate-100">{formatCurrency(fixedIncomeMonthlyAllocation)}</strong>
          </div>
        </div>

        {totalCosts > 0 ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              {months.map((month) => (
                <div key={month} className="rounded-lg border border-dark-border bg-dark-surface px-3 py-3 text-center">
                  <span className="block text-xs text-dark-text-muted">{month} meses</span>
                  <span className="mt-1 block text-base font-bold text-dark-text">{formatCurrency(totalCosts * month)}</span>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-dark-border bg-dark-surface p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-dark-text">Meta principal: 6 meses</h3>
                  <p className="text-xs text-dark-text-muted">
                    {formatCurrency(currentReserve)} de {formatCurrency(sixMonthReserve)}
                  </p>
                </div>
                <span className="font-mono text-sm font-bold text-slate-200">{progress.toFixed(0)}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.07]">
                <div className="h-full rounded-full bg-slate-300" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
                remainingToSixMonths <= 0
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                  : 'border-amber-500/20 bg-amber-500/10 text-amber-200'
              }`}
            >
              <Clock3 size={16} className="shrink-0" />
              {remainingToSixMonths <= 0 ? (
                <span className="text-sm font-medium">Reserva de 6 meses atingida.</span>
              ) : fixedIncomeMonthlyAllocation > 0 ? (
                <span className="text-sm">
                  Faltam {formatCurrency(remainingToSixMonths)}. Com a renda fixa atual, prazo estimado:{' '}
                  <strong>{formatMonths(monthsToGoal)}</strong>.
                </span>
              ) : (
                <span className="text-sm">
                  Faltam {formatCurrency(remainingToSixMonths)}. Aloque parte do aporte em renda fixa para calcular prazo.
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Cadastre os custos fixos para calcular as metas de 3, 6 e 12 meses.
          </div>
        )}
      </div>
    </Card>
  )
}
