import type { BudgetArea, CreditCardCycle, CreditCardEntry } from '../types'
import { BUDGET_AREAS } from '../types/constants'
import { addMonths, finiteNumber } from './shared'

const MONTH_RE = /^\d{4}-\d{2}$/

export interface PaidInvoiceSnapshot {
  dueMonth: string
  personalTotal: number
  paidAt: string
}

export interface CardMonthSpending {
  spendingMonth: string
  dueMonth: string
  sourceCycle: CreditCardCycle | null
  /** Compras do mês por competência, incluindo itens antecipados. */
  spentPersonalTotal: number
  /** Parte que ainda vai efetivamente vencer na fatura. */
  duePersonalTotal: number
  personalByArea: Record<BudgetArea, number>
  unclassifiedPersonal: number
}

export interface CycleInvoiceCash {
  dueMonth: string
  personalTotal: number
  paid: boolean
  /** false quando uma versão antiga já girou a fatura e não deixou snapshot do valor pago. */
  amountKnown: boolean
}

export interface CardCycleAccounting {
  invoiceThisCycle: CycleInvoiceCash
  spendingThisCycle: CardMonthSpending
}

export function normalizePaidInvoiceSnapshot(
  raw: Partial<PaidInvoiceSnapshot> | null | undefined,
): PaidInvoiceSnapshot | null {
  if (!raw || typeof raw.dueMonth !== 'string' || !MONTH_RE.test(raw.dueMonth)) return null
  return {
    dueMonth: raw.dueMonth,
    personalTotal: Math.max(0, finiteNumber(raw.personalTotal)),
    paidAt: typeof raw.paidAt === 'string' ? raw.paidAt : '',
  }
}

function cycleForDueMonth(currentDueMonth: string, dueMonth: string): CreditCardCycle | null {
  if (dueMonth === currentDueMonth) return 'current'
  if (dueMonth === addMonths(currentDueMonth, 1)) return 'next'
  return null
}

function summarizeSpending(
  entries: CreditCardEntry[],
  sourceCycle: CreditCardCycle | null,
  spendingMonth: string,
  dueMonth: string,
): CardMonthSpending {
  const matching = sourceCycle ? entries.filter((entry) => entry.cycle === sourceCycle) : []
  const personalByArea = Object.fromEntries(BUDGET_AREAS.map((area) => [area, 0])) as Record<
    BudgetArea,
    number
  >
  let unclassifiedPersonal = 0
  let spentPersonalTotal = 0
  let duePersonalTotal = 0

  for (const entry of matching) {
    spentPersonalTotal += entry.personalAmount
    if (!entry.isPrepaid) duePersonalTotal += entry.personalAmount
    if (entry.budgetArea) personalByArea[entry.budgetArea] += entry.personalAmount
    else unclassifiedPersonal += entry.personalAmount
  }

  return {
    spendingMonth,
    dueMonth,
    sourceCycle,
    spentPersonalTotal,
    duePersonalTotal,
    personalByArea,
    unclassifiedPersonal,
  }
}

/**
 * Traduz o estado relativo `current`/`next` do cartão para o mês financeiro.
 *
 * O ciclo Agosto paga a fatura que vence em Agosto, mas o orçamento de Agosto
 * mede as compras feitas em Agosto — que normalmente vencem em Setembro. Depois
 * de pagar uma fatura, `current` gira para Setembro; esta função mantém as duas
 * leituras corretas mesmo assim.
 */
export function calculateCardCycleAccounting(input: {
  entries: CreditCardEntry[]
  currentDueMonth: string
  activeCycleMonth: string
  currentPersonalTotal: number
  lastPaidInvoice?: PaidInvoiceSnapshot | null
}): CardCycleAccounting {
  const { entries, currentDueMonth, activeCycleMonth, currentPersonalTotal } = input
  const lastPaidInvoice = normalizePaidInvoiceSnapshot(input.lastPaidInvoice)

  const paidSnapshotMatches = lastPaidInvoice?.dueMonth === activeCycleMonth
  const currentInvoiceMatches = currentDueMonth === activeCycleMonth
  const invoiceThisCycle: CycleInvoiceCash = currentInvoiceMatches
    ? {
        dueMonth: activeCycleMonth,
        personalTotal: currentPersonalTotal,
        paid: false,
        amountKnown: true,
      }
    : paidSnapshotMatches
      ? {
          dueMonth: activeCycleMonth,
          personalTotal: lastPaidInvoice.personalTotal,
          paid: true,
          amountKnown: true,
        }
      : {
          dueMonth: activeCycleMonth,
          personalTotal: 0,
          paid: false,
          amountKnown: false,
        }

  const spendingDueMonth = addMonths(activeCycleMonth, 1)
  const sourceCycle = cycleForDueMonth(currentDueMonth, spendingDueMonth)
  const spendingThisCycle = summarizeSpending(
    entries,
    sourceCycle,
    activeCycleMonth,
    spendingDueMonth,
  )

  return { invoiceThisCycle, spendingThisCycle }
}
