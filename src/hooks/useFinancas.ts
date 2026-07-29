import { useCallback, useEffect, useMemo } from 'react'
import { useScenarios } from './useScenarios'
import { useCreditCards } from './useCreditCards'
import { useInvestments } from './useInvestments'
import { useHistory } from './useHistory'
import { useForecast } from './useForecast'
import { calculateScenario } from '../lib/scenario'
import { calculateCashFlow } from '../lib/cashflow'
import { projectNetWorth } from '../lib/forecast'
import { maybeCreateAutoBackup } from '../lib/backup'
import type { BudgetArea, CostCategory, ScenarioSummary } from '../types'
import { BUDGET_AREAS } from '../types/constants'

export type { ScenarioMetrics } from '../lib/scenario'

/**
 * Compõe os domínios e calcula o que depende de mais de um deles: o orçamento
 * do cenário ativo já enxergando o realizado do cartão, o caixa do mês (que
 * cruza plano, fatura e eventos esperados), a projeção de patrimônio e o
 * fechamento de mês.
 */
export function useFinancas() {
  const scenarios = useScenarios()
  const cards = useCreditCards()
  const investments = useInvestments()
  const history = useHistory()
  const forecast = useForecast()

  useEffect(() => {
    maybeCreateAutoBackup()
  }, [])

  const { emergencyFund } = investments
  const { activeScenario } = scenarios
  const realizedByArea = cards.summary.personalByArea

  const metrics = useMemo(
    () => calculateScenario(activeScenario, emergencyFund, realizedByArea),
    [activeScenario, emergencyFund, realizedByArea],
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

  const projection = useMemo(
    () =>
      projectNetWorth({
        startMonth: forecast.currentMonth,
        startNetWorth: investments.summary.netWorth,
        monthlyContribution,
        annualReturnPct: forecast.assumptions.annualReturnPct,
        horizonMonths: forecast.assumptions.horizonMonths,
        events: forecast.events,
      }),
    [
      forecast.currentMonth,
      forecast.assumptions.annualReturnPct,
      forecast.assumptions.horizonMonths,
      forecast.events,
      investments.summary.netWorth,
      monthlyContribution,
    ],
  )

  /** Congela o mês corrente (ou outro informado) com os números de agora. */
  const closeCurrentMonth = useCallback(
    (month = history.currentMonth, note?: string) => {
      const costsByCategory: Partial<Record<CostCategory, number>> = {}
      metrics.costsByCategory.forEach((value, category) => {
        costsByCategory[category] = value
      })

      const cardByArea: Partial<Record<BudgetArea, number>> = {}
      for (const area of BUDGET_AREAS) {
        cardByArea[area] = cards.summary.personalByArea[area]
      }

      history.closeMonth({
        month,
        scenarioId: activeScenario.id,
        scenarioName: activeScenario.name,
        availableForBudget: metrics.availableForBudget,
        paycheckInAccount: metrics.paycheckInAccount,
        costs: metrics.totalCosts,
        wants: metrics.totalWantsAmount,
        invested: metrics.totalPlannedInvestment,
        balance: metrics.balanceAfterPlan,
        savingsRate: metrics.savingsRate,
        costsByCategory,
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
      cards.summary.currentPersonalTotal,
      cards.summary.personalByArea,
      cashFlow.leftover,
      emergencyFund,
      history,
      investments.summary.netWorth,
      metrics,
    ],
  )

  return {
    scenarios,
    cards,
    investments,
    history,
    forecast,
    metrics,
    cashFlow,
    projection,
    monthlyContribution,
    scenarioSummaries,
    closeCurrentMonth,
  }
}

export type FinancasStore = ReturnType<typeof useFinancas>
