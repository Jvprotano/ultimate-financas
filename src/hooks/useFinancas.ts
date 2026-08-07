import { useCallback, useEffect, useMemo } from 'react'
import { useScenarios } from './useScenarios'
import { useCreditCards } from './useCreditCards'
import { useAssets } from './useAssets'
import { useDebts } from './useDebts'
import { useInvestments } from './useInvestments'
import { useHistory } from './useHistory'
import { useForecast } from './useForecast'
import { useActuals } from './useActuals'
import { calculateScenario } from '../lib/scenario'
import { calculateCashFlow } from '../lib/cashflow'
import { calculateFinancialCycle } from '../lib/financialCycle'
import { calculateAssetsSummary } from '../lib/assets'
import { projectNetWorth } from '../lib/forecast'
import { maybeCreateAutoBackup } from '../lib/backup'
import type { BudgetArea, CostCategory, ScenarioSummary } from '../types'
import { BUDGET_AREAS } from '../types/constants'

export type { ScenarioMetrics } from '../lib/scenario'

/**
 * Compõe os domínios e calcula o que depende de mais de um deles: o orçamento
 * do cenário ativo já enxergando o realizado do cartão, o caixa do mês, a
 * projeção de patrimônio líquido e o fechamento de mês.
 *
 * A ordem importa: dívidas precisam dos custos (para conferir a parcela) e dos
 * bens (para saber quais têm contrapartida), investimentos precisam do saldo
 * devedor e do valor dos bens (para fechar o balanço), e o orçamento precisa do
 * histórico (para a base da reserva).
 *
 * `useAssets` guarda só a lista, sem conhecer dívidas — é o que quebra o ciclo:
 * o resumo dos bens, que precisa do saldo devedor de cada um, é montado aqui.
 */
