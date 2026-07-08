import { ArrowRight, Shield } from 'lucide-react'
import { Card } from './Card'
import { HeaderMetric } from './HeaderMetric'
import { Meter } from './ui'
import type { EmergencyFundState } from '../types'
import { formatCurrency, formatMonths } from '../utils'

interface Props {
  emergencyFund: EmergencyFundState
  totalCosts: number
  target: number
  remaining: number
  progress: number
  monthsToGoal: number
  fixedIncomeMonthlyAllocation: number
  onManage: () => void
}

// Card apenas de visualização — o gerenciamento da reserva (aportes, retiradas,
// meta e histórico) vive na aba Investimentos, junto do restante do patrimônio.
export function EmergencyFund({
  emergencyFund,
  totalCosts,
  target,
  remaining,
  progress,
  monthsToGoal,
  fixedIncomeMonthlyAllocation,
  onManage,
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
        <div className="rounded-xl border border-dark-border bg-dark-surface/60 px-4 py-3">
          <span className="block text-xs font-medium uppercase tracking-wide text-dark-text-muted">Saldo guardado</span>
          <strong className="mt-0.5 block text-2xl font-semibold tabular-nums text-dark-text">
            {formatCurrency(emergencyFund.current)}
          </strong>
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
              <Meter value={Math.min(emergencyFund.current, target)} max={target} color="#3987e5" height={8} />
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

        <button
          type="button"
          onClick={onManage}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-400 transition-colors hover:text-primary-300"
        >
          Gerenciar em Investimentos
          <ArrowRight size={15} />
        </button>
      </div>
    </Card>
  )
}
