import { Shield } from 'lucide-react'
import { Card } from './Card'
import { CurrencyInput } from './CurrencyInput'
import { HeaderMetric } from './HeaderMetric'
import { Meter } from './ui'
import type { EmergencyFundState } from '../types'
import { formatCurrency, formatMonths } from '../utils'

interface Props {
  emergencyFund: EmergencyFundState
  setCurrent: (value: number) => void
  setTargetMonths: (months: number) => void
  totalCosts: number
  target: number
  remaining: number
  progress: number
  monthsToGoal: number
  fixedIncomeMonthlyAllocation: number
}

const MONTH_OPTIONS = [3, 6, 12]

export function EmergencyFund({
  emergencyFund,
  setCurrent,
  setTargetMonths,
  totalCosts,
  target,
  remaining,
  progress,
  monthsToGoal,
  fixedIncomeMonthlyAllocation,
}: Props) {
  return (
    <Card
      title="Reserva de emergência"
      icon={<Shield size={17} />}
      collapsible
      storageKey="emergency"
      headerExtra={
        target > 0 ? <HeaderMetric amount={emergencyFund.current} baseAmount={target} label="Guardado" tone="slate" /> : undefined
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-dark-text-secondary">Quanto você já tem</label>
            <CurrencyInput value={emergencyFund.current} onChange={setCurrent} />
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-dark-text-secondary">Meta em meses de custo</span>
            <div className="grid grid-cols-3 gap-1 rounded-lg border border-dark-border bg-dark-input p-1">
              {MONTH_OPTIONS.map((months) => (
                <button
                  key={months}
                  type="button"
                  onClick={() => setTargetMonths(months)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    emergencyFund.targetMonths === months
                      ? 'bg-dark-surface text-dark-text shadow-sm'
                      : 'text-dark-text-muted hover:text-dark-text'
                  }`}
                >
                  {months}m
                </button>
              ))}
            </div>
          </div>
        </div>

        {totalCosts > 0 ? (
          <>
            <div>
              <div className="mb-1.5 flex items-baseline justify-between text-xs">
                <span className="text-dark-text-muted">
                  Meta: {formatCurrency(target)} ({emergencyFund.targetMonths} meses de custos fixos)
                </span>
                <span className="font-semibold tabular-nums text-dark-text">{progress.toFixed(0)}%</span>
              </div>
              <Meter value={emergencyFund.current} max={target} color="#3987e5" height={8} />
            </div>

            <p className="text-sm leading-relaxed text-dark-text-secondary">
              {remaining <= 0 ? (
                <>Reserva completa. Aportes em renda fixa agora podem mirar outros objetivos.</>
              ) : fixedIncomeMonthlyAllocation > 0 ? (
                <>
                  Faltam <strong className="text-dark-text">{formatCurrency(remaining)}</strong>. No ritmo atual de{' '}
                  {formatCurrency(fixedIncomeMonthlyAllocation)}/mês em renda fixa, você completa em{' '}
                  <strong className="text-dark-text">{formatMonths(monthsToGoal)}</strong>.
                </>
              ) : (
                <>
                  Faltam <strong className="text-dark-text">{formatCurrency(remaining)}</strong>. Direcione parte do
                  aporte para renda fixa para estimar o prazo.
                </>
              )}
            </p>
          </>
        ) : (
          <p className="text-sm text-dark-text-muted">
            Cadastre os custos fixos para calcular a meta — a reserva ideal cobre alguns meses do seu custo de vida.
          </p>
        )}
      </div>
    </Card>
  )
}
