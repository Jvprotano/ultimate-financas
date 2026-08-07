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
  /** Compras já feitas no cartão — viram a fatura do *próximo* ciclo. */
  nextInvoicePersonal: number
  /** Plano do cartão para o mês em formação (também do próximo ciclo). */
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
  /**
   * Prévia da fatura do próximo ciclo (`max` do lançado e do plano).
   * Não sai deste salário — o próximo ciclo paga.
   */
  reservedForNextInvoice: number
  /** Após obrigações deste ciclo (inclui desejos em conta). Sem “reserva” da próxima. */
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
   * `renda − fatura deste ciclo − custos − aporte − saídas do ano`.
   * A fatura em formação (próximo ciclo) não entra: paga-se com o próximo salário.
   */
  discretionaryAvailable: number
  /** Parte positiva de `discretionaryAvailable` (zero se estiver no vermelho). */
  discretionaryPool: number
  /** Quanto falta para cobrir obrigações deste ciclo, sem contar desejos em conta. */
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
  // Prévia do próximo ciclo — informativa, não obrigação deste salário.
  const reservedForNextInvoice = Math.max(input.nextInvoicePersonal, input.plannedNextInvoice)

  // Pool discricionário: só o que este salário precisa cobrir agora.
  const obligationsWithoutWants =
    input.invoiceToPay + input.costsOnAccount + input.directInvestment + input.extraExpense
  const discretionaryAvailable = input.income - obligationsWithoutWants

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
    availableAfterReservations: cashAfterDue,
    safeToSpend: Math.max(0, cashAfterDue),
    shortfall: Math.max(0, -cashAfterDue),
    discretionaryAvailable,
    discretionaryPool: Math.max(0, discretionaryAvailable),
    discretionaryShortfall: Math.max(0, -discretionaryAvailable),
  }
}
