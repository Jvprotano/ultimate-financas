export type ExpectedEventKind = 'income' | 'expense'
export type ExpectedEventRecurrence = 'once' | 'yearly' | 'monthly'

export interface ExpectedEvent {
  id: string
  name: string
  kind: ExpectedEventKind
  amount: number
  month: string
  recurrence: ExpectedEventRecurrence
  savedPct?: number
  goalId?: string
  note?: string
  createdAt: string
}

export interface ExpectedOccurrence {
  event: ExpectedEvent
  month: string
  signedAmount: number
  savedAmount: number
}

export interface ForecastAssumptions {
  monthlyContribution: number | null
  annualReturnPct: number
  inflationPct: number
  showInRealTerms: boolean
  includeLeftover: boolean
  reinvestFreedInstallments: boolean
  horizonMonths: number
}

export interface ForecastPoint {
  month: string
  assets: number
  properties: number
  debt: number
  securedDebt: number
  netWorth: number
  financialNetWorth: number
  assetsReal: number
  propertiesReal: number
  netWorthReal: number
  financialNetWorthReal: number
  contribution: number
  eventsSaved: number
  returns: number
  debtPaid: number
  equityBuilt: number
  occurrences: ExpectedOccurrence[]
}
