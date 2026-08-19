export type BudgetArea = 'necessidades' | 'desejos' | 'investimentos'

export type SalaryInputMode = 'before_payroll_deductions' | 'take_home'

/** Separa a competência do gasto do mês em que o dinheiro sai da conta. */
export type PaymentMethod = 'card' | 'account'

/** Positivo = entrada/aporte; negativo = saída/retirada. */
export interface LedgerEntry {
  id: string
  amount: number
  date: string
  note?: string
}
