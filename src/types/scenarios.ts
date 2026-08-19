import type { CostItem, DeductionItem, DiversificationSlice, WantItem } from './budget'
import type { SalaryInputMode } from './core'

export interface FinanceScenarioData {
  salaryNet: number
  salaryInputMode: SalaryInputMode
  costs: CostItem[]
  wants: WantItem[]
  deductions: DeductionItem[]
  selectedModelId: string
  diversification: DiversificationSlice[]
  customModel: { n: number; d: number; i: number }
}

export interface FinanceScenario extends FinanceScenarioData {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface ScenarioSummary {
  id: string
  name: string
  availableForBudget: number
  totalCosts: number
  totalWantsAmount: number
  totalPlannedInvestment: number
  balanceAfterPlan: number
  savingsRate: number
}
