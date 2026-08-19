import type { CostCategory, CostItem } from './budget'
import type { BudgetArea } from './core'

export interface ExtraIncomeEntry {
  id: string
  name: string
  amount: number
  sourceEventId?: string
}

export type ExtraExpenseEntry = ExtraIncomeEntry

export interface MonthlyActuals {
  month: string
  costs: Record<string, number>
  extraIncome: ExtraIncomeEntry[]
  extraExpenses: ExtraExpenseEntry[]
}

export interface ActualsSummary {
  month: string
  extraIncome: ExtraIncomeEntry[]
  extraIncomeTotal: number
  extraExpenses: ExtraExpenseEntry[]
  extraExpenseTotal: number
  effectiveCosts: number
  plannedCosts: number
  variance: number
  informedCount: number
  byCategory: Map<CostCategory, number>
  rows: {
    cost: CostItem
    planned: number
    actual: number | null
    effective: number
    variance: number
  }[]
}

export interface MonthlySnapshot {
  id: string
  month: string
  closedAt: string
  scenarioId: string
  scenarioName: string
  availableForBudget: number
  paycheckInAccount: number
  extraIncome: number
  extraIncomeEntries: ExtraIncomeEntry[]
  extraExpense: number
  extraExpenseEntries: ExtraExpenseEntry[]
  costs: number
  costsPlanned: number
  wants: number
  invested: number
  balance: number
  savingsRate: number
  costsByCategory: Partial<Record<CostCategory, number>>
  grossAssets: number
  physicalAssets: number
  liabilities: number
  securedLiabilities: number
  netWorth: number
  emergencyFund: number
  cardPersonalTotal: number
  cardByArea: Partial<Record<BudgetArea, number>>
  cashLeftover: number
  note?: string
}

export interface HistoryPoint extends MonthlySnapshot {
  financialNetWorth: number
  netWorthDelta: number | null
  costsDelta: number | null
}

export type SnapshotPatch = Partial<
  Pick<
    MonthlySnapshot,
    | 'availableForBudget'
    | 'paycheckInAccount'
    | 'extraIncome'
    | 'extraExpense'
    | 'costs'
    | 'wants'
    | 'invested'
    | 'grossAssets'
    | 'physicalAssets'
    | 'liabilities'
    | 'securedLiabilities'
    | 'emergencyFund'
    | 'cardPersonalTotal'
    | 'cashLeftover'
    | 'note'
  >
>

export interface HistoryStats {
  months: number
  averageCosts: number
  averageWants: number
  averageInvested: number
  averageSavingsRate: number
  averageCardPersonal: number
  netWorthGrowth: number
  netWorthGrowthPct: number
  bestSavingsMonth: MonthlySnapshot | null
}
