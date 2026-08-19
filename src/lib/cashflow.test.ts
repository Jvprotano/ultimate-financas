import { describe, expect, it } from 'vitest'
import { calculateCashFlow, type CashFlowInput } from './cashflow'
import { normalizeExpectedEvent, occurrencesInMonth } from './forecast'

function input(overrides: Partial<CashFlowInput> = {}): CashFlowInput {
  return {
    paycheck: 8_550,
    costsOnAccount: 2_600,
    costsOnCard: 1_300,
    wantsOnAccount: 0,
    wantsOnCard: 628,
    directInvestment: 1_270,
    invoiceToPay: 1_499,
    occurrences: [],
    ...overrides,
  }
}

describe('calculateCashFlow', () => {
  it('o que sai é a fatura, não os gastos que a compõem', () => {
    const flow = calculateCashFlow(input())
    // Nem costsOnCard nem wantsOnCard entram na saída: eles estão na fatura.
    expect(flow.totalOut).toBe(1_499 + 2_600 + 0 + 1_270)
    expect(flow.leftover).toBe(8_550 - flow.totalOut)
  })

  it('o plano no cartão é a soma das duas partes marcadas como cartão', () => {
    const flow = calculateCashFlow(input())
    expect(flow.plannedOnCard).toBe(1_928)
  })

  it('a diferença plano × fatura é positiva quando se gastou além do previsto', () => {
    const flow = calculateCashFlow(input({ invoiceToPay: 2_500 }))
    expect(flow.cardPlanGap).toBe(572)
  })

  it('e negativa quando a fatura ficou abaixo do plano', () => {
    const flow = calculateCashFlow(input({ invoiceToPay: 1_000 }))
    expect(flow.cardPlanGap).toBe(-928)
  })

  it('a sobra fica negativa quando o salário não cobre o que vence', () => {
    const flow = calculateCashFlow(input({ paycheck: 3_000 }))
    expect(flow.leftover).toBeLessThan(0)
  })

  it('entrada extra recebida soma ao que entra', () => {
    const flow = calculateCashFlow(input({ extraIncome: 6_800 }))
    expect(flow.extraIncome).toBe(6_800)
    expect(flow.totalIn).toBe(8_550 + 6_800)
  })

  it('entrada apenas prevista não vira caixa antes de ser recebida', () => {
    const events = [
      normalizeExpectedEvent({
        name: '13º',
        kind: 'income',
        amount: 6_800,
        month: '2026-12',
        recurrence: 'once',
      }),
    ]
    const flow = calculateCashFlow(input({ occurrences: occurrencesInMonth(events, '2026-12') }))
    expect(flow.extraIncome).toBe(0)
    expect(flow.totalIn).toBe(8_550)
  })

  it('saídas esperadas do mês somam ao que sai', () => {
    const events = [
      normalizeExpectedEvent({
        name: 'IPVA',
        kind: 'expense',
        amount: 1_900,
        month: '2027-01',
        recurrence: 'once',
      }),
    ]
    const flow = calculateCashFlow(input({ occurrences: occurrencesInMonth(events, '2027-01') }))
    expect(flow.extraExpense).toBe(1_900)
    expect(flow.totalOut).toBe(1_499 + 2_600 + 1_270 + 1_900)
  })

  it('entra menos sai é sempre a sobra', () => {
    const flow = calculateCashFlow(input({ paycheck: 5_000, invoiceToPay: 900 }))
    expect(flow.leftover).toBe(flow.totalIn - flow.totalOut)
  })

  it('mês sem nada cadastrado não gera NaN', () => {
    const flow = calculateCashFlow({
      paycheck: 0,
      costsOnAccount: 0,
      costsOnCard: 0,
      wantsOnAccount: 0,
      wantsOnCard: 0,
      directInvestment: 0,
      invoiceToPay: 0,
      occurrences: [],
    })
    expect(flow.leftover).toBe(0)
    expect(flow.cardPlanGap).toBe(0)
  })
})
