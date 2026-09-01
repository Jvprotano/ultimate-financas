import type { HistoryPoint } from '../types'

export type HistoryTrendPeriod = 6 | 12 | 'all'

export interface HistoryTrendPoint {
  month: string
  invested: number
  employerInvested: number
  creditedInvested: number
  costs: number
  card: number
  wants: number
  cumulativeInvested: number
  cumulativeCredited: number
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
  let cumulativeCredited = 0
  const allPoints = points.map((point) => {
    cumulativeInvested += point.invested
    const creditedInvested = point.invested + point.employerInvested
    cumulativeCredited += creditedInvested
    return {
      month: point.month,
      invested: point.invested,
      employerInvested: point.employerInvested,
      creditedInvested,
      costs: point.costs,
      card: point.cardPersonalTotal,
      wants: point.wants,
      cumulativeInvested,
      cumulativeCredited,
      savingsRate: point.savingsRate,
    }
  })

  return period === 'all' ? allPoints : allPoints.slice(-period)
}
