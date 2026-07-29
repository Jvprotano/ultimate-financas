import type {
  ExpectedEvent,
  ExpectedEventKind,
  ExpectedEventRecurrence,
  ExpectedOccurrence,
  ForecastAssumptions,
  ForecastPoint,
} from '../types'
import { addMonths, finiteNumber, monthKey, monthsBetween, nowIso, uid } from './shared'

// ---------------------------------------------------------------------------
// Futuro.
//
// O orçamento mensal não conhece 13º, bônus, férias, IPTU nem seguro do carro:
// são valores que você já sabe que vêm, mas caem fora do mês a mês. Este módulo
// os transforma em ocorrências datadas e projeta o patrimônio a partir delas,
// do aporte recorrente e de um rendimento esperado.
// ---------------------------------------------------------------------------

const RECURRENCES: ExpectedEventRecurrence[] = ['once', 'yearly', 'monthly']

export const DEFAULT_ASSUMPTIONS: ForecastAssumptions = {
  monthlyContribution: null,
  annualReturnPct: 10,
  includeLeftover: false,
  horizonMonths: 18,
}

export function normalizeExpectedEvent(raw: Partial<ExpectedEvent> | undefined): ExpectedEvent {
  const kind: ExpectedEventKind = raw?.kind === 'expense' ? 'expense' : 'income'
  const savedPct = Math.max(0, Math.min(100, finiteNumber(raw?.savedPct, 100)))

  return {
    id: raw?.id || uid(),
    name: raw?.name?.trim() || (kind === 'income' ? 'Entrada' : 'Saída'),
    kind,
    amount: Math.max(0, finiteNumber(raw?.amount)),
    month: /^\d{4}-\d{2}$/.test(raw?.month ?? '') ? (raw?.month as string) : monthKey(),
    recurrence: RECURRENCES.includes(raw?.recurrence as ExpectedEventRecurrence)
      ? (raw?.recurrence as ExpectedEventRecurrence)
      : 'once',
    savedPct: kind === 'income' ? savedPct : undefined,
    goalId: raw?.goalId || undefined,
    note: raw?.note?.trim() || undefined,
    createdAt: raw?.createdAt || nowIso(),
  }
}

export function normalizeAssumptions(
  raw: Partial<ForecastAssumptions> | undefined,
): ForecastAssumptions {
  const contribution = raw?.monthlyContribution
  return {
    monthlyContribution:
      typeof contribution === 'number' && Number.isFinite(contribution) && contribution >= 0
        ? contribution
        : null,
    annualReturnPct: Math.max(-50, Math.min(60, finiteNumber(raw?.annualReturnPct, 10))),
    includeLeftover: raw?.includeLeftover === true,
    horizonMonths: Math.max(3, Math.min(120, Math.round(finiteNumber(raw?.horizonMonths, 18)))),
  }
}

/** O evento acontece neste mês? */
export function occursIn(event: ExpectedEvent, month: string): boolean {
  const distance = monthsBetween(event.month, month)
  if (distance < 0) return false
  if (event.recurrence === 'once') return distance === 0
  if (event.recurrence === 'monthly') return true
  return distance % 12 === 0
}

function toOccurrence(event: ExpectedEvent, month: string): ExpectedOccurrence {
  const signedAmount = event.kind === 'income' ? event.amount : -event.amount
  // Uma entrada só vira patrimônio na fatia que você poupa; uma saída esperada
  // sai inteira do que sobraria.
  const savedAmount =
    event.kind === 'income' ? (event.amount * (event.savedPct ?? 100)) / 100 : -event.amount

  return { event, month, signedAmount, savedAmount }
}

export function occurrencesInMonth(events: ExpectedEvent[], month: string): ExpectedOccurrence[] {
  return events.filter((event) => occursIn(event, month)).map((event) => toOccurrence(event, month))
}

/** Todas as ocorrências entre `startMonth` e os `months` meses seguintes. */
export function occurrencesInRange(
  events: ExpectedEvent[],
  startMonth: string,
  months: number,
): ExpectedOccurrence[] {
  const list: ExpectedOccurrence[] = []
  for (let index = 0; index < months; index += 1) {
    list.push(...occurrencesInMonth(events, addMonths(startMonth, index)))
  }
  return list
}

