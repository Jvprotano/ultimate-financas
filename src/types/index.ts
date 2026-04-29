export interface CostItem {
  id: string
  name: string
  value: number
  category: CostCategory
}

export type CostCategory =
  | 'moradia'
  | 'contas'
  | 'alimentacao'
  | 'transporte'
  | 'saude'
  | 'educacao'
  | 'lazer'
  | 'dividas'
  | 'outros'

export interface WantItem {
  id: string
  name: string
  percentage: number
}

export interface DeductionItem {
  id: string
  name: string
  value: number
  type: DeductionType
}

export type DeductionType =
  | 'previdencia_privada'
  | 'plano_saude'
  | 'vale_alimentacao'
  | 'vale_transporte'
  | 'seguro_vida'
  | 'outros'

export interface BudgetModel {
  id: string
  name: string
  description: string
  necessidades: number
  desejos: number
  investimentos: number
}

export interface DiversificationSlice {
  id: string
  name: string
  percentage: number
  color: string
}

export interface BudgetBucket {
  target: number
  actual: number
  diff: number
  percentage: number
}

export type SalaryInputMode = 'before_payroll_deductions' | 'take_home'

export interface FinanceScenarioData {
  salaryNet: number
  salaryInputMode: SalaryInputMode
  costs: CostItem[]
  wants: WantItem[]
  deductions: DeductionItem[]
  selectedModelId: string
  diversification: DiversificationSlice[]
  customModel: { n: number; d: number; i: number }
  surplusToDesejos: number
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
  salaryNet: number
  paycheckInAccount: number
  availableForBudget: number
  totalCosts: number
  totalWantsAmount: number
  investmentDeductions: number
  directInvestmentTarget: number
  balanceAfterCosts: number
  savingsRate: number
}
