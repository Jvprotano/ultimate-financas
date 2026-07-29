import { describe, expect, it } from 'vitest'
import {
  averageMonthlyCosts,
  buildHistoryPoints,
  calculateHistoryStats,
  normalizeSnapshot,
} from './history'
import type { MonthlySnapshot } from '../types'

function snapshot(overrides: Partial<MonthlySnapshot> = {}): MonthlySnapshot {
  return normalizeSnapshot({
    id: 's1',
    month: '2026-07',
    closedAt: '2026-07-31T00:00:00.000Z',
    availableForBudget: 9_100,
    costs: 3_900,
    wants: 628,
    invested: 1_820,
    savingsRate: 20,
    grossAssets: 6_900,
    liabilities: 0,
    netWorth: 6_900,
    cardPersonalTotal: 1_499,
    ...overrides,
  })
}

describe('normalizeSnapshot — compatibilidade', () => {
  it('snapshot antigo sem plano de custos usa o realizado como plano', () => {
    const normalized = normalizeSnapshot({ month: '2026-06', costs: 3_000 })
    expect(normalized.costsPlanned).toBe(3_000)
  })

  it('snapshot antigo sem dívidas trata o patrimônio gravado como ativos', () => {
    const normalized = normalizeSnapshot({ month: '2026-06', netWorth: 5_000 })
    expect(normalized.grossAssets).toBe(5_000)
    expect(normalized.liabilities).toBe(0)
    expect(normalized.netWorth).toBe(5_000)
  })

  it('mês inválido cai no mês corrente', () => {
    expect(normalizeSnapshot({ month: '07/2026' }).month).toMatch(/^\d{4}-\d{2}$/)
  })

  it('só guarda áreas do cartão com valor', () => {
    const normalized = normalizeSnapshot({
      month: '2026-07',
      cardByArea: { necessidades: 769, desejos: 0 },
    })
    expect(normalized.cardByArea).toEqual({ necessidades: 769 })
  })
})

describe('buildHistoryPoints', () => {
  it('ordena cronologicamente, independente da ordem gravada', () => {
    const points = buildHistoryPoints([
      snapshot({ id: 'b', month: '2026-08' }),
      snapshot({ id: 'a', month: '2026-06' }),
      snapshot({ id: 'c', month: '2026-07' }),
    ])
    expect(points.map((point) => point.month)).toEqual(['2026-06', '2026-07', '2026-08'])
  })

  it('o primeiro mês não tem variação', () => {
    const [first] = buildHistoryPoints([snapshot()])
    expect(first.netWorthDelta).toBeNull()
    expect(first.costsDelta).toBeNull()
  })

  it('a variação é contra o mês fechado anterior', () => {
    const points = buildHistoryPoints([
      snapshot({ id: 'a', month: '2026-06', netWorth: 5_000, costs: 3_500 }),
      snapshot({ id: 'b', month: '2026-07', netWorth: 6_900, costs: 3_900 }),
    ])
    expect(points[1].netWorthDelta).toBe(1_900)
    expect(points[1].costsDelta).toBe(400)
  })
})

describe('calculateHistoryStats', () => {
  const points = buildHistoryPoints([
    snapshot({ id: 'a', month: '2026-05', costs: 3_000, netWorth: 4_000, savingsRate: 10, cardPersonalTotal: 1_000 }),
    snapshot({ id: 'b', month: '2026-06', costs: 4_000, netWorth: 5_000, savingsRate: 30, cardPersonalTotal: 2_000 }),
  ])

  it('médias são aritméticas sobre os meses fechados', () => {
    const stats = calculateHistoryStats(points)
    expect(stats.months).toBe(2)
    expect(stats.averageCosts).toBe(3_500)
    expect(stats.averageSavingsRate).toBe(20)
    expect(stats.averageCardPersonal).toBe(1_500)
  })

  it('o crescimento é do primeiro ao último mês', () => {
    const stats = calculateHistoryStats(points)
    expect(stats.netWorthGrowth).toBe(1_000)
    expect(stats.netWorthGrowthPct).toBe(25)
  })

  it('elege o melhor mês pela taxa de poupança', () => {
    expect(calculateHistoryStats(points).bestSavingsMonth?.month).toBe('2026-06')
  })

  it('histórico vazio não divide por zero', () => {
    const stats = calculateHistoryStats([])
    expect(stats.months).toBe(0)
    expect(stats.averageCosts).toBe(0)
    expect(stats.netWorthGrowthPct).toBe(0)
    expect(stats.bestSavingsMonth).toBeNull()
  })

  it('patrimônio inicial zero não gera percentual infinito', () => {
    const zeroStart = buildHistoryPoints([
      snapshot({ id: 'a', month: '2026-05', netWorth: 0 }),
      snapshot({ id: 'b', month: '2026-06', netWorth: 1_000 }),
    ])
    expect(calculateHistoryStats(zeroStart).netWorthGrowthPct).toBe(0)
  })
})

describe('averageMonthlyCosts', () => {
  it('exige pelo menos dois meses para virar base da reserva', () => {
    expect(averageMonthlyCosts(buildHistoryPoints([snapshot({ costs: 3_000 })]))).toBeNull()
    expect(averageMonthlyCosts([])).toBeNull()
  })

  it('média dos meses recentes', () => {
    const points = buildHistoryPoints([
      snapshot({ id: 'a', month: '2026-05', costs: 3_000 }),
      snapshot({ id: 'b', month: '2026-06', costs: 4_000 }),
    ])
    expect(averageMonthlyCosts(points)).toBe(3_500)
  })

  it('considera só a janela pedida, sempre a mais recente', () => {
    const points = buildHistoryPoints([
      snapshot({ id: 'a', month: '2026-01', costs: 10_000 }),
      snapshot({ id: 'b', month: '2026-02', costs: 3_000 }),
      snapshot({ id: 'c', month: '2026-03', costs: 4_000 }),
    ])
    expect(averageMonthlyCosts(points, 2)).toBe(3_500)
  })
})
