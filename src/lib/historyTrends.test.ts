import { describe, expect, it } from 'vitest'
import type { HistoryPoint } from '../types'
import { buildHistoryTrendPoints } from './historyTrends'

function point(month: string, invested: number, overrides: Partial<HistoryPoint> = {}) {
  return {
    id: month,
    month,
    invested,
    employerInvested: 0,
    costs: 4_000,
    cardPersonalTotal: 2_000,
    wants: 1_000,
    savingsRate: 10,
    ...overrides,
  } as HistoryPoint
}

describe('buildHistoryTrendPoints', () => {
  it('expõe os fluxos fechados sem misturar patrimônio', () => {
    expect(
      buildHistoryTrendPoints([
        point('2026-07', 540, { costs: 4_170, cardPersonalTotal: 2_411.74 }),
        point('2026-08', 2_170.09, { costs: 4_114.59, savingsRate: 23.23 }),
      ], 'all'),
    ).toEqual([
      {
        month: '2026-07',
        invested: 540,
        employerInvested: 0,
        creditedInvested: 540,
        costs: 4_170,
        card: 2_411.74,
        wants: 1_000,
        cumulativeInvested: 540,
        cumulativeCredited: 540,
        savingsRate: 10,
      },
      {
        month: '2026-08',
        invested: 2_170.09,
        employerInvested: 0,
        creditedInvested: 2_170.09,
        costs: 4_114.59,
        card: 2_000,
        wants: 1_000,
        cumulativeInvested: 2_710.09,
        cumulativeCredited: 2_710.09,
        savingsRate: 23.23,
      },
    ])
  })

  it('calcula o acumulado antes de recortar o período visível', () => {
    const visible = buildHistoryTrendPoints([
      point('2026-01', 100),
      point('2026-02', 200),
      point('2026-03', 300),
      point('2026-04', 400),
      point('2026-05', 500),
      point('2026-06', 600),
      point('2026-07', 700),
    ], 6)

    expect(visible.map((item) => item.month)).toEqual([
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
    ])
    expect(visible[0].cumulativeInvested).toBe(300)
    expect(visible.at(-1)?.cumulativeInvested).toBe(2_800)
    expect(visible.at(-1)?.cumulativeCredited).toBe(2_800)
  })

  it('resgates reduzem o acumulado em vez de virarem crescimento', () => {
    const visible = buildHistoryTrendPoints([
      point('2026-07', 1_000),
      point('2026-08', -250),
    ], 12)

    expect(visible.map((item) => item.cumulativeInvested)).toEqual([1_000, 750])
  })

  it('mostra a contrapartida separada e soma o total creditado', () => {
    const [visible] = buildHistoryTrendPoints([
      point('2026-09', 1_690, { employerInvested: 540 }),
    ], 'all')

    expect(visible.employerInvested).toBe(540)
    expect(visible.creditedInvested).toBe(2_230)
    expect(visible.cumulativeCredited).toBe(2_230)
  })
})
