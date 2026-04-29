import { useCallback, useEffect, useMemo } from 'react'
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
  FinanceScenario,
  FinanceScenarioData,
  ScenarioSummary,
} from '../types'
import { BUDGET_MODELS, DEFAULT_DIVERSIFICATION, INVESTMENT_DEDUCTION_TYPES } from '../types/constants'

const SCENARIOS_STORAGE_KEY = 'uf_scenarios_v2'
const ACTIVE_SCENARIO_STORAGE_KEY = 'uf_active_scenario_v2'

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function nowIso(): string {
  return new Date().toISOString()
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const item = window.localStorage.getItem(key)
    return item ? (JSON.parse(item) as T) : fallback
  } catch {
    return fallback
  }
}

function createDefaultScenario(name = 'Atual'): FinanceScenario {
  const timestamp = nowIso()

  return {
    id: uid(),
    name,
    createdAt: timestamp,
    updatedAt: timestamp,
    salaryNet: 0,
    salaryInputMode: 'before_payroll_deductions',
    costs: [],
    wants: [],
    deductions: [],
    selectedModelId: '50-30-20',
    diversification: DEFAULT_DIVERSIFICATION,
    customModel: { n: 50, d: 30, i: 20 },
    surplusToDesejos: 50,
  }
}

function migrateLegacyScenario(): FinanceScenario {
  const timestamp = nowIso()

  return {
    id: uid(),
    name: 'Atual',
    createdAt: timestamp,
    updatedAt: timestamp,
    salaryNet: readJson<number>('uf_salary_net', 0),
    salaryInputMode: readJson<SalaryInputMode>('uf_salary_input_mode', 'before_payroll_deductions'),
    costs: readJson<CostItem[]>('uf_costs', []),
    wants: readJson<WantItem[]>('uf_wants', []),
    deductions: readJson<DeductionItem[]>('uf_deductions', []),
    selectedModelId: readJson<string>('uf_model', '50-30-20'),
    diversification: readJson<DiversificationSlice[]>('uf_diversification', DEFAULT_DIVERSIFICATION),
    customModel: readJson<{ n: number; d: number; i: number }>('uf_custom_model', { n: 50, d: 30, i: 20 }),
    surplusToDesejos: readJson<number>('uf_surplus_desejos', 50),
  }
}

function loadInitialScenarios(): FinanceScenario[] {
  const existing = readJson<FinanceScenario[] | null>(SCENARIOS_STORAGE_KEY, null)
  if (existing?.length) return existing

  const legacyScenario = migrateLegacyScenario()
  const hasLegacyData =
    legacyScenario.salaryNet > 0 ||
    legacyScenario.costs.length > 0 ||
    legacyScenario.wants.length > 0 ||
    legacyScenario.deductions.length > 0

  return hasLegacyData ? [legacyScenario] : [createDefaultScenario('Atual')]
}

