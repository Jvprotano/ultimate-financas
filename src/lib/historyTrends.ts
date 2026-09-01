import type { HistoryPoint } from '../types'

export type HistoryTrendPeriod = 6 | 12 | 'all'

export interface HistoryTrendPoint {
  month: string
  invested: number
  employerInvested: number | null
  creditedInvested: number | null
  costs: number
  card: number
  wants: number
  cumulativeInvested: number
  cumulativeCredited: number | null
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
  let creditedKnown = true
  const allPoints = points.map((point) => {
    cumulativeInvested += point.invested
    const employerInvested = point.employerInvestmentKnown ? point.employerInvested : null
    const creditedInvested = employerInvested === null ? null : point.invested + employerInvested
    if (creditedInvested === null) creditedKnown = false
    else cumulativeCredited += creditedInvested
    return {
      month: point.month,
      invested: point.invested,
      employerInvested,
      creditedInvested,
      costs: point.costs,
      card: point.cardPersonalTotal,
      wants: point.wants,
      cumulativeInvested,
      cumulativeCredited: creditedKnown ? cumulativeCredited : null,
      savingsRate: point.savingsRate,
    }
  })

  return period === 'all' ? allPoints : allPoints.slice(-period)
}
