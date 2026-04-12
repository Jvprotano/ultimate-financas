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

export interface FinanceState {
  salaryGross: number
  salaryNet: number
  useGrossSalary: boolean
  costs: CostItem[]
  wants: WantItem[]
  deductions: DeductionItem[]
  selectedModelId: string
  diversification: DiversificationSlice[]
}
