import { describe, expect, it } from 'vitest'
import { buildAlerts } from './alerts'
import { calculateFinancialCycle } from './financialCycle'

describe('buildAlerts — ciclo vs próxima fatura', () => {
  const metrics = {
    budgetComparison: {
      necessidades: { target: 1000, planned: 1000, realized: 0, diff: 0 },
      desejos: { target: 500, planned: 500, realized: 0, diff: 0 },
      investimentos: { target: 500, planned: 500, realized: 0, diff: 0 },
    },
    balanceAfterPlan: 0,
    totalDiversificationPercentage: 100,
    selectedModel: { necessidades: 50, desejos: 30, investimentos: 20 },
    availableForBudget: 2000,
    directInvestmentTarget: 400,
  } as never

  const cards = { availablePersonalLimit: 0, unclassifiedPersonal: 0 } as never
  const debts = {
    debts: [],
    unsecured: { monthlyInterest: 0, costliest: null },
  } as never

  it('alerta de ciclo sem exigir reserva da próxima fatura', () => {
    const cycle = calculateFinancialCycle({
      cashMonth: '2026-08',
      income: 7_000,
      invoiceToPay: 3_000,
      costsOnAccount: 3_000,
      wantsOnAccount: 0,
      directInvestment: 1_500,
      extraExpense: 0,
      nextInvoicePersonal: 2_000,
      plannedNextInvoice: 2_500,
    })
    expect(cycle.discretionaryShortfall).toBe(500)

    const alerts = buildAlerts(metrics, cards, cycle, debts)
    const cash = alerts.find((a) => a.id === 'cash-negative')
    expect(cash?.severity).toBe('critical')
    expect(cash?.detail).toMatch(/próximo salário/)
    expect(cash?.detail).not.toMatch(/reservar a próxima fatura/)
  })

  it('não critica o ciclo quando só a prévia do próximo cartão é alta', () => {
    // Reproduz o caso do app: R$ 87,40 de “falta” no modelo antigo.
    const cycle = calculateFinancialCycle({
      cashMonth: '2026-08',
      income: 8_800,
      invoiceToPay: 2_000,
      costsOnAccount: 4_170,
      wantsOnAccount: 500,
      directInvestment: 1_760,
      extraExpense: 0,
      nextInvoicePersonal: 400,
      plannedNextInvoice: 957.4,
    })
    // Antigo: 8800 − 2000 − 4170 − 1760 − 957.4 = −87.4
    expect(cycle.discretionaryShortfall).toBe(0)
    expect(cycle.discretionaryPool).toBe(870)

    const alerts = buildAlerts(metrics, cards, cycle, debts)
    expect(alerts.find((a) => a.id === 'cash-negative')).toBeUndefined()
    expect(alerts.some((a) => a.id === 'ok' || a.severity === 'ok')).toBe(true)
  })
})
