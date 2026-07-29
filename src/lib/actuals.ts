import type { ActualsSummary, CostCategory, CostItem, MonthlyActuals } from '../types'
import { personalCostValue } from './scenario'
import { finiteNumber, monthKey } from './shared'

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
  const costs: Record<string, number> = {}
  if (raw?.costs && typeof raw.costs === 'object') {
    for (const [id, value] of Object.entries(raw.costs)) {
      const amount = finiteNumber(value, -1)
      // Zero é uma informação legítima ("não paguei este mês"); negativo não é.
      if (amount >= 0) costs[id] = amount
    }
  }

  return {
    month: /^\d{4}-\d{2}$/.test(raw?.month ?? '') ? (raw?.month as string) : monthKey(),
    costs,
  }
}

export function summarizeActuals(
  costs: CostItem[],
  actuals: MonthlyActuals | undefined,
  month = monthKey(),
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

  return {
    month,
    effectiveCosts,
    plannedCosts,
    variance: effectiveCosts - plannedCosts,
    informedCount: rows.filter((row) => row.actual !== null).length,
    byCategory,
    rows,
  }
}
