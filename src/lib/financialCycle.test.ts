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
      plannedNextInvoice: 1_500,
    })

    expect(cycle.spendingMonth).toBe('2026-07')
    expect(cycle.nextSpendingMonth).toBe('2026-08')
    expect(cycle.commitmentsDueNow).toBe(7_000)
    expect(cycle.cashAfterDue).toBe(3_000)
    expect(cycle.reservedForNextInvoice).toBe(1_500)
    expect(cycle.safeToSpend).toBe(1_500)
    expect(cycle.discretionaryPool).toBe(1_500)
    expect(cycle.discretionaryShortfall).toBe(0)
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
      plannedNextInvoice: 1_000,
    })

    expect(cycle.availableAfterReservations).toBe(-500)
    expect(cycle.safeToSpend).toBe(0)
    expect(cycle.shortfall).toBe(500)
    expect(cycle.discretionaryAvailable).toBe(-500)
    expect(cycle.discretionaryPool).toBe(0)
    expect(cycle.discretionaryShortfall).toBe(500)
  })

  it('reserva a próxima fatura pelo plano quando o cartão ainda não foi todo lançado', () => {
    const cycle = calculateFinancialCycle({
      cashMonth: '2026-08',
      income: 8_800,
      invoiceToPay: 2_800,
      costsOnAccount: 4_170,
      wantsOnAccount: 700,
      directInvestment: 1_494,
      extraExpense: 0,
      nextInvoicePersonal: 153,
      plannedNextInvoice: 2_800,
    })

    expect(cycle.reservedForNextInvoice).toBe(2_800)
    expect(cycle.shortfall).toBe(3_164)
    // Pool ignora os R$ 700 de desejos em conta: 8800 − 2800 − 4170 − 1494 − 2800 = −2464
    expect(cycle.discretionaryAvailable).toBe(-2_464)
    expect(cycle.discretionaryShortfall).toBe(2_464)
    expect(cycle.discretionaryAvailable).toBe(cycle.availableAfterReservations + 700)
  })

  it('libera o envelope de desejos em conta no pool discricionário', () => {
    // Plano: cartão 2500, fatura veio 2000 → 500 a mais no pool.
    const cycle = calculateFinancialCycle({
      cashMonth: '2026-08',
      income: 8_800,
      invoiceToPay: 2_000,
      costsOnAccount: 4_170,
      wantsOnAccount: 700,
      directInvestment: 1_000,
      extraExpense: 0,
      nextInvoicePersonal: 500,
      plannedNextInvoice: 2_500,
    })

    // 8800 − 2000 − 4170 − 1000 − 2500 = −870? Wait: reserved is max(500, 2500)=2500
    // 8800 - 2000 - 4170 - 1000 - 2500 = -870
    expect(cycle.reservedForNextInvoice).toBe(2_500)
    expect(cycle.discretionaryAvailable).toBe(8800 - 2000 - 4170 - 1000 - 2500)

    // Com fatura menor e mesma reserva, o pool sobe vs uma fatura de 2500:
    const withHigherInvoice = calculateFinancialCycle({
      cashMonth: '2026-08',
      income: 8_800,
      invoiceToPay: 2_500,
      costsOnAccount: 4_170,
      wantsOnAccount: 700,
      directInvestment: 1_000,
      extraExpense: 0,
      nextInvoicePersonal: 500,
      plannedNextInvoice: 2_500,
    })
    expect(cycle.discretionaryAvailable - withHigherInvoice.discretionaryAvailable).toBe(500)
  })
})
