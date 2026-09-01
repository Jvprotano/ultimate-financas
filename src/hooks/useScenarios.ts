import { useCallback, useEffect, useMemo } from 'react'
import { useRepositoryState } from '../data/repository'
import type {
  CostCategory,
  CostItem,
  DeductionType,
  DiversificationSlice,
  FinanceScenario,
  FinanceScenarioData,
  PaymentMethod,
  SalaryInputMode,
} from '../types'
import {
  cloneScenario,
  createDefaultScenario,
  moveWantInPlanningOrder,
  normalizeScenario,
} from '../lib/scenario'
import { nowIso, uid } from '../lib/shared'

function loadInitialScenarios(): FinanceScenario[] {
  return [createDefaultScenario('Atual')]
}

export function useScenarios() {
  const [storedScenarios, setScenarios] = useRepositoryState<FinanceScenario[]>(
    'scenarios',
    loadInitialScenarios,
  )
  const scenarios = useMemo(
    () => (Array.isArray(storedScenarios) ? storedScenarios.map(normalizeScenario) : []),
    [storedScenarios],
  )
  const [activeScenarioId, setActiveScenarioId] = useRepositoryState<string>(
    'activeScenarioId',
    '',
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

  const activeScenario =
    scenarios.find((scenario) => scenario.id === activeScenarioId) ??
    scenarios[0] ??
    createDefaultScenario('Atual')
  const activeId = activeScenario.id

  const updateActiveScenario = useCallback(
    (updater: (scenario: FinanceScenario) => FinanceScenario) => {
      setScenarios((prev) =>
        prev.map((scenario) =>
          scenario.id === activeId
            ? { ...updater(normalizeScenario(scenario)), updatedAt: nowIso() }
            : scenario,
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

  // Cenários -----------------------------------------------------------------

  const createScenario = useCallback(
    (name = `Cenário ${scenarios.length + 1}`) => {
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
      const scenario = cloneScenario(source, `${source.name} (cópia)`)
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
      if (id === activeId) setActiveScenarioId(remaining[0]?.id ?? '')
    },
    [activeId, scenarios, setActiveScenarioId, setScenarios],
  )

  // Custos -------------------------------------------------------------------

  const addCost = useCallback(
    (input: {
      name: string
      value: number
      category: CostCategory
      sharedAmount?: number
      sharedWith?: string
      paidWith?: PaymentMethod
    }) => {
      updateActiveScenario((scenario) => ({
        ...scenario,
        costs: [
          ...scenario.costs,
          {
            id: uid(),
            name: input.name,
            value: input.value,
            category: input.category,
            sharedAmount: input.sharedAmount || undefined,
            sharedWith: input.sharedWith?.trim() || undefined,
            paidWith: input.paidWith ?? 'account',
          },
        ],
      }))
    },
    [updateActiveScenario],
  )

  const updateCost = useCallback(
    (id: string, patch: Partial<Omit<CostItem, 'id'>>) => {
      updateActiveScenario((scenario) => ({
        ...scenario,
        costs: scenario.costs.map((cost) => (cost.id === id ? { ...cost, ...patch } : cost)),
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

  // Desejos ------------------------------------------------------------------

  const addWant = useCallback(
    (name: string, plannedAmount = 0, paidWith: PaymentMethod = 'card') => {
      updateActiveScenario((scenario) => ({
        ...scenario,
        wants: [
          ...scenario.wants,
          { id: uid(), name, plannedAmount: Math.max(0, plannedAmount), paidWith },
        ],
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

  const updateWantAmount = useCallback(
    (id: string, plannedAmount: number) => {
      updateActiveScenario((scenario) => ({
        ...scenario,
        wants: scenario.wants.map((w) =>
          w.id === id ? { ...w, plannedAmount: Math.max(0, plannedAmount) } : w,
        ),
      }))
    },
    [updateActiveScenario],
  )

  /** Atualiza vários desejos numa única escrita (rateio do pool). */
  const applyWantAmounts = useCallback(
    (updates: { id: string; plannedAmount: number }[]) => {
      if (updates.length === 0) return
      const byId = new Map(updates.map((item) => [item.id, item.plannedAmount]))
      updateActiveScenario((scenario) => ({
        ...scenario,
        wants: scenario.wants.map((w) =>
          byId.has(w.id)
            ? { ...w, plannedAmount: Math.max(0, byId.get(w.id) ?? w.plannedAmount) }
            : w,
        ),
      }))
    },
    [updateActiveScenario],
  )

  const setWantPaidWith = useCallback(
    (id: string, paidWith: PaymentMethod) => {
      updateActiveScenario((scenario) => ({
        ...scenario,
        wants: scenario.wants.map((w) =>
          w.id === id
            ? {
                ...w,
                paidWith,
                includedInCardPlan:
                  paidWith === 'account' ? false : w.includedInCardPlan,
              }
            : w,
        ),
      }))
    },
    [updateActiveScenario],
  )

  const setWantIncludedInCardPlan = useCallback(
    (id: string, includedInCardPlan: boolean) => {
      updateActiveScenario((scenario) => ({
        ...scenario,
        wants: scenario.wants.map((w) => (w.id === id ? { ...w, includedInCardPlan } : w)),
      }))
    },
    [updateActiveScenario],
  )

  const moveWant = useCallback(
    (id: string, direction: -1 | 1) => {
      updateActiveScenario((scenario) => ({
        ...scenario,
        wants: moveWantInPlanningOrder(scenario.wants, id, direction),
      }))
    },
    [updateActiveScenario],
  )

  // Descontos em folha -------------------------------------------------------

  const addDeduction = useCallback(
    (
      name: string,
      value: number,
      type: DeductionType,
      employerContribution = 0,
      linkedHoldingId?: string,
    ) => {
      updateActiveScenario((scenario) => ({
        ...scenario,
        deductions: [
          ...scenario.deductions,
          { id: uid(), name, value, type, employerContribution, linkedHoldingId },
        ],
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

  const updateDeductionEmployerContribution = useCallback(
    (id: string, employerContribution: number) => {
      updateActiveScenario((scenario) => ({
        ...scenario,
        deductions: scenario.deductions.map((d) =>
          d.id === id ? { ...d, employerContribution: Math.max(0, employerContribution) } : d,
        ),
      }))
    },
    [updateActiveScenario],
  )

  const updateDeductionHolding = useCallback(
    (id: string, linkedHoldingId?: string) => {
      updateActiveScenario((scenario) => ({
        ...scenario,
        deductions: scenario.deductions.map((deduction) =>
          deduction.id === id ? { ...deduction, linkedHoldingId } : deduction,
        ),
      }))
    },
    [updateActiveScenario],
  )

  // Diversificação -----------------------------------------------------------

  const updateDiversification = useCallback(
    (slices: DiversificationSlice[]) => setScenarioField('diversification', slices),
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

  /** Reescala os pesos para fechar exatamente 100%, preservando as proporções. */
  const normalizeDiversification = useCallback(() => {
    updateActiveScenario((scenario) => {
      const total = scenario.diversification.reduce((sum, slice) => sum + slice.percentage, 0)
      if (total <= 0 || scenario.diversification.length === 0) return scenario

      const scaled = scenario.diversification.map((slice) => ({
        ...slice,
        percentage: Math.round((slice.percentage / total) * 100),
      }))
      // O arredondamento raramente fecha 100: a sobra vai para a maior fatia.
      const rounded = scaled.reduce((sum, slice) => sum + slice.percentage, 0)
      const drift = 100 - rounded
      if (drift !== 0) {
        const largest = scaled.reduce(
          (top, slice, index) => (slice.percentage > scaled[top].percentage ? index : top),
          0,
        )
        scaled[largest] = {
          ...scaled[largest],
          percentage: Math.max(0, scaled[largest].percentage + drift),
        }
      }

      return { ...scenario, diversification: scaled }
    })
  }, [updateActiveScenario])

  /** Joga todo o percentual ainda sem destino numa fatia. */
  const assignRemainingToSlice = useCallback(
    (id: string) => {
      updateActiveScenario((scenario) => {
        const total = scenario.diversification.reduce((sum, slice) => sum + slice.percentage, 0)
        const remaining = 100 - total
        if (remaining === 0) return scenario
        return {
          ...scenario,
          diversification: scenario.diversification.map((slice) =>
            slice.id === id
              ? { ...slice, percentage: Math.max(0, Math.min(100, slice.percentage + remaining)) }
              : slice,
          ),
        }
      })
    },
    [updateActiveScenario],
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

    salaryNet: activeScenario.salaryNet,
    setSalaryNet: useCallback(
      (value: number) => setScenarioField('salaryNet', value),
      [setScenarioField],
    ),
    salaryInputMode: activeScenario.salaryInputMode,
    setSalaryInputMode: useCallback(
      (mode: SalaryInputMode) => setScenarioField('salaryInputMode', mode),
      [setScenarioField],
    ),
    costs: activeScenario.costs,
    addCost,
    updateCost,
    removeCost,
    wants: activeScenario.wants,
    addWant,
    removeWant,
    updateWantAmount,
    applyWantAmounts,
    setWantPaidWith,
    setWantIncludedInCardPlan,
    moveWant,
    deductions: activeScenario.deductions,
    addDeduction,
    removeDeduction,
    updateDeductionEmployerContribution,
    updateDeductionHolding,
    selectedModelId: activeScenario.selectedModelId,
    setSelectedModelId: useCallback(
      (id: string) => setScenarioField('selectedModelId', id),
      [setScenarioField],
    ),
    customModel: activeScenario.customModel,
    setCustomModel: useCallback(
      (model: { n: number; d: number; i: number }) => setScenarioField('customModel', model),
      [setScenarioField],
    ),
    diversification: activeScenario.diversification,
    updateDiversification,
    addDiversificationSlice,
    removeDiversificationSlice,
    normalizeDiversification,
    assignRemainingToSlice,
  }
}
