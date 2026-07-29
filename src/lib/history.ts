import type { BudgetArea, CostCategory, HistoryPoint, HistoryStats, MonthlySnapshot } from '../types'
import { BUDGET_AREAS } from '../types/constants'
import { finiteNumber, monthKey, uid } from './shared'

export function normalizeSnapshot(raw: Partial<MonthlySnapshot> | undefined): MonthlySnapshot {
  const categories: Partial<Record<CostCategory, number>> = {}
  if (raw?.costsByCategory && typeof raw.costsByCategory === 'object') {
    for (const [key, value] of Object.entries(raw.costsByCategory)) {
      categories[key as CostCategory] = finiteNumber(value)
    }
  }

  const cardByArea: Partial<Record<BudgetArea, number>> = {}
  if (raw?.cardByArea && typeof raw.cardByArea === 'object') {
    for (const area of BUDGET_AREAS) {
      const value = finiteNumber(raw.cardByArea[area])
      if (value !== 0) cardByArea[area] = value
    }
  }

  return {
    id: raw?.id || uid(),
    month: /^\d{4}-\d{2}$/.test(raw?.month ?? '') ? (raw?.month as string) : monthKey(),
    closedAt: raw?.closedAt || new Date().toISOString(),
    scenarioId: raw?.scenarioId || '',
    scenarioName: raw?.scenarioName || 'Cenário',
    availableForBudget: finiteNumber(raw?.availableForBudget),
    paycheckInAccount: finiteNumber(raw?.paycheckInAccount),
    costs: finiteNumber(raw?.costs),
    // Snapshots antigos não separavam plano de realizado: eram a mesma coisa.
    costsPlanned: finiteNumber(raw?.costsPlanned, finiteNumber(raw?.costs)),
    wants: finiteNumber(raw?.wants),
    invested: finiteNumber(raw?.invested),
    balance: finiteNumber(raw?.balance),
    savingsRate: finiteNumber(raw?.savingsRate),
    costsByCategory: categories,
    // Antes das dívidas existirem, o patrimônio gravado *era* o total de ativos.
    grossAssets: finiteNumber(raw?.grossAssets, finiteNumber(raw?.netWorth)),
    liabilities: finiteNumber(raw?.liabilities),
    netWorth: finiteNumber(raw?.netWorth),
    emergencyFund: finiteNumber(raw?.emergencyFund),
    cardPersonalTotal: finiteNumber(raw?.cardPersonalTotal),
    cardByArea,
    cashLeftover: finiteNumber(raw?.cashLeftover),
    note: raw?.note?.trim() || undefined,
  }
}

/** Ordem cronológica, com as variações em relação ao mês fechado anterior. */
export function buildHistoryPoints(snapshots: MonthlySnapshot[]): HistoryPoint[] {
  const ordered = [...snapshots].sort((a, b) => a.month.localeCompare(b.month))

  return ordered.map((snapshot, index) => {
    const previous = index > 0 ? ordered[index - 1] : null
    return {
      ...snapshot,
      netWorthDelta: previous ? snapshot.netWorth - previous.netWorth : null,
      costsDelta: previous ? snapshot.costs - previous.costs : null,
    }
  })
}

export function calculateHistoryStats(points: HistoryPoint[]): HistoryStats {
  if (points.length === 0) {
    return {
      months: 0,
      averageCosts: 0,
      averageWants: 0,
      averageInvested: 0,
      averageSavingsRate: 0,
      averageCardPersonal: 0,
      netWorthGrowth: 0,
      netWorthGrowthPct: 0,
      bestSavingsMonth: null,
    }
  }

  const mean = (pick: (point: HistoryPoint) => number) =>
    points.reduce((sum, point) => sum + pick(point), 0) / points.length

  const first = points[0]
  const last = points[points.length - 1]
  const netWorthGrowth = last.netWorth - first.netWorth
  const best = points.reduce((top, point) => (point.savingsRate > top.savingsRate ? point : top), points[0])

  return {
    months: points.length,
    averageCosts: mean((p) => p.costs),
    averageWants: mean((p) => p.wants),
    averageInvested: mean((p) => p.invested),
    averageSavingsRate: mean((p) => p.savingsRate),
    averageCardPersonal: mean((p) => p.cardPersonalTotal),
    netWorthGrowth,
    netWorthGrowthPct: first.netWorth > 0 ? (netWorthGrowth / first.netWorth) * 100 : 0,
    bestSavingsMonth: best,
  }
}

/**
 * Custo médio por mês fechado, para a reserva deixar de depender do custo do
 * cenário aberto. Sem histórico suficiente devolve null e a reserva volta a usar
 * o custo planejado.
 */
export function averageMonthlyCosts(points: HistoryPoint[], months = 6): number | null {
  const recent = points.slice(-months)
  if (recent.length < 2) return null
  return recent.reduce((sum, point) => sum + point.costs, 0) / recent.length
}
