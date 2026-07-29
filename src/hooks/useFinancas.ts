import { useCallback, useEffect, useMemo } from 'react'
import { useScenarios } from './useScenarios'
import { useCreditCards } from './useCreditCards'
import { useDebts } from './useDebts'
import { useInvestments } from './useInvestments'
import { useHistory } from './useHistory'
import { useForecast } from './useForecast'
import { useActuals } from './useActuals'
import { calculateScenario } from '../lib/scenario'
import { calculateCashFlow } from '../lib/cashflow'
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
 * A ordem importa: dívidas precisam dos custos (para conferir a parcela),
 * investimentos precisam do saldo devedor (para o líquido), e o orçamento
 * precisa do histórico (para a base da reserva).
 */
export function useFinancas() {
  const scenarios = useScenarios()
  const cards = useCreditCards()
  const debts = useDebts(scenarios.activeScenario.costs)
  const investments = useInvestments(debts.summary.totalBalance)
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
        })),
    [debts.summary.debts],
  )

  const projection = useMemo(
    () =>
      projectNetWorth({
        startMonth: forecast.currentMonth,
        startAssets: investments.summary.grossAssets,
        monthlyContribution,
        annualReturnPct: forecast.assumptions.annualReturnPct,
        inflationPct: forecast.assumptions.inflationPct,
        horizonMonths: forecast.assumptions.horizonMonths,
        events: forecast.events,
        debts: projectedDebts,
        reinvestFreedInstallments: forecast.assumptions.reinvestFreedInstallments,
      }),
    [
      forecast.currentMonth,
      forecast.assumptions.annualReturnPct,
      forecast.assumptions.inflationPct,
      forecast.assumptions.horizonMonths,
      forecast.assumptions.reinvestFreedInstallments,
      forecast.events,
      investments.summary.grossAssets,
      monthlyContribution,
      projectedDebts,
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
        grossAssets: investments.summary.grossAssets,
        liabilities: investments.summary.liabilities,
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
    debts,
    investments,
    history,
    forecast,
    actuals,
    metrics,
    cashFlow,
    projection,
    monthlyContribution,
    scenarioSummaries,
    closeCurrentMonth,
  }
}

export type FinancasStore = ReturnType<typeof useFinancas>
