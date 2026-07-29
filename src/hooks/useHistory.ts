import { useCallback, useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'
import type { MonthlySnapshot, SnapshotPatch } from '../types'
import {
  averageMonthlyCosts,
  buildHistoryPoints,
  calculateHistoryStats,
  normalizeSnapshot,
} from '../lib/history'
import { monthKey, nowIso, uid } from '../lib/shared'

const HISTORY_STORAGE_KEY = 'uf_history_v1'

export function useHistory() {
  const [stored, setStored] = useLocalStorage<MonthlySnapshot[]>(HISTORY_STORAGE_KEY, [])
  const snapshots = useMemo(
    () => (Array.isArray(stored) ? stored.map(normalizeSnapshot) : []),
    [stored],
  )
  const points = useMemo(() => buildHistoryPoints(snapshots), [snapshots])
  const stats = useMemo(() => calculateHistoryStats(points), [points])

  /** Fecha um mês. Refechar o mesmo mês substitui o registro anterior. */
  const closeMonth = useCallback(
    (snapshot: Omit<MonthlySnapshot, 'id' | 'closedAt'>) => {
      setStored((prev) => {
        const others = (Array.isArray(prev) ? prev : []).filter(
          (item) => item.month !== snapshot.month,
        )
        return [...others, { ...snapshot, id: uid(), closedAt: nowIso() }].sort((a, b) =>
          a.month.localeCompare(b.month),
        )
      })
    },
    [setStored],
  )

  const removeSnapshot = useCallback(
    (id: string) => setStored((prev) => prev.filter((item) => item.id !== id)),
    [setStored],
  )

  const updateSnapshotNote = useCallback(
    (id: string, note: string) => {
      setStored((prev) =>
        prev.map((item) => (item.id === id ? { ...item, note: note.trim() || undefined } : item)),
      )
    },
    [setStored],
  )

  /**
   * Corrige um mês já fechado. Refechar substituiria pelos números de *hoje*,
   * que é justamente o que não serve quando o erro está num mês passado.
   * `savingsRate` e o patrimônio líquido são recalculados a partir do que foi
   * editado, para o registro nunca ficar internamente contraditório.
   */
  const updateSnapshot = useCallback(
    (id: string, patch: SnapshotPatch) => {
      setStored((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item
          const merged = normalizeSnapshot({ ...item, ...patch })
          return {
            ...merged,
            netWorth: merged.grossAssets - merged.liabilities,
            savingsRate:
              merged.availableForBudget > 0
                ? (merged.invested / merged.availableForBudget) * 100
                : 0,
          }
        }),
      )
    },
    [setStored],
  )

  const currentMonth = monthKey()
  const isCurrentMonthClosed = snapshots.some((item) => item.month === currentMonth)
  /** Custo médio real dos últimos meses fechados — base da reserva. */
  const averageCosts = useMemo(() => averageMonthlyCosts(points), [points])

  return {
    snapshots,
    points,
    stats,
    currentMonth,
    isCurrentMonthClosed,
    averageCosts,
    closeMonth,
    removeSnapshot,
    updateSnapshot,
    updateSnapshotNote,
  }
}
