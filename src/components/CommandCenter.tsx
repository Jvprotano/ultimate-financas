import type { ReactNode } from 'react'
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CircleDollarSign, Gauge, PiggyBank, Shield, WalletCards } from 'lucide-react'
import { Card } from './Card'
import { HeaderMetric } from './HeaderMetric'
import type { BudgetBucket } from '../types'
import { formatCurrency } from '../utils'

interface Props {
  scenarioName: string
  salaryNet: number
  paycheckInAccount: number
  availableForBudget: number
  totalCosts: number
  totalWants: number
  totalDeductions: number
  directInvestmentTarget: number
  balanceAfterCosts: number
  budgetComparison: Record<string, BudgetBucket>
  emergencyFundCurrent: number
  fixedIncomeMonthlyAllocation: number
  creditCardPersonalTotal: number
  creditCardAvailableLimit: number
}

type Tone = 'primary' | 'emerald' | 'amber' | 'rose' | 'slate'

const toneClass: Record<Tone, { border: string; bg: string; text: string; icon: string }> = {
  primary: {
    border: 'border-primary-500/25',
    bg: 'bg-primary-500/10',
    text: 'text-primary-300',
    icon: 'bg-primary-500/15 text-primary-300',
  },
  emerald: {
    border: 'border-emerald-500/25',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-300',
    icon: 'bg-emerald-500/15 text-emerald-300',
  },
  amber: {
    border: 'border-amber-500/25',
    bg: 'bg-amber-500/10',
    text: 'text-amber-300',
    icon: 'bg-amber-500/15 text-amber-300',
  },
  rose: {
    border: 'border-rose-500/25',
    bg: 'bg-rose-500/10',
    text: 'text-rose-300',
    icon: 'bg-rose-500/15 text-rose-300',
  },
  slate: {
    border: 'border-white/10',
    bg: 'bg-white/[0.04]',
    text: 'text-dark-text-secondary',
    icon: 'bg-white/[0.06] text-dark-text-secondary',
  },
}

function percent(part: number, whole: number) {
  return whole > 0 ? (part / whole) * 100 : 0
}

