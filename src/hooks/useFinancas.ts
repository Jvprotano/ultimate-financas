import { useCallback, useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'
import type {
  CostItem,
  DeductionItem,
  DiversificationSlice,
  CostCategory,
  DeductionType,
} from '../types'
import { BUDGET_MODELS, DEFAULT_DIVERSIFICATION } from '../types/constants'

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function useFinancas() {
  const [salaryNet, setSalaryNet] = useLocalStorage<number>('uf_salary_net', 0)
  const [costs, setCosts] = useLocalStorage<CostItem[]>('uf_costs', [])
  const [deductions, setDeductions] = useLocalStorage<DeductionItem[]>('uf_deductions', [])
  const [selectedModelId, setSelectedModelId] = useLocalStorage<string>('uf_model', '50-30-20')
  const [diversification, setDiversification] = useLocalStorage<DiversificationSlice[]>(
    'uf_diversification',
    DEFAULT_DIVERSIFICATION,
  )
  const [customModel, setCustomModel] = useLocalStorage<{ n: number; d: number; i: number }>(
    'uf_custom_model',
    { n: 50, d: 30, i: 20 },
  )

  // Costs
  const addCost = useCallback(
    (name: string, value: number, category: CostCategory) => {
      setCosts((prev) => [...prev, { id: uid(), name, value, category }])
    },
    [setCosts],
  )

  const removeCost = useCallback(
    (id: string) => {
      setCosts((prev) => prev.filter((c) => c.id !== id))
    },
    [setCosts],
  )

  const updateCost = useCallback(
    (id: string, updates: Partial<Omit<CostItem, 'id'>>) => {
      setCosts((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)))
    },
    [setCosts],
  )

  // Deductions
  const addDeduction = useCallback(
    (name: string, value: number, type: DeductionType) => {
      setDeductions((prev) => [...prev, { id: uid(), name, value, type }])
    },
    [setDeductions],
  )

  const removeDeduction = useCallback(
    (id: string) => {
      setDeductions((prev) => prev.filter((d) => d.id !== id))
    },
    [setDeductions],
  )

  const updateDeduction = useCallback(
    (id: string, updates: Partial<Omit<DeductionItem, 'id'>>) => {
      setDeductions((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)))
    },
    [setDeductions],
  )

  // Diversification
  const updateDiversification = useCallback(
    (slices: DiversificationSlice[]) => {
      setDiversification(slices)
    },
    [setDiversification],
  )

  const addDiversificationSlice = useCallback(
    (name: string, percentage: number, color: string) => {
      setDiversification((prev) => [...prev, { id: uid(), name, percentage, color }])
    },
    [setDiversification],
  )

  const removeDiversificationSlice = useCallback(
    (id: string) => {
      setDiversification((prev) => prev.filter((s) => s.id !== id))
    },
    [setDiversification],
  )

  // Computed values
  const selectedModel = useMemo(() => {
    const model = BUDGET_MODELS.find((m) => m.id === selectedModelId)
    if (!model) return BUDGET_MODELS[0]
    if (model.id === 'custom') {
      return { ...model, necessidades: customModel.n, desejos: customModel.d, investimentos: customModel.i }
    }
    return model
  }, [selectedModelId, customModel])

  const totalCosts = useMemo(() => costs.reduce((sum, c) => sum + c.value, 0), [costs])
  const totalDeductions = useMemo(() => deductions.reduce((sum, d) => sum + d.value, 0), [deductions])

  const availableForBudget = useMemo(() => {
    return Math.max(0, salaryNet - totalDeductions)
  }, [salaryNet, totalDeductions])

  const budgetAllocation = useMemo(() => {
    const base = availableForBudget
    return {
      necessidades: (base * selectedModel.necessidades) / 100,
      desejos: (base * selectedModel.desejos) / 100,
      investimentos: (base * selectedModel.investimentos) / 100,
    }
  }, [availableForBudget, selectedModel])

  const investmentAllocation = useMemo(() => {
    const totalInvestment = budgetAllocation.investimentos
    return diversification.map((slice) => ({
      ...slice,
      amount: (totalInvestment * slice.percentage) / 100,
    }))
  }, [budgetAllocation.investimentos, diversification])

  const costsByCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of costs) {
      map.set(c.category, (map.get(c.category) || 0) + c.value)
    }
    return map
  }, [costs])

  const balanceAfterCosts = useMemo(() => {
    return availableForBudget - totalCosts
  }, [availableForBudget, totalCosts])

  return {
    salaryNet,
    setSalaryNet,
    costs,
    addCost,
    removeCost,
    updateCost,
    deductions,
    addDeduction,
    removeDeduction,
    updateDeduction,
    selectedModelId,
    setSelectedModelId,
    selectedModel,
    customModel,
    setCustomModel,
    diversification,
    updateDiversification,
    addDiversificationSlice,
    removeDiversificationSlice,
    totalCosts,
    totalDeductions,
    availableForBudget,
    budgetAllocation,
    investmentAllocation,
    costsByCategory,
    balanceAfterCosts,
  }
}
