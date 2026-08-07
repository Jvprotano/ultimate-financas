import { useCallback, useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'
import {
  advanceCycleMonth,
  normalizeActiveCycle,
  shiftCycleMonth,
  type ActiveCycle,
} from '../lib/activeCycle'

export type { ActiveCycle }

const STORAGE_KEY = 'uf_active_cycle_v1'

/**
 * Ciclo de vida que o salário está financiando. Persistido e avançado só por
 * ação do usuário — o calendário não mexe nisso sozinho.
 */
export function useActiveCycle() {
  const [stored, setStored] = useLocalStorage<Partial<ActiveCycle> | null>(STORAGE_KEY, null)
  const cycle = useMemo(() => normalizeActiveCycle(stored ?? undefined), [stored])

  const setCycle = useCallback(
    (patch: Partial<ActiveCycle>) => {
      setStored((prev) => normalizeActiveCycle({ ...normalizeActiveCycle(prev ?? undefined), ...patch }))
    },
    [setStored],
  )

  const setCycleMonth = useCallback(
    (month: string) => setCycle({ month }),
    [setCycle],
  )

  const shiftCycle = useCallback(
    (delta: number) => setCycleMonth(shiftCycleMonth(cycle.month, delta)),
    [cycle.month, setCycleMonth],
  )

  const advanceCycle = useCallback(() => {
    setCycleMonth(advanceCycleMonth(cycle.month))
  }, [cycle.month, setCycleMonth])

  return {
    cycle,
    month: cycle.month,
    setCycle,
    setCycleMonth,
    shiftCycle,
    advanceCycle,
  }
}