function Metric({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string
  value: string
  detail: string
  icon: ReactNode
  tone: Tone
}) {
  const style = toneClass[tone]

  return (
    <div className={`rounded-lg border ${style.border} ${style.bg} p-3`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${style.icon}`}>{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-wide text-dark-text-muted">{label}</span>
      </div>
      <strong className={`block text-lg font-black leading-tight ${style.text}`}>{value}</strong>
      <span className="mt-1 block text-xs text-dark-text-muted">{detail}</span>
    </div>
  )
}

export function CommandCenter({
  scenarioName,
  salaryNet,
  paycheckInAccount,
  availableForBudget,
  totalCosts,
  totalWants,
  totalDeductions,
  directInvestmentTarget,
  balanceAfterCosts,
  budgetComparison,
  emergencyFundCurrent,
  fixedIncomeMonthlyAllocation,
  creditCardPersonalTotal,
  creditCardAvailableLimit,
}: Props) {
  const hasIncome = salaryNet > 0 && availableForBudget > 0
  const reserveTarget = totalCosts * 6
  const reserveRemaining = Math.max(0, reserveTarget - emergencyFundCurrent)
  const reserveProgress = reserveTarget > 0 ? percent(emergencyFundCurrent, reserveTarget) : 0
  const investmentActual = budgetComparison.investimentos.actual
  const needsOverage = Math.max(0, -budgetComparison.necessidades.diff)
  const wantsOverage = Math.max(0, -budgetComparison.desejos.diff)
  const investmentGap = Math.max(0, budgetComparison.investimentos.diff)

  const alerts: { title: string; detail: string; tone: Tone }[] = []

  if (!hasIncome) {
    alerts.push({
      title: 'Defina a renda',
      detail: 'Sem renda, as metas e percentuais não representam o mês.',
      tone: 'primary',
    })
  }
  if (balanceAfterCosts < 0) {
    alerts.push({
      title: 'Saldo negativo',
      detail: `Faltam ${formatCurrency(Math.abs(balanceAfterCosts))} para o plano fechar.`,
      tone: 'rose',
    })
  }
  if (needsOverage > 0) {
    alerts.push({
      title: 'Necessidades acima da meta',
      detail: `Revise custos fixos ou mova ${formatCurrency(needsOverage)} de outra caixa.`,
      tone: 'rose',
    })
  }
  if (wantsOverage > 0) {
    alerts.push({
      title: 'Desejos acima da meta',
      detail: `Corte ou mova ${formatCurrency(wantsOverage)} para desejos.`,
      tone: 'amber',
    })
  }
  if (investmentGap > 1) {
    alerts.push({
      title: 'Aporte incompleto',
      detail: `Ainda falta alocar ${formatCurrency(investmentGap)} em investimentos.`,
      tone: 'primary',
    })
  }
  if (reserveTarget > 0 && reserveRemaining > 0 && fixedIncomeMonthlyAllocation <= 0) {
    alerts.push({
      title: 'Reserva sem prazo',
      detail: 'Aloque renda fixa para calcular quando a reserva chega a 6 meses.',
      tone: 'amber',
    })
  }
  if (alerts.length === 0) {
    alerts.push({
      title: 'Plano coerente',
      detail: 'As principais caixas fecham sem saldo negativo.',
      tone: 'emerald',
    })
  }

  return (
    <Card
      title="Central do mês"
      icon={<Gauge size={18} />}
      accentColor="bg-primary-600"
      collapsible
      storageKey="command-center"
      headerExtra={<HeaderMetric amount={balanceAfterCosts} baseAmount={availableForBudget} label="Livre" tone={balanceAfterCosts >= 0 ? 'emerald' : 'rose'} />}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wide text-primary-300">{scenarioName}</span>
          <h2 className="mt-1 text-2xl font-black leading-tight text-dark-text">Central do mês</h2>
        </div>
        <div className="text-right">
          <span className="block text-xs text-dark-text-muted">Cai na conta</span>
          <strong className="text-lg text-dark-text">{formatCurrency(paycheckInAccount)}</strong>
          {totalDeductions > 0 && (
            <span className="block text-xs text-dark-text-muted">{formatCurrency(totalDeductions)} em folha</span>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Base"
          value={formatCurrency(availableForBudget)}
          detail="renda usada nas metas"
          icon={<CircleDollarSign size={17} />}
          tone="primary"
        />
        <Metric
          label="Fixos"
          value={formatCurrency(totalCosts)}
          detail={`${percent(totalCosts, availableForBudget).toFixed(0)}% da renda`}
          icon={<WalletCards size={17} />}
          tone={budgetComparison.necessidades.diff < 0 ? 'rose' : 'slate'}
        />
        <Metric
          label="Investir"
          value={formatCurrency(investmentActual)}
          detail={`${formatCurrency(directInvestmentTarget)} direto restante`}
          icon={<PiggyBank size={17} />}
          tone={investmentGap > 1 ? 'amber' : 'emerald'}
        />
        <Metric
          label="Livre"
          value={formatCurrency(balanceAfterCosts)}
          detail={`desejos: ${formatCurrency(totalWants)}`}
          icon={balanceAfterCosts >= 0 ? <ArrowUpRight size={17} /> : <ArrowDownRight size={17} />}
          tone={balanceAfterCosts >= 0 ? 'emerald' : 'rose'}
        />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px_260px]">
        <div className="grid gap-2 md:grid-cols-3">
          {alerts.slice(0, 3).map((alert) => {
            const style = toneClass[alert.tone]
            return (
              <div key={alert.title} className={`rounded-lg border ${style.border} ${style.bg} px-3 py-2.5`}>
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className={`mt-0.5 shrink-0 ${style.text}`} />
                  <div>
                    <strong className={`block text-sm ${style.text}`}>{alert.title}</strong>
                    <span className="mt-0.5 block text-xs leading-relaxed text-dark-text-secondary">{alert.detail}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="rounded-lg border border-slate-500/20 bg-slate-500/10 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-bold text-slate-100">
              <Shield size={15} />
              Reserva 6m
            </span>
            <span className="font-mono text-xs font-bold text-slate-200">{reserveProgress.toFixed(0)}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.08]">
            <div className="h-full rounded-full bg-slate-300" style={{ width: `${Math.min(100, reserveProgress)}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-200">
            {reserveTarget > 0
              ? `${formatCurrency(reserveRemaining)} faltando`
              : 'Cadastre custos fixos para calcular'}
          </p>
        </div>

        <div
          className={`rounded-lg border px-3 py-2.5 ${
            creditCardAvailableLimit >= 0
              ? 'border-sky-500/20 bg-sky-500/10'
              : 'border-rose-500/20 bg-rose-500/10'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-bold text-sky-100">
              <WalletCards size={15} />
              Cartões
            </span>
            <span className="text-xs font-bold text-dark-text-muted">{formatCurrency(creditCardPersonalTotal)}</span>
          </div>
          <p className={`mt-2 text-xs ${creditCardAvailableLimit >= 0 ? 'text-sky-200' : 'text-rose-200'}`}>
            {creditCardAvailableLimit >= 0
              ? `${formatCurrency(creditCardAvailableLimit)} do limite pessoal ainda livre`
              : `${formatCurrency(Math.abs(creditCardAvailableLimit))} acima do limite pessoal`}
          </p>
        </div>
      </div>
    </Card>
  )
}
