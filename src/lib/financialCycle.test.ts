import { describe, expect, it } from 'vitest'
import { calculateFinancialCycle } from './financialCycle'

describe('calculateFinancialCycle', () => {
  it('identifica a fatura anterior e reserva a próxima fatura', () => {
    const cycle = calculateFinancialCycle({
      cashMonth: '2026-08',
      income: 10_000,
      invoiceToPay: 2_000,
      costsOnAccount: 3_000,
      wantsOnAccount: 0,
      directInvestment: 2_000,
      extraExpense: 0,
      nextInvoicePersonal: 1_500,
    })

    expect(cycle.spendingMonth).toBe('2026-07')
    expect(cycle.nextSpendingMonth).toBe('2026-08')
    expect(cycle.commitmentsDueNow).toBe(7_000)
    expect(cycle.cashAfterDue).toBe(3_000)
    expect(cycle.reservedForNextInvoice).toBe(1_500)
    expect(cycle.safeToSpend).toBe(1_500)
  })

  it('mostra falta quando os compromissos consomem o caixa', () => {
    const cycle = calculateFinancialCycle({
      cashMonth: '2026-08',
      income: 8_000,
      invoiceToPay: 3_000,
      costsOnAccount: 3_000,
      wantsOnAccount: 0,
      directInvestment: 1_500,
      extraExpense: 0,
      nextInvoicePersonal: 1_000,
    })

    expect(cycle.availableAfterReservations).toBe(-500)
    expect(cycle.safeToSpend).toBe(0)
    expect(cycle.shortfall).toBe(500)
  })
})
