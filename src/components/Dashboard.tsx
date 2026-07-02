import { AlertTriangle, ArrowRight, CheckCircle2, CreditCard, Shield } from 'lucide-react'
import type { ScenarioMetrics } from '../hooks/useFinancas'
import type { BudgetArea, EmergencyFundState, ScenarioSummary } from '../types'
import { BUDGET_AREA_COLORS, BUDGET_AREA_LABELS, CHART_PALETTE, COST_CATEGORY_COLORS, COST_CATEGORY_LABELS } from '../types/constants'
import { formatCurrency, formatMonths } from '../utils'
import { BarRow, Meter, SegmentedBar, StatTile } from './ui'

interface Props {
  metrics: ScenarioMetrics
  emergencyFund: EmergencyFundState
  scenarioSummaries: ScenarioSummary[]
  activeScenarioId: string
  onGoToPlanning: () => void
}

interface Alert {
  id: string
  title: string
  detail: string
  severity: 'ok' | 'warning' | 'critical'
}

const AREAS: BudgetArea[] = ['necessidades', 'desejos', 'investimentos']

function buildAlerts(metrics: ScenarioMetrics): Alert[] {
  const alerts: Alert[] = []
  const { budgetComparison, balanceAfterPlan, totalDiversificationPercentage, creditCardSummary, selectedModel } = metrics
  const modelTotal = selectedModel.necessidades + selectedModel.desejos + selectedModel.investimentos

  if (balanceAfterPlan < -0.005) {
    alerts.push({
      id: 'negative-balance',
      title: 'O plano não fecha',
      detail: `Faltam ${formatCurrency(-balanceAfterPlan)} para cobrir custos, desejos e aporte. Corte algo ou mude o modelo.`,
      severity: 'critical',
    })
  }
  if (budgetComparison.necessidades.diff < -0.005) {
    alerts.push({
      id: 'needs-over',
      title: 'Custos acima da meta',
      detail: `Seus custos fixos passam a meta de necessidades em ${formatCurrency(-budgetComparison.necessidades.diff)}.`,
      severity: 'critical',
    })
  }
  if (budgetComparison.desejos.diff < -0.005) {
    alerts.push({
      id: 'wants-over',
      title: 'Desejos acima da meta',
      detail: `O planejado em desejos passa a meta em ${formatCurrency(-budgetComparison.desejos.diff)}.`,
      severity: 'warning',
    })
  }
  if (modelTotal !== 100) {
    alerts.push({
      id: 'model-total',
      title: 'Modelo não soma 100%',
      detail: `As proporções personalizadas somam ${modelTotal}%. Ajuste no módulo de planejamento.`,
      severity: 'warning',
    })
  }
  if (totalDiversificationPercentage > 100) {
    alerts.push({
      id: 'diversification-over',
      title: 'Diversificação acima de 100%',
      detail: 'A soma das classes de investimento passa de 100%. Reduza algum peso.',
      severity: 'warning',
    })
  } else if (metrics.directInvestmentTarget > 0 && totalDiversificationPercentage < 100) {
    alerts.push({
      id: 'diversification-gap',
      title: 'Aporte sem destino completo',
      detail: `${100 - totalDiversificationPercentage}% do aporte direto ainda não tem classe de investimento definida.`,
      severity: 'warning',
    })
  }
  if (creditCardSummary.availablePersonalLimit < 0) {
    alerts.push({
      id: 'card-limit',
      title: 'Cartão acima do limite pessoal',
      detail: `A fatura pessoal passou seu teto em ${formatCurrency(-creditCardSummary.availablePersonalLimit)}.`,
      severity: 'critical',
    })
  }

  if (alerts.length === 0) {
    alerts.push({
      id: 'ok',
      title: 'Plano coerente',
      detail: 'Metas, gastos e aportes fecham sem saldo negativo.',
      severity: 'ok',
    })
  }

  const order = { critical: 0, warning: 1, ok: 2 }
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]).slice(0, 3)
}

const alertStyle: Record<Alert['severity'], { box: string; text: string }> = {
  critical: { box: 'border-rose-500/25 bg-rose-500/[0.07]', text: 'text-rose-300' },
  warning: { box: 'border-amber-500/25 bg-amber-500/[0.07]', text: 'text-amber-300' },
  ok: { box: 'border-primary-500/25 bg-primary-500/[0.07]', text: 'text-primary-300' },
}

