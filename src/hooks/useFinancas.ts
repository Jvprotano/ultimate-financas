import { useCallback, useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'
import type {
  CostItem,
  WantItem,
  DeductionItem,
  DiversificationSlice,
  CostCategory,
  DeductionType,
  BudgetBucket,
  SalaryInputMode,
} from '../types'
import { BUDGET_MODELS, DEFAULT_DIVERSIFICATION, INVESTMENT_DEDUCTION_TYPES } from '../types/constants'

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function useFinancas() {
  const [salaryNet, setSalaryNet] = useLocalStorage<number>('uf_salary_net', 0)
  const [salaryInputMode, setSalaryInputMode] = useLocalStorage<SalaryInputMode>(
    'uf_salary_input_mode',
    'before_payroll_deductions',
  )
  const [costs, setCosts] = useLocalStorage<CostItem[]>('uf_costs', [])
  const [wants, setWants] = useLocalStorage<WantItem[]>('uf_wants', [])
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
  // How much of the necessidades surplus goes to desejos (0-100), rest goes to investimentos
  const [surplusToDesejos, setSurplusToDesejos] = useLocalStorage<number>('uf_surplus_desejos', 50)

  // Costs CRUD
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

  // Wants CRUD (percentage-based)
  const addWant = useCallback(
    (name: string) => {
      setWants((prev) => [...prev, { id: uid(), name, percentage: 0 }])
    },
    [setWants],
  )

  const removeWant = useCallback(
    (id: string) => {
      setWants((prev) => prev.filter((w) => w.id !== id))
    },
    [setWants],
  )

  const updateWantPercentage = useCallback(
    (id: string, percentage: number) => {
      setWants((prev) =>
        prev.map((w) => (w.id === id ? { ...w, percentage: Math.max(0, Math.min(100, percentage)) } : w)),
      )
    },
    [setWants],
  )

  // Deductions CRUD
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

  // Selected budget model
  const selectedModel = useMemo(() => {
    const model = BUDGET_MODELS.find((m) => m.id === selectedModelId)
    if (!model) return BUDGET_MODELS[0]
    if (model.id === 'custom') {
      return { ...model, necessidades: customModel.n, desejos: customModel.d, investimentos: customModel.i }
    }
    return model
  }, [selectedModelId, customModel])

  // Totals
  const totalCosts = useMemo(() => costs.reduce((sum, c) => sum + c.value, 0), [costs])
  const totalDeductions = useMemo(() => deductions.reduce((sum, d) => sum + d.value, 0), [deductions])

  // Split deductions: investment-type vs benefit-type
  const investmentDeductions = useMemo(
    () =>
      deductions
        .filter((d) => INVESTMENT_DEDUCTION_TYPES.includes(d.type))
        .reduce((sum, d) => sum + d.value, 0),
    [deductions],
  )

  const benefitDeductions = useMemo(
    () => totalDeductions - investmentDeductions,
    [totalDeductions, investmentDeductions],
  )

  const paycheckInAccount = useMemo(
    () =>
      salaryInputMode === 'before_payroll_deductions'
        ? Math.max(0, salaryNet - totalDeductions)
        : salaryNet,
    [salaryInputMode, salaryNet, totalDeductions],
  )

  // Budget base excludes payroll benefits, but keeps investment deductions counted as investments
  const availableForBudget = useMemo(
    () =>
      salaryInputMode === 'before_payroll_deductions'
        ? Math.max(0, salaryNet - benefitDeductions)
        : salaryNet + investmentDeductions,
    [salaryInputMode, salaryNet, benefitDeductions, investmentDeductions],
  )

  // Base budget allocation from model percentages
  const baseBudgetAllocation = useMemo(() => {
    const base = availableForBudget
    return {
      necessidades: (base * selectedModel.necessidades) / 100,
      desejos: (base * selectedModel.desejos) / 100,
      investimentos: (base * selectedModel.investimentos) / 100,
    }
  }, [availableForBudget, selectedModel])

  // Surplus from necessidades: model target minus actual fixed costs
  const necessidadesSurplus = useMemo(
    () => Math.max(0, baseBudgetAllocation.necessidades - totalCosts),
    [baseBudgetAllocation.necessidades, totalCosts],
  )

  // Effective budget allocation: base + redistributed surplus
  const budgetAllocation = useMemo(() => {
    const surplusForDesejos = necessidadesSurplus * surplusToDesejos / 100
    const surplusForInvestimentos = necessidadesSurplus - surplusForDesejos
    return {
      necessidades: baseBudgetAllocation.necessidades,
      desejos: baseBudgetAllocation.desejos + surplusForDesejos,
      investimentos: baseBudgetAllocation.investimentos + surplusForInvestimentos,
    }
  }, [baseBudgetAllocation, necessidadesSurplus, surplusToDesejos])

  // Wants: percentage-based allocation of effective desejos budget
  const totalWantsPercentage = useMemo(
    () => wants.reduce((sum, w) => sum + w.percentage, 0),
    [wants],
  )

  const wantAllocations = useMemo(
    () =>
      wants.map((w) => ({
        ...w,
        amount: (budgetAllocation.desejos * w.percentage) / 100,
      })),
    [wants, budgetAllocation.desejos],
  )

  const totalWantsAmount = useMemo(
    () => (budgetAllocation.desejos * totalWantsPercentage) / 100,
    [budgetAllocation.desejos, totalWantsPercentage],
  )

  const totalDiversificationPercentage = useMemo(
    () => diversification.reduce((sum, slice) => sum + slice.percentage, 0),
    [diversification],
  )

  // Direct investment amount = effective investment target minus what's already covered by deductions
  const directInvestmentTarget = useMemo(
    () => Math.max(0, budgetAllocation.investimentos - investmentDeductions),
    [budgetAllocation.investimentos, investmentDeductions],
  )

  const allocatedDirectInvestment = useMemo(
    () => (directInvestmentTarget * totalDiversificationPercentage) / 100,
    [directInvestmentTarget, totalDiversificationPercentage],
  )

  // Budget comparison: planned vs actual for each bucket
  const budgetComparison = useMemo((): Record<string, BudgetBucket> => {
    const nTarget = baseBudgetAllocation.necessidades
    const dEffective = budgetAllocation.desejos
    const iEffective = budgetAllocation.investimentos

    return {
      necessidades: {
        target: nTarget,
        actual: totalCosts,
        diff: nTarget - totalCosts,
        percentage: nTarget > 0 ? (totalCosts / nTarget) * 100 : 0,
      },
      desejos: {
        target: dEffective,
        actual: totalWantsAmount,
        diff: dEffective - totalWantsAmount,
        percentage: totalWantsPercentage,
      },
      investimentos: {
        target: iEffective,
        actual: investmentDeductions + allocatedDirectInvestment,
        diff: iEffective - (investmentDeductions + allocatedDirectInvestment),
        percentage: iEffective > 0 ? ((investmentDeductions + allocatedDirectInvestment) / iEffective) * 100 : 0,
      },
    }
  }, [
    allocatedDirectInvestment,
    baseBudgetAllocation,
    budgetAllocation,
    totalCosts,
    totalWantsAmount,
    totalWantsPercentage,
    investmentDeductions,
  ])

  // Investment allocation (diversification) applies to direct investment target
  const investmentAllocation = useMemo(() => {
    return diversification.map((slice) => ({
      ...slice,
      amount: (directInvestmentTarget * slice.percentage) / 100,
    }))
  }, [directInvestmentTarget, diversification])

  // Costs grouped by category
  const costsByCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of costs) {
      map.set(c.category, (map.get(c.category) || 0) + c.value)
    }
    return map
  }, [costs])

  // Remaining cash in account after current committed costs, wants and allocated direct investments
  const balanceAfterCosts = useMemo(
    () => paycheckInAccount - totalCosts - totalWantsAmount - allocatedDirectInvestment,
    [paycheckInAccount, totalCosts, totalWantsAmount, allocatedDirectInvestment],
  )

  // Unallocated money = available - costs - investment deductions
  const unallocatedMoney = useMemo(
    () => availableForBudget - totalCosts - investmentDeductions,
    [availableForBudget, totalCosts, investmentDeductions],
  )

  return {
    salaryNet,
    setSalaryNet,
    salaryInputMode,
    setSalaryInputMode,
    paycheckInAccount,
    costs,
    addCost,
    removeCost,
    wants,
    addWant,
    removeWant,
    updateWantPercentage,
    wantAllocations,
    totalWantsPercentage,
    totalWantsAmount,
    deductions,
    addDeduction,
    removeDeduction,
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
    investmentDeductions,
    benefitDeductions,
    availableForBudget,
    baseBudgetAllocation,
    budgetAllocation,
    necessidadesSurplus,
    surplusToDesejos,
    setSurplusToDesejos,
    budgetComparison,
    directInvestmentTarget,
    investmentAllocation,
    costsByCategory,
    balanceAfterCosts,
    unallocatedMoney,
  }
}
