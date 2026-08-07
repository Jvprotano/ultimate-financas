import { addMonths } from './shared'

/** O ciclo financiado pelo recebimento mais recente. */
export interface FinancialCycleInput {
  cashMonth: string
  income: number
  invoiceToPay: number
  costsOnAccount: number
  wantsOnAccount: number
  directInvestment: number
  extraExpense: number
  /** Compras já feitas no cartão, reservadas para a próxima fatura. */
  nextInvoicePersonal: number
}

export interface FinancialCycleSummary {
  cashMonth: string
  spendingMonth: string
  nextSpendingMonth: string
  income: number
  invoiceToPay: number
  costsOnAccount: number
  wantsOnAccount: number
  directInvestment: number
  extraExpense: number
  nextInvoicePersonal: number
  commitmentsDueNow: number
  cashAfterDue: number
  reservedForNextInvoice: number
  availableAfterReservations: number
  safeToSpend: number
  shortfall: number
}

export function calculateFinancialCycle(input: FinancialCycleInput): FinancialCycleSummary {
  const commitmentsDueNow =
    input.invoiceToPay +
    input.costsOnAccount +
    input.wantsOnAccount +
    input.directInvestment +
    input.extraExpense
  const cashAfterDue = input.income - commitmentsDueNow
  const availableAfterReservations = cashAfterDue - input.nextInvoicePersonal

  return {
    cashMonth: input.cashMonth,
    spendingMonth: addMonths(input.cashMonth, -1),
    nextSpendingMonth: input.cashMonth,
    income: input.income,
    invoiceToPay: input.invoiceToPay,
    costsOnAccount: input.costsOnAccount,
    wantsOnAccount: input.wantsOnAccount,
    directInvestment: input.directInvestment,
    extraExpense: input.extraExpense,
    nextInvoicePersonal: input.nextInvoicePersonal,
    commitmentsDueNow,
    cashAfterDue,
    reservedForNextInvoice: input.nextInvoicePersonal,
    availableAfterReservations,
    safeToSpend: Math.max(0, availableAfterReservations),
    shortfall: Math.max(0, -availableAfterReservations),
  }
}
