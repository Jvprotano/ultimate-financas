import { AlertTriangle, ArrowRight, CheckCircle2, CreditCard, Shield } from 'lucide-react'
import { CashFlowPanel } from './CashFlowPanel'
import {
  BarRow,
  Meter,
  MeterWithMarker,
  Panel,
  PanelHeader,
  SegmentedBar,
  StatTile,
} from './ui'
import { formatCurrency, formatMonths } from '../lib/format'
import { useFinancasStore } from '../context/financasStore'
import type { ScenarioMetrics } from '../hooks/useFinancas'
import type { BudgetArea, CashFlowSummary, CreditCardSummary, DebtsSummary } from '../types'
import {
  BUDGET_AREAS,
  BUDGET_AREA_COLORS,
  BUDGET_AREA_LABELS,
  CHART_PALETTE,
  COST_CATEGORY_COLORS,
  COST_CATEGORY_LABELS,
} from '../types/constants'

interface Alert {
  id: string
  title: string
  detail: string
  severity: 'ok' | 'warning' | 'critical'
}

function buildAlerts(
  metrics: ScenarioMetrics,
  creditCardSummary: CreditCardSummary,
  cashFlow: CashFlowSummary,
  debtsSummary: DebtsSummary,
): Alert[] {
  const alerts: Alert[] = []
  const { budgetComparison, balanceAfterPlan, totalDiversificationPercentage, selectedModel } =
    metrics
  const modelTotal = selectedModel.necessidades + selectedModel.desejos + selectedModel.investimentos

  if (cashFlow.leftover < -0.005) {
    alerts.push({
      id: 'cash-negative',
      title: 'O caixa do mês não fecha',
      detail: `Faltam ${formatCurrency(-cashFlow.leftover)} para pagar a fatura que vence, o que sai da conta e o aporte. Esta é a conta do extrato, não do orçamento.`,
      severity: 'critical',
    })
  }
  if (cashFlow.plannedOnCard > 0 && cashFlow.cardPlanGap > 0.005) {
    alerts.push({
      id: 'card-over-plan',
      title: 'A fatura passou do que o plano previa',
      detail: `Você planejou ${formatCurrency(cashFlow.plannedOnCard)} no cartão e a fatura está em ${formatCurrency(cashFlow.invoiceToPay)} — ${formatCurrency(cashFlow.cardPlanGap)} sem lugar no orçamento.`,
      severity: 'warning',
    })
  }
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
  if (budgetComparison.desejos.realized > budgetComparison.desejos.target + 0.005) {
    alerts.push({
      id: 'wants-realized-over',
      title: 'Cartão estourou os desejos',
      detail: `Você já gastou ${formatCurrency(budgetComparison.desejos.realized)} em desejos no cartão — ${formatCurrency(budgetComparison.desejos.realized - budgetComparison.desejos.target)} acima da meta do mês.`,
      severity: 'critical',
    })
  } else if (budgetComparison.desejos.diff < -0.005) {
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
  // Só dívida sem contrapartida vira alerta. Os juros de um financiamento
  // imobiliário são o preço da moradia — não um problema a resolver.
  if (debtsSummary.unsecured.costliest && debtsSummary.unsecured.monthlyInterest > 0) {
    const share =
      metrics.availableForBudget > 0
        ? (debtsSummary.unsecured.monthlyInterest / metrics.availableForBudget) * 100
        : 0
    alerts.push({
      id: 'debt-interest',
      title: 'Juros correndo todo mês',
      detail: `${formatCurrency(debtsSummary.unsecured.monthlyInterest)} do que você paga é só juro — ${share.toFixed(0)}% da base do orçamento. A mais cara é ${debtsSummary.unsecured.costliest.name}, a ${debtsSummary.unsecured.costliest.annualRatePct.toFixed(1)}% a.a.`,
      severity: share > 5 ? 'critical' : 'warning',
    })
  }
  // Um financiamento sem bem cadastrado destrói a leitura do patrimônio.
  const orphanFinancing = debtsSummary.debts.filter(
    (debt) => !debt.isSettled && debt.kind === 'financiamento' && !debt.isSecured,
  )
  if (orphanFinancing.length > 0) {
    alerts.push({
      id: 'debt-without-asset',
      title: 'Financiamento sem o bem cadastrado',
      detail: `${orphanFinancing.map((debt) => debt.name).join(', ')} entra no balanço como dívida pura. Cadastre o imóvel ou veículo em Patrimônio › Bens e ligue os dois — sem isso, seu patrimônio líquido aparece muito abaixo do real.`,
      severity: 'warning',
    })
  }
  if (creditCardSummary.unclassifiedPersonal > 0) {
    alerts.push({
      id: 'card-unclassified',
      title: 'Compras sem área do orçamento',
      detail: `${formatCurrency(creditCardSummary.unclassifiedPersonal)} da sua fatura ainda não estão marcados como necessidade, desejo ou investimento.`,
      severity: 'warning',
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

export function Dashboard({
  onGoToPlanning,
  onGoToHistory,
}: {
  onGoToPlanning: () => void
  onGoToHistory: () => void
}) {
  const store = useFinancasStore()
  const metrics = store.metrics
  const creditCardSummary = store.cards.summary
  const cashFlow = store.cashFlow
  const { emergencyFund, summary: investmentsSummary } = store.investments
  const { scenarioSummaries } = store
  const activeScenarioId = store.scenarios.activeScenarioId
  const { points, stats } = store.history

  const {
    availableForBudget,
    paycheckInAccount,
    totalCosts,
    totalCostsShared,
    totalWantsAmount,
    totalPlannedInvestment,
    directInvestmentTarget,
    investmentDeductions,
    employerInvestmentContributions,
    savingsRate,
    balanceAfterPlan,
    budgetComparison,
    investmentAllocation,
    costsByCategory,
    emergencyFundTarget,
    emergencyFundRemaining,
    emergencyFundProgress,
    emergencyFundMonthsToGoal,
    fixedIncomeMonthlyAllocation,
  } = metrics

  if (availableForBudget <= 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dark-border bg-dark-card px-6 py-16 text-center">
        <h2 className="text-xl font-semibold tracking-tight text-dark-text">
          Comece pelo seu salário
        </h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-dark-text-muted">
          Informe sua renda e seus custos fixos na aba de planejamento. A visão geral monta o resto:
          metas por caixa, aporte do mês, reserva e cartões.
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

  const alerts = buildAlerts(metrics, creditCardSummary, cashFlow, store.debts.summary)
  const costRows = Array.from(costsByCategory.entries())
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value)
  const maxCost = costRows[0]?.value ?? 0

  const investmentSegments = [
    ...(investmentDeductions > 0
      ? [
          {
            id: 'payroll',
            label: 'Via folha',
            value: investmentDeductions,
            color: CHART_PALETTE.violet,
          },
        ]
      : []),
    ...(employerInvestmentContributions > 0
      ? [
          {
            id: 'employer',
            label: 'Empresa (bônus)',
            value: employerInvestmentContributions,
            color: CHART_PALETTE.muted,
          },
        ]
      : []),
    ...investmentAllocation
      .filter((slice) => slice.amount > 0)
      .map((slice) => ({
        id: slice.id,
        label: slice.name,
        value: slice.amount,
        color: slice.color,
      })),
  ]

  const otherScenarios = scenarioSummaries.filter((s) => s.id !== activeScenarioId)
  const lastMonth = points.length > 0 ? points[points.length - 1] : null

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
            {formatCurrency(totalWantsAmount)} de desejos − {formatCurrency(directInvestmentTarget)}{' '}
            de aporte direto.
            {totalCostsShared > 0 && (
              <>
                {' '}
                Os custos já descontam {formatCurrency(totalCostsShared)} bancados por terceiros.
              </>
            )}
          </p>
          <p className="mt-2 border-t border-dark-border-subtle pt-2 text-xs leading-relaxed text-dark-text-muted">
            No extrato deste mês sobram{' '}
            <strong className={cashFlow.leftover >= 0 ? 'text-dark-text' : 'text-rose-400'}>
              {formatCurrency(cashFlow.leftover)}
            </strong>
            : lá quem sai é a fatura que vence agora, que é o gasto do ciclo passado.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
          <StatTile
            label="Base do orçamento"
            value={formatCurrency(availableForBudget)}
            detail="renda usada nas metas"
          />
          {/* O destaque é o dinheiro. O líquido total, que carrega bens e o
              financiamento deles, é a leitura secundária no detalhe. */}
          <StatTile
            label="Patrimônio financeiro"
            value={formatCurrency(investmentsSummary.financialNetWorth)}
            detail={
              investmentsSummary.physicalAssets > 0
                ? `${formatCurrency(investmentsSummary.netWorth)} de líquido total, com bens e financiamento`
                : investmentsSummary.liabilities > 0
                  ? `${formatCurrency(investmentsSummary.financialAssets)} em ativos − ${formatCurrency(investmentsSummary.liabilities)} de dívida`
                  : lastMonth && stats.months > 1
                    ? `${stats.netWorthGrowth >= 0 ? '+' : '−'} ${formatCurrency(Math.abs(stats.netWorthGrowth))} no histórico`
                    : 'investimentos + reserva + metas'
            }
            tone={investmentsSummary.financialNetWorth >= 0 ? 'accent' : 'negative'}
          />
          <StatTile
            label="Custos fixos"
            value={formatCurrency(totalCosts)}
            detail={`${((totalCosts / availableForBudget) * 100).toFixed(0)}% da base`}
            tone={budgetComparison.necessidades.diff < 0 ? 'negative' : 'neutral'}
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
                  <strong className={`block text-sm font-semibold ${style.text}`}>
                    {alert.title}
                  </strong>
                  <span className="mt-0.5 block text-xs leading-relaxed text-dark-text-secondary">
                    {alert.detail}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Caixa do mês */}
      <CashFlowPanel />

      {/* Metas por caixa */}
      <Panel>
        <PanelHeader
          title="Metas do modelo"
          description="A barra é o planejado; o traço marca o que já saiu no cartão neste ciclo — o mesmo dinheiro, visto como realizado."
        />
        <div className="mt-4 grid gap-5 md:grid-cols-3">
          {BUDGET_AREAS.map((area: BudgetArea) => {
            const bucket = budgetComparison[area]
            const over = bucket.diff < -0.005
            return (
              <div key={area}>
                <div className="mb-1.5 flex items-baseline justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-dark-text-secondary">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: BUDGET_AREA_COLORS[area] }}
                    />
                    {BUDGET_AREA_LABELS[area]}
                  </span>
                  <span className="tabular-nums text-dark-text-muted">
                    <strong className={`font-semibold ${over ? 'text-rose-400' : 'text-dark-text'}`}>
                      {formatCurrency(bucket.actual)}
                    </strong>{' '}
                    / {formatCurrency(bucket.target)}
                  </span>
                </div>
                <MeterWithMarker
                  value={bucket.actual}
                  marker={bucket.realized}
                  max={bucket.target}
                  color={BUDGET_AREA_COLORS[area]}
                  markerLabel={`Já gasto no cartão: ${formatCurrency(bucket.realized)}`}
                />
                <p className={`mt-1.5 text-[11px] ${over ? 'text-rose-400' : 'text-dark-text-muted'}`}>
                  {area === 'investimentos'
                    ? 'meta coberta entre folha e aporte direto'
                    : over
                      ? `${formatCurrency(-bucket.diff)} acima da meta`
                      : `${formatCurrency(bucket.diff)} de folga`}
                  {bucket.realized > 0 && area !== 'investimentos' && (
                    <> · {formatCurrency(bucket.realized)} no cartão</>
                  )}
                </p>
              </div>
            )
          })}
        </div>
      </Panel>

      {/* Gastos + Investimentos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Custos por categoria" />
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
        </Panel>

        <Panel>
          <PanelHeader title="Investimento do mês" />
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
        </Panel>
      </div>

      {/* Reserva + Cartões */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-dark-text">
              <Shield size={15} className="text-dark-text-muted" />
              Reserva de emergência
            </h3>
            <span className="text-xs font-semibold tabular-nums text-dark-text">
              {emergencyFundProgress.toFixed(0)}%
            </span>
          </div>
          <div className="mt-3">
            {/* Passar da meta é bom: a barra enche e mantém a cor. */}
            <Meter
              value={emergencyFund.current}
              max={emergencyFundTarget}
              color={CHART_PALETTE.blue}
              height={8}
              overIsBad={false}
            />
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-dark-text-muted">
            {emergencyFundTarget <= 0
              ? 'Cadastre custos fixos para calcular a meta.'
              : emergencyFundRemaining <= 0
                ? `Meta de ${emergencyFund.targetMonths} meses completa.`
                : emergencyFundMonthsToGoal > 0
                  ? `${formatCurrency(emergencyFundRemaining)} para a meta de ${emergencyFund.targetMonths} meses — cerca de ${formatMonths(emergencyFundMonthsToGoal)} no ritmo atual de renda fixa.`
                  : `${formatCurrency(emergencyFundRemaining)} para a meta de ${emergencyFund.targetMonths} meses. Sem aporte em renda fixa, não há prazo estimado.`}
            {metrics.emergencyFundUsesHistory && emergencyFundTarget > 0 && (
              <>
                {' '}
                A meta usa o custo médio real de {formatCurrency(metrics.emergencyFundBaseCosts)}
                /mês dos meses que você fechou, não o planejado.
              </>
            )}
          </p>
          {fixedIncomeMonthlyAllocation <= 0 && emergencyFundRemaining > 0 && emergencyFundTarget > 0 && (
            <p className="mt-1 text-[11px] text-amber-300">
              Dica: direcione parte do aporte para renda fixa.
            </p>
          )}
        </Panel>

        <Panel>
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
              creditCardSummary.availablePersonalLimit >= 0
                ? 'text-dark-text-muted'
                : 'text-rose-300'
            }`}
          >
            {creditCardSummary.availablePersonalLimit >= 0
              ? `${formatCurrency(creditCardSummary.availablePersonalLimit)} do seu limite pessoal ainda livres.`
              : `${formatCurrency(-creditCardSummary.availablePersonalLimit)} acima do seu limite pessoal.`}
          </p>
        </Panel>
      </div>

      {/* Histórico */}
      <Panel>
        <PanelHeader
          title="Histórico"
          description={
            lastMonth
              ? `Último mês fechado: ${lastMonth.month} · custo médio de ${formatCurrency(stats.averageCosts)} em ${stats.months} ${stats.months === 1 ? 'mês' : 'meses'}.`
              : 'Nenhum mês fechado ainda — o app só conhece o seu plano, não o que aconteceu.'
          }
          actions={
            <button
              type="button"
              onClick={onGoToHistory}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-400 transition-colors hover:text-primary-300"
            >
              {lastMonth ? 'Ver histórico' : 'Fechar o primeiro mês'}
              <ArrowRight size={15} />
            </button>
          }
        />
      </Panel>

      {/* Comparação de cenários */}
      {otherScenarios.length > 0 && (
        <Panel padded={false} className="overflow-hidden">
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
                      className={`border-t border-dark-border-subtle ${
                        isActive ? 'bg-primary-500/[0.06]' : ''
                      }`}
                    >
                      <td className="px-5 py-2.5 font-medium text-dark-text">
                        {summary.name}
                        {isActive && (
                          <span className="ml-2 text-[10px] font-semibold uppercase text-primary-400">
                            ativo
                          </span>
                        )}
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
        </Panel>
      )}
    </div>
  )
}
