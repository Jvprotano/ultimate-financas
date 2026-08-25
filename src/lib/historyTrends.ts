import type { HistoryPoint } from '../types'

export type HistoryTrendPeriod = 6 | 12 | 'all'

export interface HistoryTrendPoint {
  month: string
  invested: number
  costs: number
  card: number
  wants: number
  cumulativeInvested: number
  savingsRate: number
}

/**
 * Prepara séries de tendência sem reclassificar nenhum fato financeiro:
 * aportes já chegam projetados pelo livro-razão; os demais valores continuam
 * sendo o realizado de cada fechamento.
 */
export function buildHistoryTrendPoints(
  points: HistoryPoint[],
  period: HistoryTrendPeriod,
): HistoryTrendPoint[] {
  let cumulativeInvested = 0
  const allPoints = points.map((point) => {
    cumulativeInvested += point.invested
    return {
      month: point.month,
      invested: point.invested,
      costs: point.costs,
      card: point.cardPersonalTotal,
      wants: point.wants,
      cumulativeInvested,
      savingsRate: point.savingsRate,
    }
  })

  return period === 'all' ? allPoints : allPoints.slice(-period)
}
