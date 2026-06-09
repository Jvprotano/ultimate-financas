import type { ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  CircleDollarSign,
  Gauge,
  Landmark,
  Lightbulb,
  PiggyBank,
  Route,
  ShieldCheck,
  WalletCards,
} from 'lucide-react'
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
  investmentDeductions: number
  directInvestmentTarget: number
  balanceAfterCosts: number
  budgetComparison: Record<string, BudgetBucket>
  totalWantsPercentage: number
  totalDiversificationPercentage: number
  costsCount: number
  wantsCount: number
  deductionsCount: number
}

type Tone = 'primary' | 'emerald' | 'amber' | 'rose' | 'slate'

const toneStyles: Record<
  Tone,
  {
    border: string
    bg: string
    text: string
    soft: string
    fill: string
    hex: string
  }
> = {
  primary: {
    border: 'border-primary-500/35',
    bg: 'bg-primary-500/10',
    text: 'text-primary-300',
    soft: 'bg-primary-500/15',
    fill: 'bg-primary-500',
    hex: '#14b8a6',
  },
  emerald: {
    border: 'border-emerald-500/35',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-300',
    soft: 'bg-emerald-500/15',
    fill: 'bg-emerald-500',
    hex: '#22c55e',
  },
  amber: {
    border: 'border-amber-500/35',
    bg: 'bg-amber-500/10',
    text: 'text-amber-300',
    soft: 'bg-amber-500/15',
    fill: 'bg-amber-500',
    hex: '#f59e0b',
  },
  rose: {
    border: 'border-rose-500/35',
    bg: 'bg-rose-500/10',
    text: 'text-rose-300',
    soft: 'bg-rose-500/15',
    fill: 'bg-rose-500',
    hex: '#f43f5e',
  },
  slate: {
    border: 'border-white/10',
    bg: 'bg-white/[0.04]',
    text: 'text-dark-text-secondary',
    soft: 'bg-white/[0.06]',
    fill: 'bg-dark-text-muted',
    hex: '#94a3b8',
  },
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function percent(part: number, whole: number) {
  return whole > 0 ? (part / whole) * 100 : 0
}

function formatWholePercent(value: number) {
  return `${Math.round(value)}%`
}

function MetricTile({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string
  value: string
  sub: string
  icon: ReactNode
  tone: Tone
}) {
  const styles = toneStyles[tone]

  return (
    <div className={`rounded-lg border ${styles.border} ${styles.bg} p-4`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${styles.soft} ${styles.text}`}>
          {icon}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-dark-text-muted">{label}</span>
      </div>
      <strong className="block text-xl font-black leading-tight text-dark-text">{value}</strong>
      <span className="mt-1 block text-xs text-dark-text-muted">{sub}</span>
    </div>
  )
}

function ActionItem({
  title,
  detail,
  tone,
  icon,
}: {
  title: string
  detail: string
  tone: Tone
  icon: ReactNode
}) {
  const styles = toneStyles[tone]

  return (
    <li className={`flex gap-3 rounded-lg border ${styles.border} ${styles.bg} p-3`}>
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${styles.soft} ${styles.text}`}>
        {icon}
      </span>
      <span className="min-w-0">
        <strong className="block text-sm font-bold text-dark-text">{title}</strong>
        <span className="mt-0.5 block text-xs leading-relaxed text-dark-text-secondary">{detail}</span>
      </span>
    </li>
  )
}

function FlowRow({
  label,
  amount,
  percentage,
  tone,
}: {
  label: string
  amount: number
  percentage: number
  tone: Tone
}) {
  const styles = toneStyles[tone]
  const width = clamp(percentage, 0, 100)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-dark-text-secondary">{label}</span>
        <span className="font-mono font-semibold text-dark-text">{formatCurrency(amount)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full ${styles.fill}`} style={{ width: `${width}%` }} />
      </div>
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
  investmentDeductions,
  directInvestmentTarget,
  balanceAfterCosts,
  budgetComparison,
  totalWantsPercentage,
  totalDiversificationPercentage,
  costsCount,
  wantsCount,
  deductionsCount,
}: Props) {
  const hasIncome = salaryNet > 0 && availableForBudget > 0
  const needsPct = percent(budgetComparison.necessidades.actual, budgetComparison.necessidades.target)
  const investmentsPct = percent(
    budgetComparison.investimentos.actual,
    budgetComparison.investimentos.target,
  )
  const committedMoney =
    totalCosts + totalWants + budgetComparison.investimentos.actual
  const committedPct = percent(committedMoney, availableForBudget)

  const score = hasIncome
    ? Math.round(
        clamp(
          20 +
            clamp(100 - Math.max(0, needsPct - 100) * 1.2, 0, 100) * 0.24 +
            clamp(investmentsPct, 0, 100) * 0.24 +
            (balanceAfterCosts >= 0
              ? 20
              : clamp(20 + percent(balanceAfterCosts, availableForBudget) * 0.8, 0, 20)) +
            (totalWantsPercentage <= 100 ? 12 : clamp(12 - (totalWantsPercentage - 100) * 0.2, 0, 12)),
          0,
          100,
        ),
      )
    : 0

  const scoreTone: Tone = score >= 80 ? 'emerald' : score >= 60 ? 'primary' : score >= 40 ? 'amber' : 'rose'
  const scoreColor = toneStyles[scoreTone].hex
  const verdict = !hasIncome
    ? 'Comece pelo salario'
    : balanceAfterCosts < 0
      ? 'Fluxo negativo'
      : needsPct > 100
        ? 'Custos pressionados'
        : investmentsPct < 95
          ? 'Aporte incompleto'
          : 'Plano em dia'
  const verdictDetail = !hasIncome
    ? 'Digite sua renda para liberar diagnostico, metas e aportes.'
    : balanceAfterCosts < 0
      ? `Faltam ${formatCurrency(Math.abs(balanceAfterCosts))} para fechar o mes.`
      : needsPct > 100
        ? `Necessidades estao usando ${formatWholePercent(needsPct)} da meta.`
        : investmentsPct < 95
          ? `Ainda falta alocar ${formatCurrency(Math.max(0, budgetComparison.investimentos.diff))} em investimentos.`
          : 'Seu dinheiro esta distribuido sem romper as metas principais.'

  const actionItems = []

  if (!hasIncome) {
    actionItems.push({
      title: 'Definir renda de referencia',
      detail: 'Comece pelo valor que caiu na conta ou pelo salario antes dos descontos.',
      tone: 'primary' as Tone,
      icon: <WalletCards size={16} />,
    })
  } else {
    if (costsCount === 0) {
      actionItems.push({
        title: 'Mapear custos fixos',
        detail: 'Sem custos cadastrados, o score fica otimista demais para uma decisao mensal.',
        tone: 'amber' as Tone,
        icon: <Landmark size={16} />,
      })
    }

    if (balanceAfterCosts < 0) {
      actionItems.push({
        title: 'Fechar o saldo livre',
        detail: `Recupere ${formatCurrency(Math.abs(balanceAfterCosts))} entre custos, desejos ou aporte direto.`,
        tone: 'rose' as Tone,
        icon: <AlertTriangle size={16} />,
      })
    }

    if (needsPct > 100) {
      actionItems.push({
        title: 'Revisar necessidades',
        detail: `O bloco essencial passou ${formatCurrency(Math.abs(budgetComparison.necessidades.diff))} da meta.`,
        tone: 'rose' as Tone,
        icon: <ArrowUpRight size={16} />,
      })
    }

    if (totalWantsPercentage > 100) {
      actionItems.push({
        title: 'Reduzir desejos alocados',
        detail: `Os sliders somam ${formatWholePercent(totalWantsPercentage)}. Volte para 100% ou menos.`,
        tone: 'amber' as Tone,
        icon: <ArrowDownRight size={16} />,
      })
    }

    if (budgetComparison.investimentos.diff > 1) {
      actionItems.push({
        title: 'Completar aporte planejado',
        detail: `A meta pede mais ${formatCurrency(budgetComparison.investimentos.diff)} em investimento.`,
        tone: 'primary' as Tone,
        icon: <PiggyBank size={16} />,
      })
    }

    if (totalDiversificationPercentage < 100 && directInvestmentTarget > 0) {
      actionItems.push({
        title: 'Distribuir carteira',
        detail: `Sua diversificacao soma ${formatWholePercent(totalDiversificationPercentage)} do aporte direto.`,
        tone: 'primary' as Tone,
        icon: <Route size={16} />,
      })
    }

    if (actionItems.length === 0) {
      actionItems.push({
        title: 'Manter o plano vivo',
        detail: 'Duplique o cenario antes de testar aumento, troca de emprego ou novo custo fixo.',
        tone: 'emerald' as Tone,
        icon: <BadgeCheck size={16} />,
      })
    }
  }

  const visibleActions = actionItems.slice(0, 4)

  return (
    <section className="relative overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(11,15,14,0.98),rgba(17,24,23,0.95))] p-4 shadow-2xl shadow-black/30 sm:p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(20,184,166,0.18),transparent_34%),radial-gradient(circle_at_92%_8%,rgba(245,158,11,0.13),transparent_28%),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[length:auto,auto,52px_52px,52px_52px]" />

      <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary-300">
                <Gauge size={13} />
                {scenarioName}
              </span>
              <h2 className="mt-4 max-w-3xl text-3xl font-black leading-tight text-dark-text sm:text-4xl">
                Painel de decisao do mes
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-dark-text-secondary">
                Um resumo direto do que esta travando, sobrando ou pedindo acao antes de voce mexer nos detalhes.
              </p>
            </div>

            <div className={`rounded-lg border ${toneStyles[scoreTone].border} ${toneStyles[scoreTone].bg} px-4 py-3 text-right`}>
              <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-dark-text-muted">
                Diagnostico
              </span>
              <strong className={`mt-1 block text-lg font-black ${toneStyles[scoreTone].text}`}>{verdict}</strong>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              label="Conta"
              value={formatCurrency(paycheckInAccount)}
              sub={totalDeductions > 0 ? `${formatCurrency(totalDeductions)} tratados na folha` : 'sem descontos na folha'}
              icon={<WalletCards size={18} />}
              tone="primary"
            />
            <MetricTile
              label="Base"
              value={formatCurrency(availableForBudget)}
              sub="valor usado nas metas"
              icon={<CircleDollarSign size={18} />}
              tone="emerald"
            />
            <MetricTile
              label="Aporte"
              value={formatCurrency(budgetComparison.investimentos.actual)}
              sub={`${formatWholePercent(investmentsPct)} da meta de investimento`}
              icon={<PiggyBank size={18} />}
              tone="amber"
            />
            <MetricTile
              label="Livre"
              value={formatCurrency(balanceAfterCosts)}
              sub="apos custos, desejos e aporte"
              icon={balanceAfterCosts >= 0 ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
              tone={balanceAfterCosts >= 0 ? 'emerald' : 'rose'}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="rounded-lg border border-white/10 bg-black/15 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-dark-text">Fluxo do dinheiro</h3>
                  <p className="text-xs text-dark-text-muted">
                    {formatWholePercent(committedPct)} da base ja tem destino.
                  </p>
                </div>
                <ShieldCheck size={18} className="text-primary-300" />
              </div>
              <div className="space-y-3">
                <FlowRow label="Necessidades" amount={totalCosts} percentage={percent(totalCosts, availableForBudget)} tone="rose" />
                <FlowRow label="Desejos" amount={totalWants} percentage={percent(totalWants, availableForBudget)} tone="primary" />
                <FlowRow
                  label={investmentDeductions > 0 ? 'Investimentos + folha' : 'Investimentos'}
                  amount={budgetComparison.investimentos.actual}
                  percentage={percent(budgetComparison.investimentos.actual, availableForBudget)}
                  tone="emerald"
                />
                <FlowRow
                  label="Livre"
                  amount={Math.max(0, balanceAfterCosts)}
                  percentage={percent(Math.max(0, balanceAfterCosts), availableForBudget)}
                  tone="slate"
                />
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-black/15 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Lightbulb size={18} className="text-amber-300" />
                <h3 className="text-sm font-bold text-dark-text">Leitura rapida</h3>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-dark-text-muted">Custos</dt>
                  <dd className="font-mono font-bold text-rose-300">{costsCount} itens</dd>
                </div>
                <div>
                  <dt className="text-xs text-dark-text-muted">Desejos</dt>
                  <dd className="font-mono font-bold text-primary-300">{wantsCount} itens</dd>
                </div>
                <div>
                  <dt className="text-xs text-dark-text-muted">Descontos</dt>
                  <dd className="font-mono font-bold text-amber-300">{deductionsCount} itens</dd>
                </div>
                <div>
                  <dt className="text-xs text-dark-text-muted">Aporte direto</dt>
                  <dd className="font-mono font-bold text-emerald-300">{formatCurrency(directInvestmentTarget)}</dd>
                </div>
              </dl>
              <p className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs leading-relaxed text-dark-text-secondary">
                {verdictDetail}
              </p>
            </div>
          </div>
        </div>

        <aside className="rounded-lg border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-dark-text-muted">
                Score
              </span>
              <strong className="mt-1 block text-lg font-black text-dark-text">Saude financeira</strong>
            </div>
            <div
              className="grid h-28 w-28 shrink-0 place-items-center rounded-full"
              style={{
                background: `conic-gradient(${scoreColor} ${score * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
              }}
            >
              <div className="grid h-[88px] w-[88px] place-items-center rounded-full bg-[#0b0f0e]">
                <span className={`font-mono text-3xl font-black ${toneStyles[scoreTone].text}`}>{score}</span>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-dark-text">
              <Route size={16} className="text-primary-300" />
              Proximas acoes
            </h3>
            <ul className="space-y-2">
              {visibleActions.map((action) => (
                <ActionItem key={action.title} {...action} />
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </section>
  )
}
