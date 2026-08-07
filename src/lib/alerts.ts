import { formatCurrency } from './format'
import type { FinancialCycleSummary } from './financialCycle'
import type { ScenarioMetrics } from '../hooks/useFinancas'
import type { CreditCardSummary, DebtsSummary } from '../types'

export interface AppAlert {
  id: string
  title: string
  detail: string
  severity: 'ok' | 'warning' | 'critical'
}

/** Até 3 alertas priorizados para o hub do ciclo. */
export function buildAlerts(
  metrics: ScenarioMetrics,
  creditCardSummary: CreditCardSummary,
  financialCycle: FinancialCycleSummary,
  debtsSummary: DebtsSummary,
): AppAlert[] {
  const alerts: AppAlert[] = []
  const { budgetComparison, balanceAfterPlan, totalDiversificationPercentage, selectedModel } =
    metrics
  const modelTotal = selectedModel.necessidades + selectedModel.desejos + selectedModel.investimentos

  if (financialCycle.discretionaryShortfall > 0.005) {
    alerts.push({
      id: 'cash-negative',
      title: 'O ciclo financeiro não fecha',
      detail: `Faltam ${formatCurrency(financialCycle.discretionaryShortfall)} para pagar a fatura deste ciclo, as contas e o aporte. A fatura em formação fica para o próximo salário.`,
      severity: 'critical',
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
      detail: `As proporções personalizadas somam ${modelTotal}%. Ajuste em Planejar.`,
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
  const orphanFinancing = debtsSummary.debts.filter(
    (debt) => !debt.isSettled && debt.kind === 'financiamento' && !debt.isSecured,
  )
  if (orphanFinancing.length > 0) {
    alerts.push({
      id: 'debt-without-asset',
      title: 'Financiamento sem o bem cadastrado',
      detail: `${orphanFinancing.map((debt) => debt.name).join(', ')} entra no balanço como dívida pura. Cadastre o imóvel ou veículo em Patrimônio › Bens e ligue os dois.`,
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
      title: 'Ciclo coerente',
      detail: 'Metas, gastos e aportes fecham sem saldo negativo.',
      severity: 'ok',
    })
  }

  const order = { critical: 0, warning: 1, ok: 2 }
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]).slice(0, 3)
}
