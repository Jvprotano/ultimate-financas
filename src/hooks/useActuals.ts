import { useCallback, useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'
import type { CostItem, MonthlyActuals } from '../types'
import { normalizeActuals, summarizeActuals } from '../lib/actuals'
import { monthKey } from '../lib/shared'

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
        // Mês sem nenhum valor informado não precisa ocupar espaço.
        if (Object.keys(costs).length === 0) return others
        return [...others, { month: targetMonth, costs }].sort((a, b) =>
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
        return [...list.filter((item) => item.month !== targetMonth), { month: targetMonth, costs: filled }].sort(
          (a, b) => a.month.localeCompare(b.month),
        )
      })
    },
    [month, setStored, summary.rows],
  )

  const clearMonth = useCallback(
    (targetMonth = month) => {
      setStored((prev) => prev.filter((item) => item.month !== targetMonth))
    },
    [month, setStored],
  )

  return { months, month, summary, setActual, fillFromPlan, clearMonth }
}
