import type { LedgerEntry } from './core'

export interface EmergencyFundState {
  current: number
  targetMonths: number
  transactions: LedgerEntry[]
}

export type GoalInclusionType =
  | 'reserve'
  | 'investments'
  | 'goals'
  | 'class'
  | 'debts'
  | 'assets'

export interface GoalInclusion {
  type: GoalInclusionType
  id?: string
}

export interface FinancialGoal {
  id: string
  name: string
  targetAmount: number
  targetMonth?: string
  color: string
  transactions: LedgerEntry[]
  createdAt: string
  completedAt?: string
  includes?: GoalInclusion[]
}

export interface GoalSummary extends FinancialGoal {
  ownBalance: number
  includedBalance: number
  current: number
  includedLabels: string[]
  remaining: number
  progress: number
  monthsLeft: number | null
  suggestedMonthly: number
  isComplete: boolean
}

export interface InvestmentAssetClass {
  id: string
  name: string
  color: string
}

export interface InvestmentHolding {
  id: string
  name: string
  assetClassId: string
  institution?: string
  marketValue: number
  transactions: LedgerEntry[]
}

export interface HoldingSummary extends InvestmentHolding {
  invested: number
  gain: number
  gainPct: number
  annualizedPct: number | null
}

export interface AssetClassSummary {
  id: string
  name: string
  color: string
  marketValue: number
  invested: number
  gain: number
  gainPct: number
  allocationPct: number
  holdings: HoldingSummary[]
}

export interface InvestmentsSummary {
  totalMarketValue: number
  totalInvested: number
  totalGain: number
  totalGainPct: number
  financialAssets: number
  physicalAssets: number
  grossAssets: number
  liabilities: number
  securedLiabilities: number
  unsecuredLiabilities: number
  financialNetWorth: number
  netWorth: number
  reserveBalance: number
  goalsBalance: number
  classes: AssetClassSummary[]
}
