import { useCallback, useEffect, useMemo } from 'react'
import { useScenarios } from './useScenarios'
import { useCreditCards } from './useCreditCards'
import { useInvestments } from './useInvestments'
import { useHistory } from './useHistory'
import { calculateScenario } from '../lib/scenario'
import { maybeCreateAutoBackup } from '../lib/backup'
import type { CostCategory, ScenarioSummary } from '../types'

export type { ScenarioMetrics } from '../lib/scenario'

/**
 * Compõe os quatro domínios e calcula o que depende de mais de um deles: o
 * orçamento do cenário ativo já enxergando o realizado do cartão, os resumos de
 * cenário e o fechamento de mês.
 */
export function useFinancas() {
  const scenarios = useScenarios()
  const cards = useCreditCards()
  const investments = useInvestments()
  const history = useHistory()

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

  /** Congela o mês corrente (ou outro informado) com os números de agora. */
  const closeCurrentMonth = useCallback(
    (month = history.currentMonth, note?: string) => {
      const costsByCategory: Partial<Record<CostCategory, number>> = {}
      metrics.costsByCategory.forEach((value, category) => {
        costsByCategory[category] = value
      })

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
        note,
      })
    },
    [
      activeScenario.id,
      activeScenario.name,
      cards.summary.currentPersonalTotal,
      emergencyFund,
      history,
      investments.summary.netWorth,
      metrics,
    ],
  )

  return { scenarios, cards, investments, history, metrics, scenarioSummaries, closeCurrentMonth }
}

export type FinancasStore = ReturnType<typeof useFinancas>
