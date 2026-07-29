import { describe, expect, it } from 'vitest'
import {
  advanceDebtMonth,
  calculateDebtsSummary,
  comparePayoffVsInvest,
  monthsToPayoff,
  normalizeDebt,
  summarizeDebt,
} from './debts'
import type { CostItem, Debt } from '../types'

function debt(overrides: Partial<Debt> = {}): Debt {
  return normalizeDebt({
    id: 'd1',
    name: 'Financiamento',
    kind: 'financiamento',
    balance: 100_000,
    monthlyRatePct: 1,
    installment: 2_000,
    remainingInstallments: 0,
    transactions: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  })
}

describe('monthsToPayoff', () => {
  it('sem juros, é uma divisão simples', () => {
    expect(monthsToPayoff(1_000, 0, 100)).toBe(10)
  })

  it('arredonda para cima: a última parcela é parcial', () => {
    expect(monthsToPayoff(1_050, 0, 100)).toBe(11)
  })

  it('com juros, exige mais parcelas que a divisão simples', () => {
    const simple = 100_000 / 2_000
    const withInterest = monthsToPayoff(100_000, 0.01, 2_000)
    expect(withInterest).not.toBeNull()
    expect(withInterest!).toBeGreaterThan(simple)
  })

  it('devolve null quando a parcela não cobre os juros do mês', () => {
    // 1% de 100 mil = 1.000 de juro; uma parcela de 900 faz a dívida crescer.
    expect(monthsToPayoff(100_000, 0.01, 900)).toBeNull()
    expect(monthsToPayoff(100_000, 0.01, 1_000)).toBeNull()
  })

  it('saldo zerado quita em zero meses, mesmo sem parcela', () => {
    expect(monthsToPayoff(0, 0.02, 0)).toBe(0)
  })

  it('sem parcela e com saldo, não há prazo', () => {
    expect(monthsToPayoff(500, 0, 0)).toBeNull()
  })
})

describe('summarizeDebt', () => {
  it('converte a taxa mensal em anual por juros compostos', () => {
    const summary = summarizeDebt(debt({ monthlyRatePct: 1 }))
    // (1,01^12 − 1) = 12,68%, não 12%.
    expect(summary.annualRatePct).toBeCloseTo(12.6825, 3)
  })

  it('separa a parcela entre juros e amortização', () => {
    const summary = summarizeDebt(debt({ balance: 100_000, monthlyRatePct: 1, installment: 2_000 }))
    expect(summary.monthlyInterest).toBe(1_000)
    expect(summary.amortizationShare).toBeCloseTo(0.5, 10)
  })

  it('o prazo informado tem precedência sobre a estimativa', () => {
    const estimated = summarizeDebt(debt({ remainingInstallments: 0 }))
    const informed = summarizeDebt(debt({ remainingInstallments: 60 }))
    expect(informed.monthsToPayoff).toBe(60)
    expect(estimated.monthsToPayoff).not.toBe(60)
  })

  it('juros restantes são o total a pagar menos o saldo', () => {
    const summary = summarizeDebt(
      debt({ balance: 10_000, installment: 1_000, remainingInstallments: 12 }),
    )
    expect(summary.totalRemaining).toBe(12_000)
    expect(summary.interestRemaining).toBe(2_000)
  })

  it('não inventa juros negativos quando a parcela é generosa', () => {
    const summary = summarizeDebt(
      debt({ balance: 10_000, installment: 1_000, remainingInstallments: 5 }),
    )
    expect(summary.interestRemaining).toBe(0)
  })

  it('acusa divergência entre a parcela e o custo fixo ligado a ela', () => {
    const costs: CostItem[] = [
      { id: 'c1', name: 'Financiamento', value: 2_150, category: 'dividas', paidWith: 'account' },
    ]
    const summary = summarizeDebt(debt({ installment: 2_000, linkedCostId: 'c1' }), costs)
    expect(summary.linkedCostMismatch).toBe(150)
  })

  it('não acusa divergência quando os valores batem', () => {
    const costs: CostItem[] = [
      { id: 'c1', name: 'Financiamento', value: 2_000, category: 'dividas', paidWith: 'account' },
    ]
    const summary = summarizeDebt(debt({ installment: 2_000, linkedCostId: 'c1' }), costs)
    expect(summary.linkedCostMismatch).toBeNull()
  })
})

