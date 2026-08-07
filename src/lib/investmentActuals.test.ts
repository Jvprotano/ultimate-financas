import { describe, expect, it } from 'vitest'
import { calculateMonthlyInvestmentActuals } from './investmentActuals'
import type { EmergencyFundState, FinancialGoal, InvestmentHolding } from '../types'

const emergencyFund: EmergencyFundState = {
  current: 0,
  targetMonths: 3,
  transactions: [],
}

function goal(overrides: Partial<FinancialGoal> = {}): FinancialGoal {
  return {
    id: 'goal',
    name: 'Meta',
    targetAmount: 10_000,
    color: '#000000',
    transactions: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function holding(overrides: Partial<InvestmentHolding> = {}): InvestmentHolding {
  return {
    id: 'holding',
    name: 'Tesouro',
    assetClassId: 'renda-fixa',
    marketValue: 0,
    transactions: [],
    ...overrides,
  }
}

describe('calculateMonthlyInvestmentActuals', () => {
  it('soma aportes líquidos em reserva, posições e metas do mês', () => {
    const result = calculateMonthlyInvestmentActuals({
      month: '2026-08',
      emergencyFund: {
        ...emergencyFund,
        transactions: [
          { id: 'r1', amount: 1_000, date: '2026-08-02T12:00:00.000Z' },
          { id: 'r2', amount: -200, date: '2026-08-10T12:00:00.000Z' },
        ],
      },
      holdings: [
        holding({
          transactions: [{ id: 'h1', amount: 500, date: '2026-08-05T12:00:00.000Z' }],
        }),
      ],
      goals: [
        goal({
          transactions: [{ id: 'g1', amount: 300, date: '2026-08-06T12:00:00.000Z' }],
        }),
      ],
    })

    expect(result).toMatchObject({
      reserveNet: 800,
      holdingsNet: 500,
      goalsNet: 300,
      directNet: 1_600,
    })
  })

  it('ignora movimentos de outros meses', () => {
    const result = calculateMonthlyInvestmentActuals({
      month: '2026-08',
      emergencyFund: {
        ...emergencyFund,
        transactions: [{ id: 'r1', amount: 1_000, date: '2026-07-31T23:59:00.000Z' }],
      },
      holdings: [],
      goals: [],
    })

    expect(result.directNet).toBe(0)
  })

  it('não conta saldo/aporte inicial como poupança do mês', () => {
    const result = calculateMonthlyInvestmentActuals({
      month: '2026-08',
      emergencyFund: {
        ...emergencyFund,
        transactions: [
          { id: 'r1', amount: 2_000, date: '2026-08-01T12:00:00.000Z', note: 'Saldo inicial' },
        ],
      },
      holdings: [
        holding({
          transactions: [
            { id: 'h1', amount: 5_000, date: '2026-08-01T12:00:00.000Z', note: 'Aporte inicial' },
          ],
        }),
      ],
      goals: [],
    })

    expect(result.directNet).toBe(0)
  })

  it('transferência entre livros se anula no total realizado', () => {
    const result = calculateMonthlyInvestmentActuals({
      month: '2026-08',
      emergencyFund: {
        ...emergencyFund,
        transactions: [{ id: 'r1', amount: -500, date: '2026-08-10T12:00:00.000Z' }],
      },
      holdings: [
        holding({
          transactions: [{ id: 'h1', amount: 500, date: '2026-08-10T12:00:00.000Z' }],
        }),
      ],
      goals: [],
    })

    expect(result.directNet).toBe(0)
  })
})
