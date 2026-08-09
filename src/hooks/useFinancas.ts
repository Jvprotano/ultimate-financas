import { useCallback, useEffect, useMemo } from 'react'
import { useActiveCycle } from './useActiveCycle'
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
import { calculateAllocationPreview, calculateFinancialCycle } from '../lib/financialCycle'
import { calculateCardCycleAccounting } from '../lib/cardCycleAccounting'
import { calculateMonthlyInvestmentActuals } from '../lib/investmentActuals'
import { calculateAssetsSummary } from '../lib/assets'
import { occurrencesInMonth, projectNetWorth } from '../lib/forecast'
import { maybeCreateAutoBackup } from '../lib/backup'
import { addMonths } from '../lib/shared'
import type { BudgetArea, CostCategory, ScenarioSummary } from '../types'
import { BUDGET_AREAS } from '../types/constants'

export type { ScenarioMetrics } from '../lib/scenario'

/**
 * Compõe os domínios e calcula o que depende de mais de um deles: o orçamento
 * do cenário ativo já enxergando o realizado do cartão, o caixa do mês, a
 * projeção de patrimônio líquido e o fechamento de mês.
 */
export function useFinancas() {
  const activeCycle = useActiveCycle()
  const scenarios = useScenarios()
  const cards = useCreditCards()
  const assetsState = useAssets()
  const debts = useDebts(scenarios.activeScenario.costs, assetsState.assets)

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
  const history = useHistory(activeCycle.month)
  const forecast = useForecast(activeCycle.month)
  const actuals = useActuals(scenarios.activeScenario.costs, activeCycle.month)

  useEffect(() => {
    maybeCreateAutoBackup()
  }, [])

  const { emergencyFund } = investments
  const { activeScenario } = scenarios

  /**
   * O cartão mantém o calendário de vencimento separado do ciclo financeiro.
   * A fatura que vence no mês seguinte é o bucket usado para encerrar o ciclo
   * atual; o snapshot do pagamento preserva total e parte pessoal após o giro.
   */
  const cardCycleAccounting = useMemo(
    () =>
      calculateCardCycleAccounting({
        entries: cards.entries,
        currentDueMonth: cards.settings.currentDueMonth ?? activeCycle.month,
        activeCycleMonth: activeCycle.month,
        currentTotal: cards.summary.currentTotal,
        currentPersonalTotal: cards.summary.currentPersonalTotal,
        nextTotal: cards.summary.nextTotal,
        nextPersonalTotal: cards.summary.nextPersonalTotal,
        paidInvoices: cards.paidInvoices,
      }),
    [
      activeCycle.month,
      cards.entries,
      cards.paidInvoices,
      cards.settings.currentDueMonth,
      cards.summary.currentPersonalTotal,
      cards.summary.currentTotal,
      cards.summary.nextPersonalTotal,
      cards.summary.nextTotal,
    ],
  )
  const realizedByArea = cardCycleAccounting.spendingThisCycle.personalByArea

  const metrics = useMemo(
    () => calculateScenario(activeScenario, emergencyFund, realizedByArea, history.averageCosts),
    [activeScenario, emergencyFund, realizedByArea, history.averageCosts],
  )

  /**
   * Fechamento de investimentos é realizado, não plano. A previdência descontada
   * em folha é investimento efetivo quando a folha roda; o restante vem dos
   * livros-razão de reserva, posições e metas. Marcação a mercado não entra.
   */
  const investmentActuals = useMemo(() => {
    const ledger = calculateMonthlyInvestmentActuals({
      month: activeCycle.month,
      emergencyFund,
      holdings: investments.holdings,
      goals: investments.goals,
    })
    const payroll = metrics.investmentDeductions
    const total = payroll + ledger.directNet
    const savingsRate =
      metrics.availableForBudget > 0 ? (total / metrics.availableForBudget) * 100 : 0

    return { ...ledger, payroll, total, savingsRate }
  }, [
    activeCycle.month,
    emergencyFund,
    investments.goals,
    investments.holdings,
    metrics.availableForBudget,
    metrics.investmentDeductions,
  ])

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
  const cashFlow = useMemo(() => {
    const invoiceToPay = cardCycleAccounting.invoiceThisCycle.personalTotal
    const costsOnAccount = actuals.summary.rows
      .filter((row) => row.cost.paidWith !== 'card')
      .reduce((sum, row) => sum + row.effective, 0)

    return calculateCashFlow({
      paycheck: metrics.paycheckInAccount,
      costsOnAccount,
      costsOnCard: metrics.costsOnCard,
      wantsOnAccount: metrics.wantsOnAccount,
      wantsOnCard: metrics.wantsOnCard,
      directInvestment: metrics.directInvestmentTarget,
      invoiceToPay,
      occurrences: forecast.monthOccurrences,
    })
  }, [
    metrics,
    actuals.summary.rows,
    cardCycleAccounting.invoiceThisCycle.personalTotal,
    forecast.monthOccurrences,
  ])

  const financialCycle = useMemo(
    () =>
      calculateFinancialCycle({
        cashMonth: activeCycle.month,
        income: cashFlow.totalIn,
        invoiceToPay: cashFlow.invoiceToPay,
        costsOnAccount: cashFlow.costsOnAccount,
        wantsOnAccount: cashFlow.wantsOnAccount,
        directInvestment: cashFlow.directInvestment,
        extraExpense: cashFlow.extraExpense,
        // A reserva do próximo caixa usa a parte pessoal da fatura que encerra
        // o ciclo ativo.
        nextInvoicePersonal: cardCycleAccounting.invoiceFormedByCycle.personalTotal,
        plannedNextInvoice: cashFlow.plannedOnCard,
      }),
    [activeCycle.month, cardCycleAccounting.invoiceFormedByCycle.personalTotal, cashFlow],
  )

  /**
   * O "Liberado para alocar" pertence ao próximo ciclo. Ex.: ao fechar Agosto,
   * usa o salário que financiará Setembro e abate a fatura de Setembro formada
   * por Agosto. O snapshot mantém esse mesmo valor mesmo se a fatura já tiver
   * sido paga antes do fechamento.
   */
  const nextCycleAllocation = useMemo(() => {
    const month = addMonths(activeCycle.month, 1)
    const occurrences = occurrencesInMonth(forecast.events, month)
    const extraIncome = occurrences
      .filter((item) => item.event.kind === 'income')
      .reduce((sum, item) => sum + item.event.amount, 0)
    const extraExpense = occurrences
      .filter((item) => item.event.kind === 'expense')
      .reduce((sum, item) => sum + item.event.amount, 0)

    return calculateAllocationPreview({
      month,
      paycheck: metrics.paycheckInAccount,
      invoice: cardCycleAccounting.invoiceFormedByCycle.personalTotal,
      // O Liberado carrega o resultado real do ciclo encerrado para o próximo:
      // economia em custos aumenta a folga; estouro reduz o que resta para alocar.
      // `cashFlow.costsOnAccount` usa realizado e cai no plano apenas onde ainda
      // não há valor efetivo informado.
      costsOnAccount: cashFlow.costsOnAccount,
      baseInvestment: metrics.directInvestmentTarget,
      // Neste contexto, Desejos fora do cartão são os envelopes que sairão da
      // conta (Viagens, Qualidade de vida etc.). O cartão já foi abatido inteiro
      // pela fatura acima.
      plannedWants: metrics.wantsOnAccount,
      extraIncome,
      extraExpense,
    })
  }, [
    activeCycle.month,
    cardCycleAccounting.invoiceFormedByCycle.personalTotal,
    forecast.events,
    cashFlow.costsOnAccount,
    metrics.directInvestmentTarget,
    metrics.paycheckInAccount,
    metrics.wantsOnAccount,
  ])

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
        startMonth: activeCycle.month,
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
      activeCycle.month,
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
   * Congela o ciclo ativo com os números de agora e avança para o próximo.
   * Custos, cartão e investimentos entram pelo realizado; o plano continua
   * existindo separadamente para comparação.
   */
  const closeCurrentMonth = useCallback(
    (month = activeCycle.month, note?: string) => {
      const shouldAdvance =
        month === activeCycle.month &&
        !history.snapshots.some((snapshot) => snapshot.month === month)

      const costsByCategory: Partial<Record<CostCategory, number>> = {}
      actuals.summary.byCategory.forEach((value, category) => {
        costsByCategory[category] = value
      })

      const cardByArea: Partial<Record<BudgetArea, number>> = {}
      for (const area of BUDGET_AREAS) {
        cardByArea[area] = cardCycleAccounting.spendingThisCycle.personalByArea[area]
      }

      const costs = actuals.summary.effectiveCosts
      const balance =
        metrics.paycheckInAccount - costs - metrics.totalWantsAmount - investmentActuals.directNet

      history.closeMonth({
        month,
        scenarioId: activeScenario.id,
        scenarioName: activeScenario.name,
        availableForBudget: metrics.availableForBudget,
        paycheckInAccount: metrics.paycheckInAccount,
        costs,
        costsPlanned: actuals.summary.plannedCosts,
        wants: metrics.totalWantsAmount,
        invested: investmentActuals.total,
        balance,
        savingsRate: investmentActuals.savingsRate,
        costsByCategory,
        grossAssets: investments.summary.financialAssets,
        physicalAssets: investments.summary.physicalAssets,
        liabilities: investments.summary.liabilities,
        securedLiabilities: investments.summary.securedLiabilities,
        netWorth: investments.summary.netWorth,
        emergencyFund: emergencyFund.current,
        // Para o ciclo operacional, Cartão = a minha parte da fatura usada para
        // encerrar o mês. Antecipados já removidos da fatura não são somados de novo.
        cardPersonalTotal: cardCycleAccounting.invoiceFormedByCycle.personalTotal,
        cardByArea,
        cashLeftover: cashFlow.leftover,
        note,
      })

      if (shouldAdvance) {
        activeCycle.advanceCycle()
      }
    },
    [
      activeCycle,
      activeScenario.id,
      activeScenario.name,
      actuals.summary,
      cardCycleAccounting.invoiceFormedByCycle.personalTotal,
      cardCycleAccounting.spendingThisCycle.personalByArea,
      cashFlow.leftover,
      emergencyFund,
      history,
      investmentActuals,
      investments.summary,
      metrics,
    ],
  )

  return {
    activeCycle,
    scenarios,
    cards,
    cardCycleAccounting,
    assets,
    debts,
    investments,
    investmentActuals,
    history,
    forecast,
    actuals,
    metrics,
    cashFlow,
    financialCycle,
    nextCycleAllocation,
    projection,
    monthlyContribution,
    scenarioSummaries,
    closeCurrentMonth,
  }
}

export type FinancasStore = ReturnType<typeof useFinancas>
