// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCreditCards } from './useCreditCards'
import { useHistory } from './useHistory'
import type { MonthlySnapshot } from '../types'

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
  invested: 1000,
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
  cardByArea: { desejos: 700 },
  cashLeftover: 1800,
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
})