export function useFinancas() {
  const scenarios = useScenarios()
  const cards = useCreditCards()
  const assetsState = useAssets()
  const debts = useDebts(scenarios.activeScenario.costs, assetsState.assets)

  // Depende da *lista*, não do objeto de `useAssets` — que é novo a cada render.
  // Sem isso o resumo mudava de identidade sempre e arrastava a projeção junto.
  const assetsSummary = useMemo(
    () => calculateAssetsSummary(assetsState.assets, debts.summary.debts),
    [assetsState.assets, debts.summary.debts],
  )
  const assets = useMemo(
    () => ({ ...assetsState, summary: assetsSummary }),
    [assetsState, assetsSummary],
  )

  const investments = useInvestments(debts.summary.totalBalance, {
    securedLiabilities: debts.summary.securedBalance,
    physicalAssets: assets.summary.totalValue,
  })
  const history = useHistory()
  const forecast = useForecast()
  const actuals = useActuals(scenarios.activeScenario.costs, history.currentMonth)

  useEffect(() => {
    maybeCreateAutoBackup()
  }, [])

  const { emergencyFund } = investments
  const { activeScenario } = scenarios
  const realizedByArea = cards.summary.personalByArea

  const metrics = useMemo(
    () => calculateScenario(activeScenario, emergencyFund, realizedByArea, history.averageCosts),
    [activeScenario, emergencyFund, realizedByArea, history.averageCosts],
  )

  const scenarioSummaries = useMemo<ScenarioSummary[]>(
    () =>
      scenarios.scenarios.map((scenario) => {
        const summary = calculateScenario(scenario, emergencyFund)
        return {
          id: scenario.id,
          name: scenario.name,
          availableForBudget: summary.availableForBudget,
          totalCosts: summary.totalCosts,
          totalWantsAmount: summary.totalWantsAmount,
          totalPlannedInvestment: summary.totalPlannedInvestment,
          balanceAfterPlan: summary.balanceAfterPlan,
          savingsRate: summary.savingsRate,
        }
      }),
    [scenarios.scenarios, emergencyFund],
  )

  /** O mês visto pelo extrato: o que entra, o que vence e o que sobra. */
  const cashFlow = useMemo(
    () =>
      calculateCashFlow({
        paycheck: metrics.paycheckInAccount,
        costsOnAccount: metrics.costsOnAccount,
        costsOnCard: metrics.costsOnCard,
        wantsOnAccount: metrics.wantsOnAccount,
        wantsOnCard: metrics.wantsOnCard,
        directInvestment: metrics.directInvestmentTarget,
        invoiceToPay: cards.summary.currentPersonalTotal,
        occurrences: forecast.monthOccurrences,
      }),
    [metrics, cards.summary.currentPersonalTotal, forecast.monthOccurrences],
  )

  const financialCycle = useMemo(
    () =>
      calculateFinancialCycle({
        cashMonth: forecast.currentMonth,
        income: cashFlow.totalIn,
        invoiceToPay: cashFlow.invoiceToPay,
        costsOnAccount: cashFlow.costsOnAccount,
        wantsOnAccount: cashFlow.wantsOnAccount,
        directInvestment: cashFlow.directInvestment,
        extraExpense: cashFlow.extraExpense,
        nextInvoicePersonal: cards.summary.nextPersonalTotal,
      }),
    [cards.summary.nextPersonalTotal, cashFlow, forecast.currentMonth],
  )

  // Aporte recorrente da projeção: o do plano, salvo se você fixar outro. A
  // sobra do mês entra pelo regime de competência (`balanceAfterPlan`), não
  // pelo caixa — senão o 13º deste mês viraria aporte de todo mês.
  const monthlyContribution = useMemo(() => {
    if (forecast.assumptions.monthlyContribution !== null) {
      return forecast.assumptions.monthlyContribution
    }
    const leftover = forecast.assumptions.includeLeftover
      ? Math.max(0, metrics.balanceAfterPlan)
      : 0
    return metrics.totalPlannedInvestment + leftover
  }, [forecast.assumptions, metrics.balanceAfterPlan, metrics.totalPlannedInvestment])

  const projectedDebts = useMemo(
    () =>
      debts.summary.debts
        .filter((debt) => !debt.isSettled)
        .map((debt) => ({
          id: debt.id,
          balance: debt.balance,
          monthlyRatePct: debt.monthlyRatePct,
          installment: debt.installment,
          secured: debt.isSecured,
        })),
    [debts.summary.debts],
  )

  const projectedProperties = useMemo(
    () =>
      assets.summary.assets
        .filter((asset) => asset.value > 0)
        .map((asset) => ({
          id: asset.id,
          value: asset.value,
          annualAppreciationPct: asset.annualAppreciationPct,
        })),
    [assets.summary.assets],
  )

  const projection = useMemo(
    () =>
      projectNetWorth({
        startMonth: forecast.currentMonth,
        // Só o financeiro cresce por aporte e rendimento; o bem tem a curva dele.
        startAssets: investments.summary.financialAssets,
        monthlyContribution,
        annualReturnPct: forecast.assumptions.annualReturnPct,
        inflationPct: forecast.assumptions.inflationPct,
        horizonMonths: forecast.assumptions.horizonMonths,
        events: forecast.events,
        debts: projectedDebts,
        properties: projectedProperties,
        reinvestFreedInstallments: forecast.assumptions.reinvestFreedInstallments,
      }),
    [
      forecast.currentMonth,
      forecast.assumptions.annualReturnPct,
      forecast.assumptions.inflationPct,
      forecast.assumptions.horizonMonths,
      forecast.assumptions.reinvestFreedInstallments,
      forecast.events,
      investments.summary.financialAssets,
      monthlyContribution,
      projectedDebts,
      projectedProperties,
    ],
  )

  /**
   * Congela o mês corrente (ou outro informado) com os números de agora. Os
   * custos entram pelo realizado onde ele foi informado — é o que faz o custo
   * médio do histórico ser um fato e não a média dos planos.
   */
  const closeCurrentMonth = useCallback(
    (month = history.currentMonth, note?: string) => {
      const costsByCategory: Partial<Record<CostCategory, number>> = {}
      actuals.summary.byCategory.forEach((value, category) => {
        costsByCategory[category] = value
      })

      const cardByArea: Partial<Record<BudgetArea, number>> = {}
      for (const area of BUDGET_AREAS) {
        cardByArea[area] = cards.summary.personalByArea[area]
      }

      const costs = actuals.summary.effectiveCosts
      const balance =
        metrics.paycheckInAccount - costs - metrics.totalWantsAmount - metrics.directInvestmentTarget

      history.closeMonth({
        month,
        scenarioId: activeScenario.id,
        scenarioName: activeScenario.name,
        availableForBudget: metrics.availableForBudget,
        paycheckInAccount: metrics.paycheckInAccount,
        costs,
        costsPlanned: actuals.summary.plannedCosts,
        wants: metrics.totalWantsAmount,
        invested: metrics.totalPlannedInvestment,
        balance,
        savingsRate: metrics.savingsRate,
        costsByCategory,
        // `grossAssets` guarda o financeiro, como sempre guardou; os bens vão
        // no campo próprio, e é a soma dos dois que forma o líquido.
        grossAssets: investments.summary.financialAssets,
        physicalAssets: investments.summary.physicalAssets,
        liabilities: investments.summary.liabilities,
        securedLiabilities: investments.summary.securedLiabilities,
        netWorth: investments.summary.netWorth,
        emergencyFund: emergencyFund.current,
        cardPersonalTotal: cards.summary.currentPersonalTotal,
        cardByArea,
        cashLeftover: cashFlow.leftover,
        note,
      })
    },
    [
      activeScenario.id,
      activeScenario.name,
      actuals.summary,
      cards.summary.currentPersonalTotal,
      cards.summary.personalByArea,
      cashFlow.leftover,
      emergencyFund,
      history,
      investments.summary,
      metrics,
    ],
  )

  return {
    scenarios,
    cards,
    assets,
    debts,
    investments,
    history,
    forecast,
    actuals,
    metrics,
    cashFlow,
    financialCycle,
    projection,
    monthlyContribution,
    scenarioSummaries,
    closeCurrentMonth,
  }
}

export type FinancasStore = ReturnType<typeof useFinancas>
