import { describe, expect, it } from 'vitest'
import { normalizeActuals, summarizeActuals } from './actuals'
import type { CostItem } from '../types'

const costs: CostItem[] = [
  { id: 'aluguel', name: 'Aluguel', value: 2_000, category: 'moradia', paidWith: 'account' },
  { id: 'energia', name: 'Energia', value: 200, category: 'contas', paidWith: 'account' },
  { id: 'mercado', name: 'Mercado', value: 1_300, category: 'alimentacao', paidWith: 'card' },
]

describe('summarizeActuals', () => {
  it('sem nada informado, o realizado é o plano', () => {
    const summary = summarizeActuals(costs, undefined, '2026-07')
    expect(summary.effectiveCosts).toBe(3_500)
    expect(summary.plannedCosts).toBe(3_500)
    expect(summary.variance).toBe(0)
    expect(summary.informedCount).toBe(0)
  })

  it('o valor informado substitui o planejado apenas naquele item', () => {
    const summary = summarizeActuals(costs, { month: '2026-07', costs: { energia: 260 } }, '2026-07')
    expect(summary.effectiveCosts).toBe(3_560)
    expect(summary.variance).toBe(60)
    expect(summary.informedCount).toBe(1)
  })

  it('zero informado é uma informação, não ausência', () => {
    const summary = summarizeActuals(costs, { month: '2026-07', costs: { energia: 0 } }, '2026-07')
    expect(summary.effectiveCosts).toBe(3_300)
    expect(summary.informedCount).toBe(1)
    expect(summary.rows.find((row) => row.cost.id === 'energia')?.actual).toBe(0)
  })

  it('cada linha carrega plano, realizado e a diferença', () => {
    const summary = summarizeActuals(costs, { month: '2026-07', costs: { aluguel: 1_800 } }, '2026-07')
    const row = summary.rows.find((item) => item.cost.id === 'aluguel')!
    expect(row.planned).toBe(2_000)
    expect(row.actual).toBe(1_800)
    expect(row.effective).toBe(1_800)
    expect(row.variance).toBe(-200)
  })

  it('itens sem valor informado ficam com actual null', () => {
    const summary = summarizeActuals(costs, { month: '2026-07', costs: {} }, '2026-07')
    expect(summary.rows.every((row) => row.actual === null)).toBe(true)
  })

  it('as categorias usam o realizado', () => {
    const summary = summarizeActuals(costs, { month: '2026-07', costs: { energia: 260 } }, '2026-07')
    expect(summary.byCategory.get('contas')).toBe(260)
    expect(summary.byCategory.get('moradia')).toBe(2_000)
  })

  it('a soma das categorias é o total efetivo', () => {
    const summary = summarizeActuals(
      costs,
      { month: '2026-07', costs: { energia: 260, mercado: 1_500 } },
      '2026-07',
    )
    const total = Array.from(summary.byCategory.values()).reduce((sum, value) => sum + value, 0)
    expect(total).toBe(summary.effectiveCosts)
  })

  it('o rateio com terceiros continua valendo para o plano', () => {
    const shared: CostItem[] = [
      { id: 'c', name: 'Aluguel', value: 2_000, category: 'moradia', sharedAmount: 800 },
    ]
    const summary = summarizeActuals(shared, undefined, '2026-07')
    expect(summary.plannedCosts).toBe(1_200)
  })

  it('valor informado de um custo que não existe mais é ignorado', () => {
    const summary = summarizeActuals(
      costs,
      { month: '2026-07', costs: { apagado: 999 } },
      '2026-07',
    )
    expect(summary.effectiveCosts).toBe(3_500)
    expect(summary.informedCount).toBe(0)
  })

  it('sem custos cadastrados, tudo é zero', () => {
    const summary = summarizeActuals([], undefined, '2026-07')
    expect(summary.effectiveCosts).toBe(0)
    expect(summary.rows).toEqual([])
  })
})

describe('normalizeActuals', () => {
  it('descarta valores negativos e não numéricos', () => {
    const normalized = normalizeActuals({
      month: '2026-07',
      costs: { a: -5, b: Number.NaN as number, c: 100 },
    })
    expect(normalized.costs).toEqual({ c: 100 })
  })

  it('preserva o zero', () => {
    expect(normalizeActuals({ month: '2026-07', costs: { a: 0 } }).costs).toEqual({ a: 0 })
  })

  it('mês inválido cai no mês corrente', () => {
    expect(normalizeActuals({ month: 'julho' }).month).toMatch(/^\d{4}-\d{2}$/)
  })
})