export interface UpcomingSummary {
  income: number
  expense: number
  net: number
  /** Quanto do saldo esperado vira patrimônio. */
  saved: number
  occurrences: ExpectedOccurrence[]
}

export function summarizeUpcoming(
  events: ExpectedEvent[],
  startMonth: string,
  months: number,
): UpcomingSummary {
  const occurrences = occurrencesInRange(events, startMonth, months)
  const income = occurrences
    .filter((item) => item.event.kind === 'income')
    .reduce((sum, item) => sum + item.event.amount, 0)
  const expense = occurrences
    .filter((item) => item.event.kind === 'expense')
    .reduce((sum, item) => sum + item.event.amount, 0)

  return {
    income,
    expense,
    net: income - expense,
    saved: occurrences.reduce((sum, item) => sum + item.savedAmount, 0),
    occurrences,
  }
}

// ---------------------------------------------------------------------------
// Projeção
// ---------------------------------------------------------------------------

export interface ProjectionInput {
  startMonth: string
  startNetWorth: number
  monthlyContribution: number
  annualReturnPct: number
  horizonMonths: number
  events: ExpectedEvent[]
}

/**
 * Patrimônio mês a mês a partir de hoje. O primeiro ponto é o presente (sem
 * aporte nem rendimento), para o gráfico começar no número que o app já mostra.
 */
export function projectNetWorth(input: ProjectionInput): ForecastPoint[] {
  const monthlyRate = Math.pow(1 + input.annualReturnPct / 100, 1 / 12) - 1
  const points: ForecastPoint[] = [
    {
      month: input.startMonth,
      netWorth: input.startNetWorth,
      contribution: 0,
      eventsSaved: 0,
      returns: 0,
      occurrences: [],
    },
  ]

  let value = input.startNetWorth
  for (let index = 1; index <= input.horizonMonths; index += 1) {
    const month = addMonths(input.startMonth, index)
    const occurrences = occurrencesInMonth(input.events, month)
    const eventsSaved = occurrences.reduce((sum, item) => sum + item.savedAmount, 0)
    const returns = value * monthlyRate

    value = Math.max(0, value + input.monthlyContribution + eventsSaved + returns)
    points.push({ month, netWorth: value, contribution: input.monthlyContribution, eventsSaved, returns, occurrences })
  }

  return points
}

/** Patrimônio projetado para um mês — null se estiver fora do horizonte. */
export function projectedAt(points: ForecastPoint[], month: string): number | null {
  const point = points.find((item) => item.month === month)
  if (point) return point.netWorth
  // Mês anterior ao início: o presente é a melhor resposta possível.
  const first = points[0]
  if (first && monthsBetween(first.month, month) <= 0) return first.netWorth
  return null
}

export const EVENT_SUGGESTIONS: {
  name: string
  kind: ExpectedEventKind
  recurrence: ExpectedEventRecurrence
  monthIndex: number
}[] = [
  { name: '13º salário', kind: 'income', recurrence: 'yearly', monthIndex: 12 },
  { name: 'Bônus anual', kind: 'income', recurrence: 'yearly', monthIndex: 3 },
  { name: 'Férias', kind: 'income', recurrence: 'yearly', monthIndex: 1 },
  { name: 'Restituição do IR', kind: 'income', recurrence: 'yearly', monthIndex: 6 },
  { name: 'IPTU', kind: 'expense', recurrence: 'yearly', monthIndex: 2 },
  { name: 'IPVA', kind: 'expense', recurrence: 'yearly', monthIndex: 1 },
  { name: 'Seguro do carro', kind: 'expense', recurrence: 'yearly', monthIndex: 5 },
  { name: 'Matrícula / material', kind: 'expense', recurrence: 'yearly', monthIndex: 1 },
]

/** Próxima ocorrência de um mês do calendário (1–12), a partir de hoje. */
export function nextMonthKeyFor(monthIndex: number, from = monthKey()): string {
  const [year, current] = from.split('-').map(Number)
  const target = Math.min(12, Math.max(1, monthIndex))
  const targetYear = target >= current ? year : year + 1
  return `${targetYear}-${String(target).padStart(2, '0')}`
}
