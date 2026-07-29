import type {
  ExpectedEvent,
  ExpectedEventKind,
  ExpectedEventRecurrence,
  ExpectedOccurrence,
  ForecastAssumptions,
  ForecastPoint,
} from '../types'
import { advanceDebtMonth } from './debts'
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
  inflationPct: 4.5,
  showInRealTerms: false,
  includeLeftover: false,
  reinvestFreedInstallments: false,
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
    inflationPct: Math.max(0, Math.min(30, finiteNumber(raw?.inflationPct, 4.5))),
    showInRealTerms: raw?.showInRealTerms === true,
    includeLeftover: raw?.includeLeftover === true,
    reinvestFreedInstallments: raw?.reinvestFreedInstallments === true,
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

/** Dívida simplificada para a projeção — só o que muda o saldo mês a mês. */
export interface ProjectedDebt {
  id: string
  balance: number
  monthlyRatePct: number
  installment: number
}

export interface ProjectionInput {
  startMonth: string
  /** Ativos de hoje (a dívida entra separada, para as duas curvas serem visíveis). */
  startAssets: number
  monthlyContribution: number
  annualReturnPct: number
  inflationPct: number
  horizonMonths: number
  events: ExpectedEvent[]
  debts?: ProjectedDebt[]
  /** Somar ao aporte a parcela de cada dívida já quitada. */
  reinvestFreedInstallments?: boolean
}

/**
 * Patrimônio mês a mês a partir de hoje. O primeiro ponto é o presente (sem
 * aporte nem rendimento), para o gráfico começar no número que o app já mostra.
 *
 * Ativos e dívidas evoluem separados: os ativos recebem aporte, eventos e
 * rendimento; cada dívida corre juros e é abatida pela parcela. A parcela *não*
 * sai dos ativos porque ela já é um custo fixo do mês — o que sobra depois dela
 * é justamente o aporte.
 */
export function projectNetWorth(input: ProjectionInput): ForecastPoint[] {
  const monthlyRate = Math.pow(1 + input.annualReturnPct / 100, 1 / 12) - 1
  const monthlyInflation = Math.pow(1 + input.inflationPct / 100, 1 / 12) - 1

  // Cópia local: a projeção consome os saldos, e o estado do app é imutável.
  const debts = (input.debts ?? []).map((debt) => ({ ...debt }))
  const startDebt = debts.reduce((sum, debt) => sum + debt.balance, 0)

  const points: ForecastPoint[] = [
    {
      month: input.startMonth,
      assets: input.startAssets,
      debt: startDebt,
      netWorth: input.startAssets - startDebt,
      assetsReal: input.startAssets,
      netWorthReal: input.startAssets - startDebt,
      contribution: 0,
      eventsSaved: 0,
      returns: 0,
      debtPaid: 0,
      occurrences: [],
    },
  ]

  let assets = input.startAssets
  for (let index = 1; index <= input.horizonMonths; index += 1) {
    const month = addMonths(input.startMonth, index)
    const occurrences = occurrencesInMonth(input.events, month)
    const eventsSaved = occurrences.reduce((sum, item) => sum + item.savedAmount, 0)
    const returns = assets * monthlyRate

    let debtPaid = 0
    let freedInstallments = 0
    for (const debt of debts) {
      if (debt.balance <= 0) {
        if (input.reinvestFreedInstallments) freedInstallments += debt.installment
        continue
      }
      const next = advanceDebtMonth(debt.balance, debt.monthlyRatePct, debt.installment)
      debtPaid += debt.balance - next.balance
      debt.balance = next.balance
    }

    const contribution = input.monthlyContribution + freedInstallments
    assets = Math.max(0, assets + contribution + eventsSaved + returns)
    const debt = debts.reduce((sum, item) => sum + item.balance, 0)
    const netWorth = assets - debt
    // Deflator acumulado até este mês: os valores em reais de hoje.
    const deflator = Math.pow(1 + monthlyInflation, index)

    points.push({
      month,
      assets,
      debt,
      netWorth,
      assetsReal: assets / deflator,
      netWorthReal: netWorth / deflator,
      contribution,
      eventsSaved,
      returns,
      debtPaid,
      occurrences,
    })
  }

  return points
}

/** Patrimônio projetado para um mês — null se estiver fora do horizonte. */
export function projectedAt(
  points: ForecastPoint[],
  month: string,
  real = false,
): number | null {
  const pick = (point: ForecastPoint) => (real ? point.netWorthReal : point.netWorth)
  const point = points.find((item) => item.month === month)
  if (point) return pick(point)
  // Mês anterior ao início: o presente é a melhor resposta possível.
  const first = points[0]
  if (first && monthsBetween(first.month, month) <= 0) return pick(first)
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