describe('calculateDebtsSummary', () => {
  it('pondera a taxa média pelo saldo, não pela contagem', () => {
    const summary = calculateDebtsSummary([
      debt({ id: 'a', balance: 99_000, monthlyRatePct: 1 }),
      debt({ id: 'b', balance: 1_000, monthlyRatePct: 14 }),
    ])
    // A média simples daria ~140% a.a.; ponderada fica perto do financiamento.
    expect(summary.weightedAnnualRatePct).toBeLessThan(20)
  })

  it('elege a dívida de maior taxa, não a de maior saldo', () => {
    const summary = calculateDebtsSummary([
      debt({ id: 'grande', name: 'Imóvel', balance: 300_000, monthlyRatePct: 0.8 }),
      debt({ id: 'caro', name: 'Rotativo', balance: 2_000, monthlyRatePct: 14 }),
    ])
    expect(summary.costliest?.name).toBe('Rotativo')
  })

  it('ignora dívidas quitadas nos totais', () => {
    const summary = calculateDebtsSummary([
      debt({ id: 'a', balance: 5_000, installment: 500 }),
      debt({ id: 'b', balance: 0, installment: 800 }),
    ])
    expect(summary.totalBalance).toBe(5_000)
    expect(summary.totalInstallment).toBe(500)
    expect(summary.debts).toHaveLength(2)
  })

  it('sem dívidas, tudo é zero e nada é mais caro', () => {
    const summary = calculateDebtsSummary([])
    expect(summary.totalBalance).toBe(0)
    expect(summary.weightedAnnualRatePct).toBe(0)
    expect(summary.costliest).toBeNull()
  })
})

describe('comparePayoffVsInvest', () => {
  it('a diferença é positiva quando a dívida custa mais que o investimento rende', () => {
    const comparison = comparePayoffVsInvest({ annualRatePct: 15 }, 10, 1_000)
    expect(comparison.interestSaved).toBe(150)
    expect(comparison.investmentReturn).toBe(100)
    expect(comparison.difference).toBe(50)
  })

  it('e negativa no caso oposto', () => {
    expect(comparePayoffVsInvest({ annualRatePct: 6 }, 10, 1_000).difference).toBe(-40)
  })
})

describe('advanceDebtMonth', () => {
  it('corre juros antes de abater a parcela', () => {
    const next = advanceDebtMonth(1_000, 1, 200)
    expect(next.interest).toBe(10)
    expect(next.balance).toBe(810)
    expect(next.paid).toBe(200)
  })

  it('a última parcela não cobra além do que se deve', () => {
    const next = advanceDebtMonth(100, 0, 500)
    expect(next.balance).toBe(0)
    expect(next.paid).toBe(100)
  })

  it('saldo zerado não movimenta nada', () => {
    expect(advanceDebtMonth(0, 5, 500)).toEqual({ balance: 0, paid: 0, interest: 0 })
  })

  it('parcela menor que os juros faz o saldo crescer', () => {
    expect(advanceDebtMonth(1_000, 10, 50).balance).toBe(1_050)
  })
})

describe('normalizeDebt', () => {
  it('recusa valores impossíveis em vez de propagar NaN', () => {
    const normalized = normalizeDebt({
      balance: -50,
      monthlyRatePct: 999,
      installment: Number.NaN,
      remainingInstallments: -3,
    })
    expect(normalized.balance).toBe(0)
    expect(normalized.monthlyRatePct).toBe(50)
    expect(normalized.installment).toBe(0)
    expect(normalized.remainingInstallments).toBe(0)
  })
})
