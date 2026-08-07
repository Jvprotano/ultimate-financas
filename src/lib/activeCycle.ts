import { addMonths, finiteNumber, monthKey } from './shared'

/**
 * Ciclo de vida financiado pelo salário.
 *
 * Não é o mês civil do calendário: é o mês que você está *vivendo/financiando*.
 * Salário do fim de julho → Ciclo Agosto (paga fatura de julho + contas da
 * virada + desejos de agosto).
 */
export interface ActiveCycle {
  /** Mês AAAA-MM que o salário está financiando. */
  month: string
  /** Dia típico do salário “cheio” no mês anterior (só lembrete na UI). */
  salaryHintDay: number
  /** Dia típico de vencimento do cartão (só lembrete na UI). */
  cardDueHintDay: number
}

const MONTH_RE = /^\d{4}-\d{2}$/

export function isMonthKey(value: unknown): value is string {
  return typeof value === 'string' && MONTH_RE.test(value)
}

export function clampDay(value: unknown, fallback: number): number {
  const day = Math.round(finiteNumber(value, fallback))
  return Math.max(1, Math.min(31, day))
}

/**
 * Primeira carga: o salário do fim do mês anterior financia o mês civil atual.
 * Depois disso o valor persistido manda — nunca auto-corrige pelo calendário.
 */
export function defaultActiveCycle(now = new Date()): ActiveCycle {
  return {
    month: monthKey(now),
    salaryHintDay: 30,
    cardDueHintDay: 5,
  }
}

export function normalizeActiveCycle(
  raw: Partial<ActiveCycle> | undefined,
  now = new Date(),
): ActiveCycle {
  const fallback = defaultActiveCycle(now)
  return {
    month: isMonthKey(raw?.month) ? raw.month : fallback.month,
    salaryHintDay: clampDay(raw?.salaryHintDay, fallback.salaryHintDay),
    cardDueHintDay: clampDay(raw?.cardDueHintDay, fallback.cardDueHintDay),
  }
}

/** Mês dos gastos do cartão que este ciclo acerta (um mês antes). */
export function cycleSpendingMonth(cycleMonth: string): string {
  return addMonths(cycleMonth, -1)
}

/** Mês do salário que financia este ciclo (fim do mês anterior). */
export function cycleSalaryMonth(cycleMonth: string): string {
  return addMonths(cycleMonth, -1)
}

export function advanceCycleMonth(month: string): string {
  return addMonths(month, 1)
}

export function shiftCycleMonth(month: string, delta: number): string {
  return addMonths(month, delta)
}