export function Dashboard({ metrics, emergencyFund, scenarioSummaries, activeScenarioId, onGoToPlanning }: Props) {
  const {
    availableForBudget,
    paycheckInAccount,
    totalCosts,
    totalWantsAmount,
    totalPlannedInvestment,
    directInvestmentTarget,
    investmentDeductions,
    employerInvestmentContributions,
    savingsRate,
    balanceAfterPlan,
    budgetComparison,
    budgetAllocation,
    investmentAllocation,
    costsByCategory,
    emergencyFundTarget,
    emergencyFundRemaining,
    emergencyFundProgress,
    emergencyFundMonthsToGoal,
    fixedIncomeMonthlyAllocation,
    creditCardSummary,
  } = metrics

  if (availableForBudget <= 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dark-border bg-dark-card px-6 py-16 text-center">
        <h2 className="text-xl font-semibold tracking-tight text-dark-text">Comece pelo seu salário</h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-dark-text-muted">
          Informe sua renda e seus custos fixos na aba de planejamento. A visão geral monta o resto: metas por caixa,
          aporte do mês, reserva e cartões.
        </p>
        <button
          type="button"
          onClick={onGoToPlanning}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-500"
        >
          Ir para o planejamento
          <ArrowRight size={15} />
        </button>
      </div>
    )
  }

  const alerts = buildAlerts(metrics)
  const costRows = Array.from(costsByCategory.entries())
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value)
  const maxCost = costRows[0]?.value ?? 0

  const investmentSegments = [
    ...(investmentDeductions > 0
      ? [{ id: 'payroll', label: 'Via folha', value: investmentDeductions, color: CHART_PALETTE.violet }]
      : []),
    ...(employerInvestmentContributions > 0
      ? [{ id: 'employer', label: 'Empresa (bônus)', value: employerInvestmentContributions, color: CHART_PALETTE.muted }]
      : []),
    ...investmentAllocation
      .filter((slice) => slice.amount > 0)
      .map((slice) => ({ id: slice.id, label: slice.name, value: slice.amount, color: slice.color })),
  ]

  const otherScenarios = scenarioSummaries.filter((s) => s.id !== activeScenarioId)

  return (
    <div className="space-y-4">
      {/* Herói + KPIs */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
        <div className="flex flex-col justify-between rounded-xl border border-dark-border bg-dark-card px-5 py-5">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-dark-text-muted">
              Livre no mês, com o plano executado
            </span>
            <strong
              className={`mt-1 block text-4xl font-bold leading-tight tracking-tight tabular-nums ${
                balanceAfterPlan >= 0 ? 'text-dark-text' : 'text-rose-400'
              }`}
            >
              {formatCurrency(balanceAfterPlan)}
            </strong>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-dark-text-muted">
            {formatCurrency(paycheckInAccount)} na conta − {formatCurrency(totalCosts)} de custos −{' '}
            {formatCurrency(totalWantsAmount)} de desejos − {formatCurrency(directInvestmentTarget)} de aporte direto.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
          <StatTile label="Base do orçamento" value={formatCurrency(availableForBudget)} detail="renda usada nas metas" />
          <StatTile
            label="Custos fixos"
            value={formatCurrency(totalCosts)}
            detail={`${availableForBudget > 0 ? ((totalCosts / availableForBudget) * 100).toFixed(0) : 0}% da base`}
            tone={budgetComparison.necessidades.diff < 0 ? 'negative' : 'neutral'}
          />
          <StatTile
            label="Desejos planejados"
            value={formatCurrency(totalWantsAmount)}
            detail={`meta ${formatCurrency(budgetAllocation.desejos)}`}
            tone={budgetComparison.desejos.diff < 0 ? 'negative' : 'neutral'}
          />
          <StatTile
            label="Taxa de poupança"
            value={`${savingsRate.toFixed(0)}%`}
            detail={`${formatCurrency(totalPlannedInvestment)}/mês investidos`}
            tone="accent"
          />
        </div>
      </div>

      {/* Alertas */}
      <div className="grid gap-2.5 md:grid-cols-3">
        {alerts.map((alert) => {
          const style = alertStyle[alert.severity]
          const Icon = alert.severity === 'ok' ? CheckCircle2 : AlertTriangle
          return (
            <div key={alert.id} className={`rounded-xl border px-4 py-3 ${style.box}`}>
              <div className="flex items-start gap-2.5">
                <Icon size={15} className={`mt-0.5 shrink-0 ${style.text}`} />
                <div>
                  <strong className={`block text-sm font-semibold ${style.text}`}>{alert.title}</strong>
                  <span className="mt-0.5 block text-xs leading-relaxed text-dark-text-secondary">{alert.detail}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Metas por caixa */}
      <div className="rounded-xl border border-dark-border bg-dark-card p-5">
        <h3 className="text-sm font-semibold tracking-tight text-dark-text">Metas do modelo</h3>
        <div className="mt-4 grid gap-5 md:grid-cols-3">
          {AREAS.map((area) => {
            const bucket = budgetComparison[area]
            const over = bucket.diff < -0.005
            return (
              <div key={area}>
                <div className="mb-1.5 flex items-baseline justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-dark-text-secondary">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: BUDGET_AREA_COLORS[area] }} />
                    {BUDGET_AREA_LABELS[area]}
                  </span>
                  <span className="tabular-nums text-dark-text-muted">
                    <strong className={`font-semibold ${over ? 'text-rose-400' : 'text-dark-text'}`}>
                      {formatCurrency(bucket.actual)}
                    </strong>{' '}
                    / {formatCurrency(bucket.target)}
                  </span>
                </div>
                <Meter value={bucket.actual} max={bucket.target} color={BUDGET_AREA_COLORS[area]} />
                <p className={`mt-1.5 text-[11px] ${over ? 'text-rose-400' : 'text-dark-text-muted'}`}>
                  {area === 'investimentos'
                    ? 'meta coberta entre folha e aporte direto'
                    : over
                      ? `${formatCurrency(-bucket.diff)} acima da meta`
                      : `${formatCurrency(bucket.diff)} de folga`}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Gastos + Investimentos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-dark-border bg-dark-card p-5">
          <h3 className="text-sm font-semibold tracking-tight text-dark-text">Custos por categoria</h3>
          {costRows.length > 0 ? (
            <div className="mt-4 space-y-3">
              {costRows.map(({ category, value }) => (
                <BarRow
                  key={category}
                  label={COST_CATEGORY_LABELS[category]}
                  value={value}
                  max={maxCost}
                  color={COST_CATEGORY_COLORS[category]}
                  sublabel={`${totalCosts > 0 ? ((value / totalCosts) * 100).toFixed(0) : 0}%`}
                />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-dark-text-muted">Nenhum custo fixo cadastrado ainda.</p>
          )}
        </div>

        <div className="rounded-xl border border-dark-border bg-dark-card p-5">
          <h3 className="text-sm font-semibold tracking-tight text-dark-text">Investimento do mês</h3>
          {investmentSegments.length > 0 ? (
            <div className="mt-4">
              <SegmentedBar segments={investmentSegments} />
              <p className="mt-4 border-t border-dark-border-subtle pt-3 text-xs leading-relaxed text-dark-text-muted">
                Total investido por mês:{' '}
                <strong className="tabular-nums text-dark-text">
                  {formatCurrency(totalPlannedInvestment + employerInvestmentContributions)}
                </strong>
                {employerInvestmentContributions > 0 && ' (incluindo a contrapartida da empresa)'}.
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-dark-text-muted">
              Defina o modelo de orçamento e a diversificação para ver o aporte do mês.
            </p>
          )}
        </div>
      </div>

      {/* Reserva + Cartões */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-dark-border bg-dark-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-dark-text">
              <Shield size={15} className="text-dark-text-muted" />
              Reserva de emergência
            </h3>
            <span className="text-xs font-semibold tabular-nums text-dark-text">{emergencyFundProgress.toFixed(0)}%</span>
          </div>
          <div className="mt-3">
            <Meter value={emergencyFund.current} max={emergencyFundTarget} color={CHART_PALETTE.blue} height={8} />
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-dark-text-muted">
            {emergencyFundTarget <= 0
              ? 'Cadastre custos fixos para calcular a meta.'
              : emergencyFundRemaining <= 0
                ? `Meta de ${emergencyFund.targetMonths} meses completa.`
                : emergencyFundMonthsToGoal > 0
                  ? `${formatCurrency(emergencyFundRemaining)} para a meta de ${emergencyFund.targetMonths} meses — cerca de ${formatMonths(emergencyFundMonthsToGoal)} no ritmo atual de renda fixa.`
                  : `${formatCurrency(emergencyFundRemaining)} para a meta de ${emergencyFund.targetMonths} meses. Sem aporte em renda fixa, não há prazo estimado.`}
          </p>
          {fixedIncomeMonthlyAllocation <= 0 && emergencyFundRemaining > 0 && emergencyFundTarget > 0 && (
            <p className="mt-1 text-[11px] text-amber-300">Dica: direcione parte do aporte para renda fixa.</p>
          )}
        </div>

        <div className="rounded-xl border border-dark-border bg-dark-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-dark-text">
              <CreditCard size={15} className="text-dark-text-muted" />
              Cartões
            </h3>
            <span className="text-xs tabular-nums text-dark-text-muted">
              {creditCardSummary.currentEntriesCount} lançamentos
            </span>
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
            <div>
              <dt className="text-[11px] text-dark-text-muted">Fatura atual</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-dark-text">
                {formatCurrency(creditCardSummary.currentTotal)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-dark-text-muted">Sua parte</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-dark-text">
                {formatCurrency(creditCardSummary.currentPersonalTotal)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-dark-text-muted">Próxima fatura</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-dark-text">
                {formatCurrency(creditCardSummary.nextTotal)}
              </dd>
            </div>
          </dl>
          <p
            className={`mt-3 border-t border-dark-border-subtle pt-3 text-xs ${
              creditCardSummary.availablePersonalLimit >= 0 ? 'text-dark-text-muted' : 'text-rose-300'
            }`}
          >
            {creditCardSummary.availablePersonalLimit >= 0
              ? `${formatCurrency(creditCardSummary.availablePersonalLimit)} do seu limite pessoal ainda livres.`
              : `${formatCurrency(-creditCardSummary.availablePersonalLimit)} acima do seu limite pessoal.`}
          </p>
        </div>
      </div>

      {/* Comparação de cenários */}
      {otherScenarios.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-dark-border bg-dark-card">
          <h3 className="border-b border-dark-border-subtle px-5 py-4 text-sm font-semibold tracking-tight text-dark-text">
            Comparação de cenários
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-dark-text-muted">
                  <th className="px-5 py-2.5 font-medium">Cenário</th>
                  <th className="px-4 py-2.5 text-right font-medium">Base</th>
                  <th className="px-4 py-2.5 text-right font-medium">Custos</th>
                  <th className="px-4 py-2.5 text-right font-medium">Desejos</th>
                  <th className="px-4 py-2.5 text-right font-medium">Investe</th>
                  <th className="px-4 py-2.5 text-right font-medium">Poupança</th>
                  <th className="px-5 py-2.5 text-right font-medium">Livre</th>
                </tr>
              </thead>
              <tbody>
                {scenarioSummaries.map((summary) => {
                  const isActive = summary.id === activeScenarioId
                  return (
                    <tr
                      key={summary.id}
                      className={`border-t border-dark-border-subtle ${isActive ? 'bg-primary-500/[0.06]' : ''}`}
                    >
                      <td className="px-5 py-2.5 font-medium text-dark-text">
                        {summary.name}
                        {isActive && <span className="ml-2 text-[10px] font-semibold uppercase text-primary-400">ativo</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-dark-text-secondary">
                        {formatCurrency(summary.availableForBudget)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-dark-text-secondary">
                        {formatCurrency(summary.totalCosts)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-dark-text-secondary">
                        {formatCurrency(summary.totalWantsAmount)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-dark-text-secondary">
                        {formatCurrency(summary.totalPlannedInvestment)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-dark-text-secondary">
                        {summary.savingsRate.toFixed(0)}%
                      </td>
                      <td
                        className={`px-5 py-2.5 text-right font-semibold tabular-nums ${
                          summary.balanceAfterPlan >= 0 ? 'text-primary-400' : 'text-rose-400'
                        }`}
                      >
                        {formatCurrency(summary.balanceAfterPlan)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
