import { describe, expect, it } from 'vitest'
import { calculateFinancialCycle } from './financialCycle'

describe('calculateFinancialCycle', () => {
  it('paga a fatura deste ciclo e só informa a prévia da próxima', () => {
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
    // Prévia do próximo ciclo — não reduz o liberado deste salário.
    expect(cycle.reservedForNextInvoice).toBe(1_500)
    expect(cycle.safeToSpend).toBe(3_000)
    expect(cycle.discretionaryPool).toBe(3_000)
    expect(cycle.discretionaryShortfall).toBe(0)
  })

  it('mostra falta só quando as obrigações deste ciclo consomem o caixa', () => {
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

    // 8000 − 3000 − 3000 − 1500 = 500 — a prévia de R$ 1000 não cria shortfall.
    expect(cycle.availableAfterReservations).toBe(500)
    expect(cycle.safeToSpend).toBe(500)
    expect(cycle.shortfall).toBe(0)
    expect(cycle.discretionaryAvailable).toBe(500)
    expect(cycle.discretionaryPool).toBe(500)
    expect(cycle.discretionaryShortfall).toBe(0)
    expect(cycle.reservedForNextInvoice).toBe(1_000)
  })

  it('não exige reservar a próxima fatura para o ciclo fechar', () => {
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

    // Prévia grande do próximo ciclo — informativa.
    expect(cycle.reservedForNextInvoice).toBe(2_800)
    // Este ciclo: 8800 − 2800 − 4170 − 700 − 1494 = −364
    expect(cycle.shortfall).toBe(364)
    // Pool ignora os R$ 700 de desejos em conta: 8800 − 2800 − 4170 − 1494 = 336
    expect(cycle.discretionaryAvailable).toBe(336)
    expect(cycle.discretionaryShortfall).toBe(0)
    expect(cycle.discretionaryAvailable).toBe(cycle.availableAfterReservations + 700)
  })

  it('libera o envelope de desejos em conta no pool discricionário', () => {
    // Plano: cartão 2500, fatura veio 2000 → 500 a mais no pool (fatura menor).
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

    // Prévia do próximo ciclo não drena este.
    expect(cycle.reservedForNextInvoice).toBe(2_500)
    // 8800 − 2000 − 4170 − 1000 = 1630
    expect(cycle.discretionaryAvailable).toBe(1_630)

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

  it('marca shortfall discricionário só com obrigações deste ciclo', () => {
    const cycle = calculateFinancialCycle({
      cashMonth: '2026-08',
      income: 7_000,
      invoiceToPay: 3_000,
      costsOnAccount: 3_000,
      wantsOnAccount: 500,
      directInvestment: 1_500,
      extraExpense: 0,
      nextInvoicePersonal: 2_000,
      plannedNextInvoice: 2_500,
    })

    // 7000 − 3000 − 3000 − 1500 = −500
    expect(cycle.discretionaryAvailable).toBe(-500)
    expect(cycle.discretionaryShortfall).toBe(500)
    expect(cycle.reservedForNextInvoice).toBe(2_500)
  })
})
