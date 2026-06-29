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
  mode?: WantAllocationMode
  percentage: number
  fixedAmount?: number
}

export type WantAllocationMode = 'percentage' | 'fixed'

export interface DeductionItem {
  id: string
  name: string
  value: number
  type: DeductionType
  employerContribution?: number
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

export type CreditCardCycle = 'current' | 'next'

export interface CreditCardEntry {
  id: string
  cycle: CreditCardCycle
  description: string
  purchaseDate: string
  cardName: string
  amount: number
  personalAmount: number
  remainingAmount: number
  ownerName?: string
  ownerNote?: string
  installmentCurrent?: number
  installmentTotal?: number
}

export interface CreditCardSettings {
  paymentDate: string
  personalSpendingLimit: number
}

export interface CardTotal {
  cardName: string
  totalAmount: number
  personalAmount: number
}

export interface CreditCardSummary {
  currentTotal: number
  currentPersonalTotal: number
  currentThirdPartyTotal: number
  nextTotal: number
  nextPersonalTotal: number
  remainingInstallmentsTotal: number
  availablePersonalLimit: number
  totalsByCard: CardTotal[]
  totalsByOwner: CardTotal[]
  currentEntriesCount: number
  nextEntriesCount: number
}

export interface BudgetBucket {
  target: number
  actual: number
  diff: number
  percentage: number
  baseTarget?: number
  movedIn?: number
  movedOut?: number
}

export type SalaryInputMode = 'before_payroll_deductions' | 'take_home'

export type BudgetArea = 'necessidades' | 'desejos' | 'investimentos'

export interface AllocationTransfer {
  id: string
  from: BudgetArea
  to: BudgetArea
  amount: number
}

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
  allocationTransfers: AllocationTransfer[]
  emergencyFundCurrent: number
  creditCardEntries: CreditCardEntry[]
  creditCardSettings: CreditCardSettings
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
  employerInvestmentContributions: number
  directInvestmentTarget: number
  balanceAfterCosts: number
  savingsRate: number
}
