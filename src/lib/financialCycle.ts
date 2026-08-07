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
  /** Obrigações que vencem agora, já incluindo desejos em conta. */
  commitmentsDueNow: number
  cashAfterDue: number
  reservedForNextInvoice: number
  availableAfterReservations: number
  /**
   * Folga depois de pagar obrigações *e* os desejos em conta planejados.
   * Prefira `discretionaryPool` quando a pergunta for “quanto posso alocar”.
   */
  safeToSpend: number
  shortfall: number
  /**
   * Quanto sobra para alocar em desejos ou investimentos — *antes* de
   * comprometer os envelopes de desejos em conta (Viagens, Qualidade de vida…).
   * `renda − fatura − custos − aporte − saídas do ano − reserva da próxima fatura`.
   */
  discretionaryAvailable: number
  /** Parte positiva de `discretionaryAvailable` (zero se estiver no vermelho). */
  discretionaryPool: number
  /** Quanto falta para cobrir obrigações + reserva, sem contar desejos em conta. */
  discretionaryShortfall: number
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

  // Pool discricionário: obrigações fixas + reserva, sem os envelopes de desejo.
  const obligationsWithoutWants =
    input.invoiceToPay + input.costsOnAccount + input.directInvestment + input.extraExpense
  const discretionaryAvailable =
    input.income - obligationsWithoutWants - reservedForNextInvoice

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
    discretionaryAvailable,
    discretionaryPool: Math.max(0, discretionaryAvailable),
    discretionaryShortfall: Math.max(0, -discretionaryAvailable),
  }
}
