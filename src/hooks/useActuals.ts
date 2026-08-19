import { useCallback, useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'
import type { CostItem, ExtraIncomeEntry, MonthlyActuals } from '../types'
import { normalizeActuals, summarizeActuals } from '../lib/actuals'
import { monthKey, uid } from '../lib/shared'

const ACTUALS_STORAGE_KEY = 'uf_actuals_v1'

/**
 * O que de fato foi pago em cada mês. Guardado por mês (não por cenário): o
 * realizado é um fato, não uma hipótese.
 */
export function useActuals(costs: CostItem[] = [], month = monthKey()) {
  const [stored, setStored] = useLocalStorage<MonthlyActuals[]>(ACTUALS_STORAGE_KEY, [])
  const months = useMemo(
    () => (Array.isArray(stored) ? stored.map(normalizeActuals) : []),
    [stored],
  )

  const forMonth = useMemo(
    () => months.find((item) => item.month === month),
    [months, month],
  )
  const summary = useMemo(() => summarizeActuals(costs, forMonth, month), [costs, forMonth, month])

  /** Informa o valor pago de um custo. `null` volta a usar o planejado. */
  const setActual = useCallback(
    (costId: string, amount: number | null, targetMonth = month) => {
      setStored((prev) => {
        const list = Array.isArray(prev) ? prev.map(normalizeActuals) : []
        const existing = list.find((item) => item.month === targetMonth)
        const costs = { ...(existing?.costs ?? {}) }

        if (amount === null) delete costs[costId]
        else costs[costId] = Math.max(0, amount)

        const others = list.filter((item) => item.month !== targetMonth)
        const extraIncome = existing?.extraIncome ?? []
        // Mês sem nenhum valor informado não precisa ocupar espaço.
        if (Object.keys(costs).length === 0 && extraIncome.length === 0) return others
        return [...others, { month: targetMonth, costs, extraIncome }].sort((a, b) =>
          a.month.localeCompare(b.month),
        )
      })
    },
    [month, setStored],
  )

  /** Preenche todos os itens ainda vazios com o valor planejado. */
  const fillFromPlan = useCallback(
    (targetMonth = month) => {
      setStored((prev) => {
        const list = Array.isArray(prev) ? prev.map(normalizeActuals) : []
        const existing = list.find((item) => item.month === targetMonth)
        const filled = { ...(existing?.costs ?? {}) }
        for (const row of summary.rows) {
          if (!Object.hasOwn(filled, row.cost.id)) filled[row.cost.id] = row.planned
        }
        if (Object.keys(filled).length === 0) return list
        return [...list.filter((item) => item.month !== targetMonth), { month: targetMonth, costs: filled, extraIncome: existing?.extraIncome ?? [] }].sort(
          (a, b) => a.month.localeCompare(b.month),
        )
      })
    },
    [month, setStored, summary.rows],
  )

  const clearCosts = useCallback(
    (targetMonth = month) => {
      setStored((prev) => {
        const list = (Array.isArray(prev) ? prev : []).map(normalizeActuals)
        const existing = list.find((item) => item.month === targetMonth)
        const others = list.filter((item) => item.month !== targetMonth)
        if (!existing?.extraIncome.length) return others
        return [...others, { ...existing, costs: {} }].sort((a, b) => a.month.localeCompare(b.month))
      })
    },
    [month, setStored],
  )

  const addExtraIncome = useCallback(
    (
      name: string,
      amount: number,
      sourceEventId?: string,
      targetMonth = month,
    ) => {
      const cleanName = name.trim()
      if (!cleanName || amount <= 0) return
      setStored((prev) => {
        const list = (Array.isArray(prev) ? prev : []).map(normalizeActuals)
        const existing = list.find((item) => item.month === targetMonth) ?? {
          month: targetMonth,
          costs: {},
          extraIncome: [],
        }
        if (
          sourceEventId &&
          existing.extraIncome.some((entry) => entry.sourceEventId === sourceEventId)
        ) {
          return list
        }
        const entry: ExtraIncomeEntry = {
          id: uid(),
          name: cleanName,
          amount,
          sourceEventId: sourceEventId || undefined,
        }
        return [
          ...list.filter((item) => item.month !== targetMonth),
          { ...existing, extraIncome: [...existing.extraIncome, entry] },
        ].sort((a, b) => a.month.localeCompare(b.month))
      })
    },
    [month, setStored],
  )

  const updateExtraIncome = useCallback(
    (id: string, patch: Partial<Pick<ExtraIncomeEntry, 'name' | 'amount'>>, targetMonth = month) => {
      setStored((prev) =>
        (Array.isArray(prev) ? prev : []).map(normalizeActuals).map((item) =>
          item.month !== targetMonth
            ? item
            : {
                ...item,
                extraIncome: item.extraIncome.map((entry) =>
                  entry.id === id
                    ? {
                        ...entry,
                        name: patch.name === undefined ? entry.name : patch.name.trim(),
                        amount:
                          patch.amount === undefined ? entry.amount : Math.max(0, patch.amount),
                      }
                    : entry,
                ).filter((entry) => entry.name && entry.amount > 0),
              },
        ),
      )
    },
    [month, setStored],
  )

  const removeExtraIncome = useCallback(
    (id: string, targetMonth = month) => {
      setStored((prev) =>
        (Array.isArray(prev) ? prev : []).map(normalizeActuals).flatMap((item) => {
          if (item.month !== targetMonth) return [item]
          const next = item.extraIncome.filter((entry) => entry.id !== id)
          if (Object.keys(item.costs).length === 0 && next.length === 0) return []
          return [{ ...item, extraIncome: next }]
        }),
      )
    },
    [month, setStored],
  )

  return {
    months,
    month,
    summary,
    setActual,
    fillFromPlan,
    clearCosts,
    addExtraIncome,
    updateExtraIncome,
    removeExtraIncome,
  }
}
