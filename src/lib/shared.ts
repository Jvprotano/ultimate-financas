import type { ExtraIncomeEntry, LedgerEntry } from '../types'

export function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function readJson<T>(key: string, fallback: T): T {
  try {
    const item = window.localStorage.getItem(key)
    return item ? (JSON.parse(item) as T) : fallback
  } catch {
    return fallback
  }
}

export function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function normalizeExtraIncomeEntries(raw: unknown): ExtraIncomeEntry[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      const entry = item as Partial<ExtraIncomeEntry> | undefined
      return {
        id: typeof entry?.id === 'string' ? entry.id : '',
        name: typeof entry?.name === 'string' ? entry.name.trim() : '',
        amount: Math.max(0, finiteNumber(entry?.amount)),
        sourceEventId:
          typeof entry?.sourceEventId === 'string' && entry.sourceEventId
            ? entry.sourceEventId
            : undefined,
      }
    })
    .filter((entry) => entry.id && entry.name && entry.amount > 0)
}

/** Mês de competência (AAAA-MM) de uma data — o padrão é hoje. */
export function monthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** AAAA-MM deslocado em `count` meses. */
export function addMonths(month: string, count: number): string {
  const [year, index] = month.split('-').map(Number)
  if (!year || !index) return month
  const total = (year * 12 + (index - 1)) + count
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

/** Distância em meses entre dois AAAA-MM (b − a). */
export function monthsBetween(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  if (!fy || !fm || !ty || !tm) return 0
  return (ty - fy) * 12 + (tm - fm)
}

export function normalizeLedger(raw: unknown, fallbackDate = nowIso()): LedgerEntry[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((tx: Partial<LedgerEntry> | undefined) => {
      const cycleMonth =
        typeof tx?.cycleMonth === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(tx.cycleMonth)
          ? tx.cycleMonth
          : undefined
      return {
        id: tx?.id || uid(),
        amount: finiteNumber(tx?.amount),
        date: tx?.date || fallbackDate,
        note: tx?.note?.trim() || undefined,
        cycleMonth,
      }
    })
    .filter((tx) => tx.amount !== 0)
}

/**
 * Competência financeira do lançamento. Dados antigos não tinham ciclo;
 * nesses casos preservamos o comportamento histórico usando o mês da data.
 */
export function ledgerEntryCycleMonth(entry: LedgerEntry): string {
  return entry.cycleMonth ?? entry.date.slice(0, 7)
}

export function ledgerBalance(transactions: LedgerEntry[]): number {
  return transactions.reduce((sum, tx) => sum + tx.amount, 0)
}

/** Remove acentos e caixa — usado em buscas e comparações de nome. */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}