function cloneScenario(source: FinanceScenario, name: string): FinanceScenario {
  const timestamp = nowIso()

  return {
    ...structuredClone(source),
    id: uid(),
    name,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

function getSelectedModel(state: FinanceScenarioData) {
  const model = BUDGET_MODELS.find((m) => m.id === state.selectedModelId) ?? BUDGET_MODELS[0]
  if (model.id === 'custom') {
    return {
      ...model,
      necessidades: state.customModel.n,
      desejos: state.customModel.d,
      investimentos: state.customModel.i,
    }
  }
  return model
}

function calculateScenario(state: FinanceScenarioData) {
  const selectedModel = getSelectedModel(state)
  const totalCosts = state.costs.reduce((sum, c) => sum + c.value, 0)
  const totalDeductions = state.deductions.reduce((sum, d) => sum + d.value, 0)
  const investmentDeductions = state.deductions
    .filter((d) => INVESTMENT_DEDUCTION_TYPES.includes(d.type))
    .reduce((sum, d) => sum + d.value, 0)
  const benefitDeductions = totalDeductions - investmentDeductions
  const paycheckInAccount =
    state.salaryInputMode === 'before_payroll_deductions'
      ? Math.max(0, state.salaryNet - totalDeductions)
      : state.salaryNet
  const availableForBudget =
    state.salaryInputMode === 'before_payroll_deductions'
      ? Math.max(0, state.salaryNet - benefitDeductions)
      : state.salaryNet + investmentDeductions

  const baseBudgetAllocation = {
    necessidades: (availableForBudget * selectedModel.necessidades) / 100,
    desejos: (availableForBudget * selectedModel.desejos) / 100,
    investimentos: (availableForBudget * selectedModel.investimentos) / 100,
  }

  const necessidadesSurplus = Math.max(0, baseBudgetAllocation.necessidades - totalCosts)
  const surplusForDesejos = (necessidadesSurplus * state.surplusToDesejos) / 100
  const surplusForInvestimentos = necessidadesSurplus - surplusForDesejos

  const budgetAllocation = {
    necessidades: baseBudgetAllocation.necessidades,
    desejos: baseBudgetAllocation.desejos + surplusForDesejos,
    investimentos: baseBudgetAllocation.investimentos + surplusForInvestimentos,
  }

  const totalWantsPercentage = state.wants.reduce((sum, w) => sum + w.percentage, 0)
  const wantAllocations = state.wants.map((w) => ({
    ...w,
    amount: (budgetAllocation.desejos * w.percentage) / 100,
  }))
  const totalWantsAmount = (budgetAllocation.desejos * totalWantsPercentage) / 100
  const totalDiversificationPercentage = state.diversification.reduce((sum, slice) => sum + slice.percentage, 0)
  const directInvestmentTarget = Math.max(0, budgetAllocation.investimentos - investmentDeductions)
  const allocatedDirectInvestment = (directInvestmentTarget * totalDiversificationPercentage) / 100

  const budgetComparison: Record<string, BudgetBucket> = {
    necessidades: {
      target: baseBudgetAllocation.necessidades,
      actual: totalCosts,
      diff: baseBudgetAllocation.necessidades - totalCosts,
      percentage: baseBudgetAllocation.necessidades > 0 ? (totalCosts / baseBudgetAllocation.necessidades) * 100 : 0,
    },
    desejos: {
      target: budgetAllocation.desejos,
      actual: totalWantsAmount,
      diff: budgetAllocation.desejos - totalWantsAmount,
      percentage: totalWantsPercentage,
    },
    investimentos: {
      target: budgetAllocation.investimentos,
      actual: investmentDeductions + allocatedDirectInvestment,
      diff: budgetAllocation.investimentos - (investmentDeductions + allocatedDirectInvestment),
      percentage:
        budgetAllocation.investimentos > 0
          ? ((investmentDeductions + allocatedDirectInvestment) / budgetAllocation.investimentos) * 100
          : 0,
    },
  }

  const investmentAllocation = state.diversification.map((slice) => ({
    ...slice,
    amount: (directInvestmentTarget * slice.percentage) / 100,
  }))

  const costsByCategory = new Map<string, number>()
  for (const c of state.costs) {
    costsByCategory.set(c.category, (costsByCategory.get(c.category) || 0) + c.value)
  }

  const balanceAfterCosts = paycheckInAccount - totalCosts - totalWantsAmount - allocatedDirectInvestment
  const unallocatedMoney = availableForBudget - totalCosts - investmentDeductions

  return {
    selectedModel,
    totalCosts,
    totalDeductions,
    investmentDeductions,
    benefitDeductions,
    paycheckInAccount,
    availableForBudget,
    baseBudgetAllocation,
    budgetAllocation,
    necessidadesSurplus,
    totalWantsPercentage,
    wantAllocations,
    totalWantsAmount,
    totalDiversificationPercentage,
    directInvestmentTarget,
    allocatedDirectInvestment,
    budgetComparison,
    investmentAllocation,
    costsByCategory,
    balanceAfterCosts,
    unallocatedMoney,
  }
}

export function useFinancas() {
  const [scenarios, setScenarios] = useLocalStorage<FinanceScenario[]>(SCENARIOS_STORAGE_KEY, loadInitialScenarios())
  const [activeScenarioId, setActiveScenarioId] = useLocalStorage<string>(
    ACTIVE_SCENARIO_STORAGE_KEY,
    scenarios[0]?.id ?? '',
  )

  useEffect(() => {
    if (scenarios.length === 0) {
      const scenario = createDefaultScenario('Atual')
      setScenarios([scenario])
      setActiveScenarioId(scenario.id)
      return
    }

    if (!scenarios.some((scenario) => scenario.id === activeScenarioId)) {
      setActiveScenarioId(scenarios[0].id)
    }
  }, [activeScenarioId, scenarios, setActiveScenarioId, setScenarios])

  const activeScenario = scenarios.find((scenario) => scenario.id === activeScenarioId) ?? scenarios[0] ?? createDefaultScenario('Atual')
  const activeId = activeScenario?.id ?? ''

  const updateActiveScenario = useCallback(
    (updater: (scenario: FinanceScenario) => FinanceScenario) => {
      setScenarios((prev) =>
        prev.map((scenario) =>
          scenario.id === activeId ? { ...updater(scenario), updatedAt: nowIso() } : scenario,
        ),
      )
    },
    [activeId, setScenarios],
  )

  const setScenarioField = useCallback(
    <K extends keyof FinanceScenarioData>(field: K, value: FinanceScenarioData[K]) => {
      updateActiveScenario((scenario) => ({ ...scenario, [field]: value }))
    },
    [updateActiveScenario],
  )

  const createScenario = useCallback(
    (name = `Cenario ${scenarios.length + 1}`) => {
      const scenario = createDefaultScenario(name)
      setScenarios((prev) => [...prev, scenario])
      setActiveScenarioId(scenario.id)
    },
    [scenarios.length, setActiveScenarioId, setScenarios],
  )

  const duplicateScenario = useCallback(
    (sourceId = activeId) => {
      const source = scenarios.find((scenario) => scenario.id === sourceId) ?? activeScenario
      if (!source) return
      const scenario = cloneScenario(source, `${source.name} - futuro`)
      setScenarios((prev) => [...prev, scenario])
      setActiveScenarioId(scenario.id)
    },
    [activeId, activeScenario, scenarios, setActiveScenarioId, setScenarios],
  )

  const renameScenario = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      setScenarios((prev) =>
        prev.map((scenario) =>
          scenario.id === id ? { ...scenario, name: trimmed, updatedAt: nowIso() } : scenario,
        ),
      )
    },
    [setScenarios],
  )

  const removeScenario = useCallback(
    (id: string) => {
      if (scenarios.length <= 1) return
      const remaining = scenarios.filter((scenario) => scenario.id !== id)
      setScenarios(remaining)
      if (id === activeId) {
        setActiveScenarioId(remaining[0]?.id ?? '')
      }
    },
    [activeId, scenarios, setActiveScenarioId, setScenarios],
  )

  // Costs CRUD
  const addCost = useCallback(
    (name: string, value: number, category: CostCategory) => {
      updateActiveScenario((scenario) => ({
        ...scenario,
        costs: [...scenario.costs, { id: uid(), name, value, category }],
      }))
    },
    [updateActiveScenario],
  )

  const removeCost = useCallback(
    (id: string) => {
      updateActiveScenario((scenario) => ({
        ...scenario,
        costs: scenario.costs.filter((c) => c.id !== id),
      }))
    },
    [updateActiveScenario],
  )

  // Wants CRUD
  const addWant = useCallback(
    (name: string) => {
      updateActiveScenario((scenario) => ({
        ...scenario,
        wants: [...scenario.wants, { id: uid(), name, percentage: 0 }],
      }))
    },
    [updateActiveScenario],
  )

  const removeWant = useCallback(
    (id: string) => {
      updateActiveScenario((scenario) => ({
        ...scenario,
        wants: scenario.wants.filter((w) => w.id !== id),
      }))
    },
    [updateActiveScenario],
  )

  const updateWantPercentage = useCallback(
    (id: string, percentage: number) => {
      updateActiveScenario((scenario) => ({
        ...scenario,
        wants: scenario.wants.map((w) =>
          w.id === id ? { ...w, percentage: Math.max(0, Math.min(100, percentage)) } : w,
        ),
      }))
    },
    [updateActiveScenario],
  )

  // Deductions CRUD
  const addDeduction = useCallback(
    (name: string, value: number, type: DeductionType) => {
      updateActiveScenario((scenario) => ({
        ...scenario,
        deductions: [...scenario.deductions, { id: uid(), name, value, type }],
      }))
    },
    [updateActiveScenario],
  )

  const removeDeduction = useCallback(
    (id: string) => {
      updateActiveScenario((scenario) => ({
        ...scenario,
        deductions: scenario.deductions.filter((d) => d.id !== id),
      }))
    },
    [updateActiveScenario],
  )

  // Diversification
  const updateDiversification = useCallback(
    (slices: DiversificationSlice[]) => {
      setScenarioField('diversification', slices)
    },
    [setScenarioField],
  )

  const addDiversificationSlice = useCallback(
    (name: string, percentage: number, color: string) => {
      updateActiveScenario((scenario) => ({
        ...scenario,
        diversification: [...scenario.diversification, { id: uid(), name, percentage, color }],
      }))
    },
    [updateActiveScenario],
  )

  const removeDiversificationSlice = useCallback(
    (id: string) => {
      updateActiveScenario((scenario) => ({
        ...scenario,
        diversification: scenario.diversification.filter((s) => s.id !== id),
      }))
    },
    [updateActiveScenario],
  )

  const metrics = useMemo(() => calculateScenario(activeScenario), [activeScenario])

  const scenarioSummaries = useMemo<ScenarioSummary[]>(
    () =>
      scenarios.map((scenario) => {
        const summary = calculateScenario(scenario)
        const savingsRate =
          summary.availableForBudget > 0
            ? (summary.budgetComparison.investimentos.actual / summary.availableForBudget) * 100
            : 0

        return {
          id: scenario.id,
          name: scenario.name,
          salaryNet: scenario.salaryNet,
          paycheckInAccount: summary.paycheckInAccount,
          availableForBudget: summary.availableForBudget,
          totalCosts: summary.totalCosts,
          totalWantsAmount: summary.totalWantsAmount,
          investmentDeductions: summary.investmentDeductions,
          directInvestmentTarget: summary.directInvestmentTarget,
          balanceAfterCosts: summary.balanceAfterCosts,
          savingsRate,
        }
      }),
    [scenarios],
  )

  return {
    scenarios,
    activeScenario,
    activeScenarioId: activeId,
    setActiveScenarioId,
    createScenario,
    duplicateScenario,
    renameScenario,
    removeScenario,
    scenarioSummaries,
    salaryNet: activeScenario.salaryNet,
    setSalaryNet: (value: number) => setScenarioField('salaryNet', value),
    salaryInputMode: activeScenario.salaryInputMode,
    setSalaryInputMode: (mode: SalaryInputMode) => setScenarioField('salaryInputMode', mode),
    paycheckInAccount: metrics.paycheckInAccount,
    costs: activeScenario.costs,
    addCost,
    removeCost,
    wants: activeScenario.wants,
    addWant,
    removeWant,
    updateWantPercentage,
    wantAllocations: metrics.wantAllocations,
    totalWantsPercentage: metrics.totalWantsPercentage,
    totalWantsAmount: metrics.totalWantsAmount,
    deductions: activeScenario.deductions,
    addDeduction,
    removeDeduction,
    selectedModelId: activeScenario.selectedModelId,
    setSelectedModelId: (id: string) => setScenarioField('selectedModelId', id),
    selectedModel: metrics.selectedModel,
    customModel: activeScenario.customModel,
    setCustomModel: (model: { n: number; d: number; i: number }) => setScenarioField('customModel', model),
    diversification: activeScenario.diversification,
    updateDiversification,
    addDiversificationSlice,
    removeDiversificationSlice,
    totalCosts: metrics.totalCosts,
    totalDeductions: metrics.totalDeductions,
    investmentDeductions: metrics.investmentDeductions,
    benefitDeductions: metrics.benefitDeductions,
    availableForBudget: metrics.availableForBudget,
    baseBudgetAllocation: metrics.baseBudgetAllocation,
    budgetAllocation: metrics.budgetAllocation,
    necessidadesSurplus: metrics.necessidadesSurplus,
    surplusToDesejos: activeScenario.surplusToDesejos,
    setSurplusToDesejos: (value: number) => setScenarioField('surplusToDesejos', value),
    budgetComparison: metrics.budgetComparison,
    directInvestmentTarget: metrics.directInvestmentTarget,
    investmentAllocation: metrics.investmentAllocation,
    costsByCategory: metrics.costsByCategory,
    balanceAfterCosts: metrics.balanceAfterCosts,
    unallocatedMoney: metrics.unallocatedMoney,
  }
}
