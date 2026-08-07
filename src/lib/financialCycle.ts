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
  /** Plano do cartão para o mês em formação, mesmo que nem tudo tenha sido lançado. */
  plannedNextInvoice: number
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
  plannedNextInvoice: number
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
  const reservedForNextInvoice = Math.max(input.nextInvoicePersonal, input.plannedNextInvoice)
  const availableAfterReservations = cashAfterDue - reservedForNextInvoice

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
    plannedNextInvoice: input.plannedNextInvoice,
    commitmentsDueNow,
    cashAfterDue,
    reservedForNextInvoice,
    availableAfterReservations,
    safeToSpend: Math.max(0, availableAfterReservations),
    shortfall: Math.max(0, -availableAfterReservations),
  }
}
