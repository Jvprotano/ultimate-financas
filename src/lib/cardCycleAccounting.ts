import type { BudgetArea, CreditCardCycle, CreditCardEntry } from '../types'
import { BUDGET_AREAS } from '../types/constants'
import { addMonths, finiteNumber } from './shared'

const MONTH_RE = /^\d{4}-\d{2}$/

type CreditCardEntryWithSpendingMonth = CreditCardEntry & { spendingMonth?: string }

export interface PaidInvoiceMonthSummary {
  spendingMonth: string
  spentPersonalTotal: number
  duePersonalTotal: number
  personalByArea: Record<BudgetArea, number>
  unclassifiedPersonal: number
}

export interface PaidInvoiceSnapshot {
  dueMonth: string
  personalTotal: number
  paidAt: string
  /** Competência preservada no instante do pagamento. */
  spending: PaidInvoiceMonthSummary[]
}

export interface CardMonthSpending {
  spendingMonth: string
  dueMonth: string
  sourceCycle: CreditCardCycle | null
  /** Compras/parcelas atribuídas ao mês por competência, inclusive antecipadas. */
  spentPersonalTotal: number
  /** Parte que ainda compõe o valor efetivamente devido da fatura. */
  duePersonalTotal: number
  personalByArea: Record<BudgetArea, number>
  unclassifiedPersonal: number
  paid: boolean
  /** false apenas quando um estado legado já girou a fatura sem preservar detalhe. */
  amountKnown: boolean
}

export interface CycleInvoiceCash {
  dueMonth: string
  personalTotal: number
  paid: boolean
  /** false quando uma versão antiga já girou a fatura e não deixou snapshot do valor pago. */
  amountKnown: boolean
}

export interface CardCycleAccounting {
  /** Fatura cujo vencimento pertence ao caixa do ciclo ativo. */
  invoiceThisCycle: CycleInvoiceCash
  /** Gastos atribuídos por competência ao ciclo ativo. */
  spendingThisCycle: CardMonthSpending
}

function emptyAreaMap(): Record<BudgetArea, number> {
  return Object.fromEntries(BUDGET_AREAS.map((area) => [area, 0])) as Record<BudgetArea, number>
}

function normalizeAreaMap(raw: Partial<Record<BudgetArea, number>> | undefined) {
  const result = emptyAreaMap()
  for (const area of BUDGET_AREAS) result[area] = Math.max(0, finiteNumber(raw?.[area]))
  return result
}

function normalizePaidInvoiceMonthSummary(
  raw: Partial<PaidInvoiceMonthSummary> | null | undefined,
): PaidInvoiceMonthSummary | null {
  if (!raw || typeof raw.spendingMonth !== 'string' || !MONTH_RE.test(raw.spendingMonth)) {
    return null
  }
  return {
    spendingMonth: raw.spendingMonth,
    spentPersonalTotal: Math.max(0, finiteNumber(raw.spentPersonalTotal)),
    duePersonalTotal: Math.max(0, finiteNumber(raw.duePersonalTotal)),
    personalByArea: normalizeAreaMap(raw.personalByArea),
    unclassifiedPersonal: Math.max(0, finiteNumber(raw.unclassifiedPersonal)),
  }
}

export function normalizePaidInvoiceSnapshot(
  raw: Partial<PaidInvoiceSnapshot> | null | undefined,
): PaidInvoiceSnapshot | null {
  if (!raw || typeof raw.dueMonth !== 'string' || !MONTH_RE.test(raw.dueMonth)) return null
  const spending = Array.isArray(raw.spending)
    ? raw.spending
        .map((item) => normalizePaidInvoiceMonthSummary(item))
        .filter((item): item is PaidInvoiceMonthSummary => item !== null)
    : []

  return {
    dueMonth: raw.dueMonth,
    personalTotal: Math.max(0, finiteNumber(raw.personalTotal)),
    paidAt: typeof raw.paidAt === 'string' ? raw.paidAt : '',
    spending,
  }
}

export function normalizePaidInvoiceSnapshots(raw: unknown): PaidInvoiceSnapshot[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => normalizePaidInvoiceSnapshot(item as Partial<PaidInvoiceSnapshot>))
    .filter((item): item is PaidInvoiceSnapshot => item !== null)
    .sort((a, b) => a.paidAt.localeCompare(b.paidAt))
}

/**
 * Mês de competência persistido no lançamento. Para backups antigos, a posição
 * `current`/`next` ainda fornece uma migração determinística.
 */
export function cardEntrySpendingMonth(entry: CreditCardEntry, currentDueMonth: string): string {
  const stored = (entry as CreditCardEntryWithSpendingMonth).spendingMonth
  if (typeof stored === 'string' && MONTH_RE.test(stored)) return stored
  return entry.cycle === 'current' ? addMonths(currentDueMonth, -1) : currentDueMonth
}

export function withCardEntrySpendingMonth(
  entry: CreditCardEntry,
  currentDueMonth: string,
): CreditCardEntry {
  return {
    ...entry,
    spendingMonth: cardEntrySpendingMonth(entry, currentDueMonth),
  } as CreditCardEntry
}

