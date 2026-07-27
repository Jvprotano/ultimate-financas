import type { LedgerEntry } from '../types'

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

/** Mês de competência (AAAA-MM) de uma data — o padrão é hoje. */
export function monthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
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
    .map((tx: Partial<LedgerEntry> | undefined) => ({
      id: tx?.id || uid(),
      amount: finiteNumber(tx?.amount),
      date: tx?.date || fallbackDate,
      note: tx?.note?.trim() || undefined,
    }))
    .filter((tx) => tx.amount !== 0)
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
