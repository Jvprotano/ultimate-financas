// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCreditCards } from './useCreditCards'
import { useHistory } from './useHistory'
import { useInvestments } from './useInvestments'
import type { MonthlySnapshot } from '../types'
import type { InvestmentLedgerSource } from '../lib/investmentActuals'

const snapshot: Omit<MonthlySnapshot, 'id' | 'closedAt'> = {
  month: '2026-08',
  scenarioId: 'scenario-1',
  scenarioName: 'Atual',
  availableForBudget: 5000,
  paycheckInAccount: 5000,
  extraIncome: 500,
  extraIncomeEntries: [{ id: 'extra-1', name: 'Banco de horas', amount: 500 }],
  extraExpense: 200,
  extraExpenseEntries: [{ id: 'expense-1', name: 'IPVA', amount: 200 }],
  costs: 2000,
  costsPlanned: 1900,
  wants: 500,
  payrollInvested: 0,
  directInvestedAtClose: 1000,
  investmentProjectionVersion: 1,
  invested: 1000,
  investmentPlanCaptured: true,
  investedPlanned: 900,
  balance: 1800,
  savingsRate: 18.18,
  costsByCategory: { moradia: 1200 },
  grossAssets: 10000,
  physicalAssets: 0,
  liabilities: 0,
  securedLiabilities: 0,
  netWorth: 10000,
  emergencyFund: 5000,
  cardPersonalTotal: 700,
  cardPlanned: 650,
  cardByArea: { desejos: 700 },
  cashLeftover: 1800,
}

function historyInvestmentSource(cycleMonth: string): InvestmentLedgerSource {
  return {
    emergencyFund: { current: 1_000, targetMonths: 3, transactions: [] },
    holdings: [
      {
        id: 'reserve',
        name: 'Reserva',
        assetClassId: 'renda-fixa',
        purpose: 'emergency_fund',
        marketValue: 1_000,
        transactions: [
          {
            id: 'aporte',
            amount: 1_000,
            date: '2026-08-17T12:00:00.000Z',
            cycleMonth,
          },
        ],
      },
    ],
    goals: [],
  }
}

describe('jornadas financeiras persistidas', () => {
  beforeEach(() => localStorage.clear())

  it('fecha e reabre o mês preservando a composição de extras', () => {
    const first = renderHook(() => useHistory('2026-08'))
    act(() => expect(first.result.current.closeMonth(snapshot)).toBe(true))
    first.unmount()

    const reopened = renderHook(() => useHistory('2026-09'))
    expect(reopened.result.current.snapshots).toHaveLength(1)
    expect(reopened.result.current.snapshots[0].extraIncomeEntries).toEqual(snapshot.extraIncomeEntries)
    expect(reopened.result.current.snapshots[0].extraExpenseEntries).toEqual(snapshot.extraExpenseEntries)
  })

  it('paga a fatura sem fechar o ciclo financeiro', () => {
    const cards = renderHook(() => useCreditCards())
    act(() => {
      cards.result.current.addEntry({
        cycle: 'current',
        description: 'Mercado',
        purchaseDate: '10/08',
        cardName: 'Itaú',
        amount: 300,
        personalAmount: 300,
        remainingAmount: 0,
      })
    })
    expect(cards.result.current.summary.currentPersonalTotal).toBe(300)

    act(() => cards.result.current.payInvoice())

    expect(cards.result.current.summary.currentPersonalTotal).toBe(0)
    expect(cards.result.current.lastPaidInvoice?.personalTotal).toBe(300)
    expect(localStorage.getItem('uf_history_v1')).toBeNull()
  })

  it('grava aportes no ciclo ativo e permite escolher outra competência', () => {
    const investments = renderHook(() => useInvestments(0, {}, '2026-09'))
    act(() => {
      investments.result.current.addHolding({
        name: 'Tesouro Selic',
        assetClassId: 'renda-fixa',
      })
    })
    const holdingId = investments.result.current.holdings[0].id

    act(() => {
      investments.result.current.addHoldingTransaction(holdingId, 1_000, 'Aporte do salário')
      investments.result.current.addHoldingTransaction(
        holdingId,
        250,
        'Ajuste retroativo',
        '2026-08',
      )
    })

    const transactions = investments.result.current.holdings[0].transactions
    expect(transactions.map((transaction) => transaction.cycleMonth)).toEqual([
      '2026-09',
      '2026-08',
    ])

    act(() => {
      investments.result.current.setHoldingTransactionCycle(
        holdingId,
        transactions[0].id,
        '2026-10',
      )
    })
    expect(investments.result.current.holdings[0].transactions[0].cycleMonth).toBe('2026-10')
  })

  it('migra o snapshot legado e reflete a troca de competência no histórico', () => {
    const legacy = {
      ...snapshot,
      id: 'august',
      closedAt: '2026-08-21T22:48:06.372Z',
      availableForBudget: 9_340,
      paycheckInAccount: 8_800,
      invested: 1_540,
    } as Record<string, unknown>
    delete legacy.payrollInvested
    delete legacy.directInvestedAtClose
    delete legacy.investmentProjectionVersion
    localStorage.setItem('uf_history_v1', JSON.stringify([legacy]))

    const history = renderHook(
      ({ cycleMonth }) => useHistory('2026-09', historyInvestmentSource(cycleMonth)),
      { initialProps: { cycleMonth: '2026-08' } },
    )

    expect(history.result.current.points[0].invested).toBe(1_540)
    expect(
      JSON.parse(localStorage.getItem('uf_history_v1') ?? '[]')[0].investmentProjectionVersion,
    ).toBe(1)

    history.rerender({ cycleMonth: '2026-09' })
    expect(history.result.current.points[0].invested).toBe(540)
    expect(history.result.current.points[0].grossAssets).toBe(snapshot.grossAssets)
  })
})