function cycleForDueMonth(currentDueMonth: string, dueMonth: string): CreditCardCycle | null {
  if (dueMonth === currentDueMonth) return 'current'
  if (dueMonth === addMonths(currentDueMonth, 1)) return 'next'
  return null
}

function summarizeEntriesForMonth(
  entries: CreditCardEntry[],
  sourceCycle: CreditCardCycle,
  spendingMonth: string,
  dueMonth: string,
  currentDueMonth: string,
): CardMonthSpending {
  const matching = entries.filter(
    (entry) =>
      entry.cycle === sourceCycle && cardEntrySpendingMonth(entry, currentDueMonth) === spendingMonth,
  )
  const personalByArea = emptyAreaMap()
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
    paid: false,
    amountKnown: true,
  }
}

/** Congela a composição da fatura antes de girá-la. */
export function createPaidInvoiceSnapshot(input: {
  entries: CreditCardEntry[]
  currentDueMonth: string
  personalTotal: number
  paidAt?: string
}): PaidInvoiceSnapshot {
  const currentEntries = input.entries.filter((entry) => entry.cycle === 'current')
  const months = new Map<string, PaidInvoiceMonthSummary>()

  for (const entry of currentEntries) {
    const spendingMonth = cardEntrySpendingMonth(entry, input.currentDueMonth)
    const row = months.get(spendingMonth) ?? {
      spendingMonth,
      spentPersonalTotal: 0,
      duePersonalTotal: 0,
      personalByArea: emptyAreaMap(),
      unclassifiedPersonal: 0,
    }
    row.spentPersonalTotal += entry.personalAmount
    if (!entry.isPrepaid) row.duePersonalTotal += entry.personalAmount
    if (entry.budgetArea) row.personalByArea[entry.budgetArea] += entry.personalAmount
    else row.unclassifiedPersonal += entry.personalAmount
    months.set(spendingMonth, row)
  }

  return {
    dueMonth: input.currentDueMonth,
    personalTotal: Math.max(0, finiteNumber(input.personalTotal)),
    paidAt: input.paidAt ?? new Date().toISOString(),
    spending: Array.from(months.values()).sort((a, b) => a.spendingMonth.localeCompare(b.spendingMonth)),
  }
}

function latestPaidInvoiceForDueMonth(paidInvoices: PaidInvoiceSnapshot[], dueMonth: string) {
  return [...paidInvoices].reverse().find((snapshot) => snapshot.dueMonth === dueMonth)
}

function latestPaidSpendingForMonth(
  paidInvoices: PaidInvoiceSnapshot[],
  spendingMonth: string,
  expectedDueMonth: string,
) {
  for (const snapshot of [...paidInvoices].reverse()) {
    const row = snapshot.spending.find((item) => item.spendingMonth === spendingMonth)
    if (row && snapshot.dueMonth === expectedDueMonth) return { snapshot, row }
  }
  for (const snapshot of [...paidInvoices].reverse()) {
    const row = snapshot.spending.find((item) => item.spendingMonth === spendingMonth)
    if (row) return { snapshot, row }
  }
  return null
}

/**
 * Traduz `current`/`next` para caixa e competência. Pagar antes ou depois do
 * fechamento produz o mesmo realizado porque a composição paga fica persistida.
 */
export function calculateCardCycleAccounting(input: {
  entries: CreditCardEntry[]
  currentDueMonth: string
  activeCycleMonth: string
  currentPersonalTotal: number
  paidInvoices?: PaidInvoiceSnapshot[]
}): CardCycleAccounting {
  const { entries, currentDueMonth, activeCycleMonth, currentPersonalTotal } = input
  const paidInvoices = normalizePaidInvoiceSnapshots(input.paidInvoices ?? [])

  const currentInvoiceMatches = currentDueMonth === activeCycleMonth
  const paidInvoiceThisCycle = latestPaidInvoiceForDueMonth(paidInvoices, activeCycleMonth)
  const invoiceThisCycle: CycleInvoiceCash = currentInvoiceMatches
    ? {
        dueMonth: activeCycleMonth,
        personalTotal: currentPersonalTotal,
        paid: false,
        amountKnown: true,
      }
    : paidInvoiceThisCycle
      ? {
          dueMonth: activeCycleMonth,
          personalTotal: paidInvoiceThisCycle.personalTotal,
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

  let spendingThisCycle: CardMonthSpending
  if (sourceCycle) {
    spendingThisCycle = summarizeEntriesForMonth(
      entries,
      sourceCycle,
      activeCycleMonth,
      spendingDueMonth,
      currentDueMonth,
    )
  } else {
    const paid = latestPaidSpendingForMonth(paidInvoices, activeCycleMonth, spendingDueMonth)
    spendingThisCycle = paid
      ? {
          ...paid.row,
          dueMonth: paid.snapshot.dueMonth,
          sourceCycle: null,
          paid: true,
          amountKnown: true,
        }
      : {
          spendingMonth: activeCycleMonth,
          dueMonth: spendingDueMonth,
          sourceCycle: null,
          spentPersonalTotal: 0,
          duePersonalTotal: 0,
          personalByArea: emptyAreaMap(),
          unclassifiedPersonal: 0,
          paid: false,
          amountKnown: false,
        }
  }

  return { invoiceThisCycle, spendingThisCycle }
}
