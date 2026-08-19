import { useCallback, useEffect, useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'
import type {
  EmergencyFundState,
  FinancialGoal,
  GoalInclusion,
  InvestmentAssetClass,
  LedgerEntry,
} from '../types'
import { DEFAULT_INVESTMENT_CLASSES, GOAL_PRESET_COLORS } from '../types/constants'
import {
  calculateInvestmentsSummary,
  holdingPurpose,
  normalizeAssetClass,
  normalizeEmergencyFund,
  normalizeHolding,
  type FinancialHolding,
  type InvestmentPurpose,
} from '../lib/investments'
import { normalizeGoal, summarizeGoals, type GoalContext } from '../lib/goals'
import { finiteNumber, ledgerBalance, nowIso, readJson, uid } from '../lib/shared'
import { ACTIVE_SCENARIO_STORAGE_KEY, SCENARIOS_STORAGE_KEY } from './useScenarios'

const EMERGENCY_FUND_STORAGE_KEY = 'uf_emergency_fund_v1'
const HOLDINGS_STORAGE_KEY = 'uf_investment_holdings_v1'
const CLASSES_STORAGE_KEY = 'uf_investment_classes_v1'
const GOALS_STORAGE_KEY = 'uf_goals_v1'
const LEGACY_SCENARIOS_KEY = 'uf_scenarios_v2'
const DEFAULT_EMERGENCY_FUND: EmergencyFundState = {
  current: 0,
  targetMonths: 6,
  transactions: [],
}

/**
 * Carrega o formato antigo da reserva. Ele continua existindo para que backups
 * anteriores sejam migrados sem perda; depois, `current/transactions` são
 * esvaziados e o saldo passa a viver nas posições `emergency_fund`.
 */
function loadInitialEmergencyFund(): EmergencyFundState {
  const stored = readJson<Partial<EmergencyFundState> | null>(EMERGENCY_FUND_STORAGE_KEY, null)
  if (stored) return normalizeEmergencyFund(stored)

  type ScenarioWithFund = {
    id?: string
    createdAt?: string
    emergencyFund?: Partial<EmergencyFundState>
  }
  const hasFundData = (fund?: Partial<EmergencyFundState>) =>
    !!fund &&
    (finiteNumber(fund.current) > 0 ||
      (Array.isArray(fund.transactions) && fund.transactions.length > 0))

  const scenarios = readJson<ScenarioWithFund[] | null>(SCENARIOS_STORAGE_KEY, null)
  if (Array.isArray(scenarios) && scenarios.length) {
    const activeId = readJson<string>(ACTIVE_SCENARIO_STORAGE_KEY, '')
    const active = scenarios.find((scenario) => scenario.id === activeId)
    const source =
      active && hasFundData(active.emergencyFund)
        ? active
        : (scenarios.find((scenario) => hasFundData(scenario.emergencyFund)) ?? active ?? scenarios[0])
    return normalizeEmergencyFund(
      source?.emergencyFund,
      `${source?.id ?? 'ef'}-seed`,
      source?.createdAt || nowIso(),
    )
  }

  const legacy = readJson<Array<{ emergencyFundCurrent?: number }> | null>(
    LEGACY_SCENARIOS_KEY,
    null,
  )
  if (Array.isArray(legacy) && legacy.length) {
    const current = legacy.reduce(
      (max, item) => Math.max(max, finiteNumber(item.emergencyFundCurrent)),
      0,
    )
    return normalizeEmergencyFund({ current, targetMonths: 6, transactions: [] })
  }

  return DEFAULT_EMERGENCY_FUND
}

function loadInitialClasses(): InvestmentAssetClass[] {
  const stored = readJson<InvestmentAssetClass[] | null>(CLASSES_STORAGE_KEY, null)
  if (Array.isArray(stored) && stored.length) {
    return stored.map((item, index) => normalizeAssetClass(item, index))
  }
  return DEFAULT_INVESTMENT_CLASSES
}

function loadInitialHoldings(): FinancialHolding[] {
  const stored = readJson<FinancialHolding[] | null>(HOLDINGS_STORAGE_KEY, null)
  return Array.isArray(stored) ? stored.map(normalizeHolding) : []
}

/** Aplica um aporte/retirada a um livro-razão, limitando a saída ao saldo. */
function applyLedgerMove(transactions: LedgerEntry[], amount: number, note?: string) {
  const balance = ledgerBalance(transactions)
  const delta = amount < 0 ? -Math.min(-amount, balance) : amount
  if (delta === 0) return null
  return [
    ...transactions,
    { id: uid(), amount: delta, date: nowIso(), note: note?.trim() || undefined },
  ]
}

/**
 * `liabilities` vem do módulo de dívidas e `physicalAssets` do de bens: juntos
 * fecham o balanço. `securedLiabilities` é a fatia da dívida que tem bem do
 * outro lado — é ela que separa "quanto dinheiro eu tenho" de "quanto eu valho".
 */
export function useInvestments(
  liabilities = 0,
  { securedLiabilities = 0, physicalAssets = 0 } = {},
) {
  const [storedFund, setStoredFund] = useLocalStorage<EmergencyFundState>(
    EMERGENCY_FUND_STORAGE_KEY,
    loadInitialEmergencyFund,
  )
  const legacyEmergencyFund = useMemo(
    () => normalizeEmergencyFund(storedFund),
    [storedFund],
  )

  const [storedHoldings, setHoldings] = useLocalStorage<FinancialHolding[]>(
    HOLDINGS_STORAGE_KEY,
    loadInitialHoldings,
  )
  const holdings = useMemo(
    () => (Array.isArray(storedHoldings) ? storedHoldings.map(normalizeHolding) : []),
    [storedHoldings],
  )

  const [storedClasses, setClasses] = useLocalStorage<InvestmentAssetClass[]>(
    CLASSES_STORAGE_KEY,
    loadInitialClasses,
  )
  const investmentClasses = useMemo(
    () =>
      Array.isArray(storedClasses) && storedClasses.length
        ? storedClasses.map((item, index) => normalizeAssetClass(item, index))
        : DEFAULT_INVESTMENT_CLASSES,
    [storedClasses],
  )

  const [storedGoals, setGoals] = useLocalStorage<FinancialGoal[]>(GOALS_STORAGE_KEY, [])
  const goals = useMemo(
    () => (Array.isArray(storedGoals) ? storedGoals.map((item, i) => normalizeGoal(item, i)) : []),
    [storedGoals],
  )

  const reserveHoldings = useMemo(
    () => holdings.filter((holding) => holdingPurpose(holding) === 'emergency_fund'),
    [holdings],
  )
  const portfolioHoldings = useMemo(
    () => holdings.filter((holding) => holdingPurpose(holding) === 'portfolio'),
    [holdings],
  )

  /**
   * Migração v1 -> posições:
   * - uma base antiga tinha um único bucket com saldo/transações;
   * - criamos uma posição de Renda Fixa com a mesma trilha, sem inventar
   *   instituição, produto, benchmark ou liquidez;
   * - depois esvaziamos apenas o bucket antigo, preservando `targetMonths`.
   *
   * Enquanto o effect ainda não rodou, os cálculos usam o saldo legado como
   * fallback. Quando a posição aparece, o fallback deixa de somar — sem frame de
   * patrimônio duplicado.
   */
  useEffect(() => {
    if (reserveHoldings.length > 0 || legacyEmergencyFund.current <= 0) return

    setHoldings((prev) => {
      const normalized = Array.isArray(prev) ? prev.map(normalizeHolding) : []
      if (normalized.some((holding) => holdingPurpose(holding) === 'emergency_fund')) {
        return normalized
      }
      return [
        ...normalized,
        normalizeHolding({
          id: uid(),
          name: 'Reserva migrada',
          assetClassId: 'renda-fixa',
          purpose: 'emergency_fund',
          marketValue: legacyEmergencyFund.current,
          transactions: legacyEmergencyFund.transactions,
        }),
      ]
    })

    setStoredFund((prev) => {
      const normalized = normalizeEmergencyFund(prev)
      return { current: 0, targetMonths: normalized.targetMonths, transactions: [] }
    })
  }, [legacyEmergencyFund, reserveHoldings.length, setHoldings, setStoredFund])

  // A reserva migrada dos cenários vive só em memória até a primeira gravação.
  useEffect(() => {
    if (window.localStorage.getItem(EMERGENCY_FUND_STORAGE_KEY) === null) {
      setStoredFund((prev) => normalizeEmergencyFund(prev))
    }
  }, [setStoredFund])

  // Só o livro-razão das metas soma ao patrimônio. O que uma meta *engloba* já
  // está contado na reserva ou nas posições — somar de novo duplicaria.
  const goalOwnBalances = useMemo(() => {
    const balances: Record<string, number> = {}
    for (const goal of goals) balances[goal.id] = Math.max(0, ledgerBalance(goal.transactions))
    return balances
  }, [goals])
  const goalsBalance = useMemo(
    () => Object.values(goalOwnBalances).reduce((sum, value) => sum + value, 0),
    [goalOwnBalances],
  )

  // Posições -----------------------------------------------------------------

  const addHolding = useCallback(
    (input: {
      name: string
      assetClassId: string
      institution?: string
      initialAmount?: number
      note?: string
      purpose?: InvestmentPurpose
      benchmark?: string
      liquidity?: string
    }) => {
      const now = nowIso()
      const initial = Math.max(0, finiteNumber(input.initialAmount))
      setHoldings((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        normalizeHolding({
          id: uid(),
          name: input.name,
          assetClassId: input.assetClassId,
          institution: input.institution,
          purpose: input.purpose ?? 'portfolio',
          benchmark: input.benchmark,
          liquidity: input.liquidity,
          marketValue: initial,
          transactions:
            initial > 0
              ? [
                  {
                    id: uid(),
                    amount: initial,
                    date: now,
                    note: input.note?.trim() || 'Aporte inicial',
                  },
                ]
              : [],
        }),
      ])
    },
    [setHoldings],
  )

  const updateHolding = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<
          FinancialHolding,
          | 'name'
          | 'assetClassId'
          | 'institution'
          | 'marketValue'
          | 'purpose'
          | 'benchmark'
          | 'liquidity'
        >
      >,
    ) => {
      setHoldings((prev) =>
        (Array.isArray(prev) ? prev : []).map((holding) =>
          holding.id === id ? normalizeHolding({ ...holding, ...patch }) : normalizeHolding(holding),
        ),
      )
    },
    [setHoldings],
  )

  const removeHolding = useCallback(
    (id: string) => setHoldings((prev) => (Array.isArray(prev) ? prev : []).filter((h) => h.id !== id)),
    [setHoldings],
  )

  // Aporte/retirada: ajusta também o valor de mercado (retirada limitada a ele).
  const addHoldingTransaction = useCallback(
    (holdingId: string, amount: number, note?: string) => {
      setHoldings((prev) =>
        (Array.isArray(prev) ? prev : []).map((raw) => {
          const holding = normalizeHolding(raw)
          if (holding.id !== holdingId) return holding
          const delta = amount < 0 ? -Math.min(-amount, holding.marketValue) : amount
          if (delta === 0) return holding
          return {
            ...holding,
            transactions: [
              ...holding.transactions,
              { id: uid(), amount: delta, date: nowIso(), note: note?.trim() || undefined },
            ],
            marketValue: Math.max(0, holding.marketValue + delta),
          }
        }),
      )
    },
    [setHoldings],
  )

  const removeHoldingTransaction = useCallback(
    (holdingId: string, transactionId: string) => {
      setHoldings((prev) =>
        (Array.isArray(prev) ? prev : []).map((raw) => {
          const holding = normalizeHolding(raw)
          if (holding.id !== holdingId) return holding
          const removed = holding.transactions.find((tx) => tx.id === transactionId)
          if (!removed) return holding
          return {
            ...holding,
            transactions: holding.transactions.filter((tx) => tx.id !== transactionId),
            marketValue: Math.max(0, holding.marketValue - removed.amount),
          }
        }),
      )
    },
    [setHoldings],
  )

  // Marcação a mercado: define o saldo atual sem registrar aporte/retirada.
  const setMarketValue = useCallback(
    (holdingId: string, value: number) => {
      setHoldings((prev) =>
        (Array.isArray(prev) ? prev : []).map((raw) => {
          const holding = normalizeHolding(raw)
          return holding.id === holdingId
            ? { ...holding, marketValue: Math.max(0, value) }
            : holding
        }),
      )
    },
    [setHoldings],
  )

  // Reserva de emergência ----------------------------------------------------

  const reserveBalance =
    reserveHoldings.length > 0
      ? reserveHoldings.reduce((sum, holding) => sum + holding.marketValue, 0)
      : legacyEmergencyFund.current

  const emergencyFund = useMemo<EmergencyFundState>(
    () => ({
      current: reserveBalance,
      targetMonths: legacyEmergencyFund.targetMonths,
      transactions:
        reserveHoldings.length > 0
          ? reserveHoldings.flatMap((holding) => holding.transactions)
          : legacyEmergencyFund.transactions,
    }),
    [legacyEmergencyFund.targetMonths, legacyEmergencyFund.transactions, reserveBalance, reserveHoldings],
  )

  const setEmergencyFundTargetMonths = useCallback(
    (months: number) => {
      setStoredFund((prev) => {
        const normalized = normalizeEmergencyFund(prev)
        return {
          current: 0,
          targetMonths: Math.max(1, Math.round(months)),
          transactions: [],
          ...(reserveHoldings.length === 0 && normalized.current > 0
            ? { current: normalized.current, transactions: normalized.transactions }
            : {}),
        }
      })
    },
    [reserveHoldings.length, setStoredFund],
  )

  /**
   * Compatibilidade com componentes/integrações antigas: se já há posição de
   * reserva, a movimentação vai para a primeira; se ainda não houve migração,
   * continua no bucket legado e será migrada logo depois.
   */
  const addEmergencyFundTransaction = useCallback(
    (amount: number, note?: string) => {
      const firstReserve = reserveHoldings[0]
      if (firstReserve) {
        addHoldingTransaction(firstReserve.id, amount, note)
        return
      }
      setStoredFund((prev) => {
        const fund = normalizeEmergencyFund(prev)
        const transactions = applyLedgerMove(fund.transactions, amount, note)
        if (!transactions) return fund
        return { ...fund, transactions, current: ledgerBalance(transactions) }
      })
    },
    [addHoldingTransaction, reserveHoldings, setStoredFund],
  )

  const removeEmergencyFundTransaction = useCallback(
    (id: string) => {
      const reserve = reserveHoldings.find((holding) =>
        holding.transactions.some((transaction) => transaction.id === id),
      )
      if (reserve) {
        removeHoldingTransaction(reserve.id, id)
        return
      }
      setStoredFund((prev) => {
        const fund = normalizeEmergencyFund(prev)
        const transactions = fund.transactions.filter((tx) => tx.id !== id)
        return { ...fund, transactions, current: Math.max(0, ledgerBalance(transactions)) }
      })
    },
    [removeHoldingTransaction, reserveHoldings, setStoredFund],
  )

  // Classes ------------------------------------------------------------------

  const addClass = useCallback(
    (name: string, color: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      setClasses((prev) => {
        const list = Array.isArray(prev) && prev.length ? prev : DEFAULT_INVESTMENT_CLASSES
        return [...list, { id: uid(), name: trimmed, color }]
      })
    },
    [setClasses],
  )

  const renameClass = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      setClasses((prev) =>
        (Array.isArray(prev) ? prev : DEFAULT_INVESTMENT_CLASSES).map((item) =>
          item.id === id ? { ...item, name: trimmed } : item,
        ),
      )
    },
    [setClasses],
  )

  const removeClass = useCallback(
    (id: string) => {
      // Reserva também usa classe real; uma classe só pode sair se nenhuma
      // posição — de qualquer finalidade — depender dela.
      if (holdings.some((holding) => holding.assetClassId === id)) return
      setClasses((prev) =>
        (Array.isArray(prev) ? prev : DEFAULT_INVESTMENT_CLASSES).filter((item) => item.id !== id),
      )
    },
    [holdings, setClasses],
  )

  // Metas --------------------------------------------------------------------

  const addGoal = useCallback(
    (input: {
      name: string
      targetAmount: number
      targetMonth?: string
      initialAmount?: number
      includes?: GoalInclusion[]
    }) => {
      const trimmed = input.name.trim()
      if (!trimmed) return
      const initial = Math.max(0, finiteNumber(input.initialAmount))
      setGoals((prev) => [
        ...prev,
        normalizeGoal(
          {
            id: uid(),
            name: trimmed,
            targetAmount: Math.max(0, input.targetAmount),
            targetMonth: input.targetMonth,
            color: GOAL_PRESET_COLORS[prev.length % GOAL_PRESET_COLORS.length],
            createdAt: nowIso(),
            transactions:
              initial > 0
                ? [{ id: uid(), amount: initial, date: nowIso(), note: 'Saldo inicial' }]
                : [],
            includes: input.includes,
          },
          prev.length,
        ),
      ])
    },
    [setGoals],
  )

  const toggleGoalInclusion = useCallback(
    (id: string, inclusion: GoalInclusion) => {
      setGoals((prev) =>
        prev.map((goal, index) => {
          if (goal.id !== id) return goal
          const current = goal.includes ?? []
          const matches = (item: GoalInclusion) =>
            item.type === inclusion.type && (item.id ?? '') === (inclusion.id ?? '')
          const includes = current.some(matches)
            ? current.filter((item) => !matches(item))
            : [...current, inclusion]
          return normalizeGoal({ ...goal, includes }, index)
        }),
      )
    },
    [setGoals],
  )

  const updateGoal = useCallback(
    (
      id: string,
      patch: Partial<Pick<FinancialGoal, 'name' | 'targetAmount' | 'targetMonth' | 'includes'>>,
    ) => {
      setGoals((prev) =>
        prev.map((goal, index) =>
          goal.id === id ? normalizeGoal({ ...goal, ...patch }, index) : goal,
        ),
      )
    },
    [setGoals],
  )

  const removeGoal = useCallback(
    (id: string) => setGoals((prev) => prev.filter((goal) => goal.id !== id)),
    [setGoals],
  )

  const addGoalTransaction = useCallback(
    (goalId: string, amount: number, note?: string) => {
      setGoals((prev) =>
        prev.map((goal) => {
          if (goal.id !== goalId) return goal
          const transactions = applyLedgerMove(goal.transactions, amount, note)
          if (!transactions) return goal
          const balance = ledgerBalance(transactions)
          return {
            ...goal,
            transactions,
            completedAt:
              goal.targetAmount > 0 && balance >= goal.targetAmount
                ? (goal.completedAt ?? nowIso())
                : undefined,
          }
        }),
      )
    },
    [setGoals],
  )

  const removeGoalTransaction = useCallback(
    (goalId: string, transactionId: string) => {
      setGoals((prev) =>
        prev.map((goal) =>
          goal.id === goalId
            ? { ...goal, transactions: goal.transactions.filter((tx) => tx.id !== transactionId) }
            : goal,
        ),
      )
    },
    [setGoals],
  )

  const summary = useMemo(
    () =>
      calculateInvestmentsSummary(
        holdings,
        investmentClasses,
        reserveHoldings.length > 0 ? 0 : legacyEmergencyFund.current,
        goalsBalance,
        liabilities,
        { securedLiabilities, physicalAssets },
      ),
    [
      holdings,
      investmentClasses,
      reserveHoldings.length,
      legacyEmergencyFund,
      goalsBalance,
      liabilities,
      securedLiabilities,
      physicalAssets,
    ],
  )

  // As metas leem os saldos já consolidados — por isso vêm depois do resumo.
  const goalContext = useMemo<GoalContext>(
    () => ({
      reserveBalance: summary.reserveBalance,
      investmentsBalance: summary.totalMarketValue,
      classBalances: summary.classes.map((item) => ({
        id: item.id,
        name: item.name,
        marketValue: item.marketValue,
      })),
      goalOwnBalances,
      assetsBalance: physicalAssets,
      debtBalance: liabilities,
    }),
    [
      summary.reserveBalance,
      summary.totalMarketValue,
      summary.classes,
      goalOwnBalances,
      physicalAssets,
      liabilities,
    ],
  )
  const goalSummaries = useMemo(() => summarizeGoals(goals, goalContext), [goals, goalContext])

  return {
    emergencyFund,
    reserveHoldings,
    portfolioHoldings,
    addEmergencyFundTransaction,
    removeEmergencyFundTransaction,
    setEmergencyFundTargetMonths,

    holdings,
    investmentClasses,
    summary,
    addHolding,
    updateHolding,
    removeHolding,
    addHoldingTransaction,
    removeHoldingTransaction,
    setMarketValue,
    addClass,
    renameClass,
    removeClass,

    goals: goalSummaries,
    goalsBalance,
    addGoal,
    updateGoal,
    toggleGoalInclusion,
    removeGoal,
    addGoalTransaction,
    removeGoalTransaction,
  }
}
