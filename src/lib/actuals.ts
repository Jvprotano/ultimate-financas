import type {
  ActualsSummary,
  CostCategory,
  CostItem,
  MonthlyActuals,
  WantItem,
} from '../types'
import { isWantIncludedInCardPlan, personalCostValue } from './scenario'
import { finiteNumber, monthKey, normalizeExtraIncomeEntries } from './shared'

// ---------------------------------------------------------------------------
// Realizado do mês.
//
// A fatura do cartão já traz o realizado de graça: ela lista o que aconteceu.
// O que sai em débito ou boleto não tem essa sorte — a luz orçada em R$ 200 vem
// R$ 260 e o app nunca sabe. Sem isto o "custo médio real" do histórico é só a
// média dos planos, e a meta da reserva de emergência herda o mesmo erro.
//
// A regra é sempre: valor informado manda; onde não houver, vale o planejado.
// ---------------------------------------------------------------------------

export function normalizeActuals(raw: Partial<MonthlyActuals> | undefined): MonthlyActuals {
  const normalizeAmounts = (source: unknown) => {
    const amounts: Record<string, number> = {}
    if (!source || typeof source !== 'object') return amounts
    for (const [id, value] of Object.entries(source)) {
      const amount = finiteNumber(value, -1)
      // Zero é uma informação legítima ("não paguei este mês"); negativo não é.
      if (amount >= 0) amounts[id] = amount
    }
    return amounts
  }

  const costs = normalizeAmounts(raw?.costs)
  const wants = normalizeAmounts(raw?.wants)

  const extraIncome = normalizeExtraIncomeEntries(raw?.extraIncome)
  const extraExpenses = normalizeExtraIncomeEntries(raw?.extraExpenses)

  return {
    month: /^\d{4}-\d{2}$/.test(raw?.month ?? '') ? (raw?.month as string) : monthKey(),
    costs,
    wants,
    extraIncome,
    extraExpenses,
  }
}

export function summarizeActuals(
  costs: CostItem[],
  actuals: Partial<MonthlyActuals> | undefined,
  month = monthKey(),
  wants: WantItem[] = [],
): ActualsSummary {
  const informed = actuals?.costs ?? {}
  const byCategory = new Map<CostCategory, number>()

  const rows = costs.map((cost) => {
    const planned = personalCostValue(cost)
    const actual = Object.hasOwn(informed, cost.id) ? informed[cost.id] : null
    const effective = actual ?? planned

    byCategory.set(cost.category, (byCategory.get(cost.category) ?? 0) + effective)

    return { cost, planned, actual, effective, variance: effective - planned }
  })

  const effectiveCosts = rows.reduce((sum, row) => sum + row.effective, 0)
  const plannedCosts = rows.reduce((sum, row) => sum + row.planned, 0)
  const informedWants = actuals?.wants ?? {}
  const wantRows = wants.map((want) => {
    const planned = Math.max(0, finiteNumber(want.plannedAmount))
    const actual = Object.hasOwn(informedWants, want.id) ? informedWants[want.id] : null
    const effective = actual ?? planned
    const countsTowardTotal = !isWantIncludedInCardPlan(want, wants)
    return {
      want,
      planned,
      actual,
      effective,
      variance: effective - planned,
      countsTowardTotal,
    }
  })
  const countedWantRows = wantRows.filter((row) => row.countsTowardTotal)
  const effectiveWants = countedWantRows.reduce((sum, row) => sum + row.effective, 0)
  const plannedWants = countedWantRows.reduce((sum, row) => sum + row.planned, 0)

  return {
    month,
    extraIncome: actuals?.extraIncome ?? [],
    extraIncomeTotal: (actuals?.extraIncome ?? []).reduce((sum, entry) => sum + entry.amount, 0),
    extraExpenses: actuals?.extraExpenses ?? [],
    extraExpenseTotal: (actuals?.extraExpenses ?? []).reduce(
      (sum, entry) => sum + entry.amount,
      0,
    ),
    effectiveCosts,
    plannedCosts,
    variance: effectiveCosts - plannedCosts,
    informedCount: rows.filter((row) => row.actual !== null).length,
    byCategory,
    rows,
    effectiveWants,
    plannedWants,
    wantsVariance: effectiveWants - plannedWants,
    informedWantsCount: wantRows.filter((row) => row.actual !== null).length,
    wantRows,
  }
}
