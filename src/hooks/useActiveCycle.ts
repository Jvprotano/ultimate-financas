import { useCallback, useEffect, useMemo } from 'react'
import { useRepositoryState } from '../data/repository'
import {
  advanceCycleMonth,
  normalizeActiveCycle,
  shiftCycleMonth,
  type ActiveCycle,
} from '../lib/activeCycle'

export type { ActiveCycle }

/**
 * Ciclo de vida que o salário está financiando. Persistido e avançado só por
 * ação do usuário — o calendário não mexe nisso sozinho.
 */
export function useActiveCycle() {
  const [stored, setStored] = useRepositoryState<Partial<ActiveCycle> | null>(
    'activeCycle',
    null,
  )
  const cycle = useMemo(() => normalizeActiveCycle(stored ?? undefined), [stored])

  // Sem ciclo persistido, grava o mês civil normalizado uma única vez.
  useEffect(() => {
    if (stored === null) {
      setStored(normalizeActiveCycle(stored ?? undefined))
    }
  }, [setStored, stored])

  const setCycle = useCallback(
    (patch: Partial<ActiveCycle>) => {
      return setStored((prev) =>
        normalizeActiveCycle({ ...normalizeActiveCycle(prev ?? undefined), ...patch }),
      )
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

  const advanceCycle = useCallback(
    () => setCycleMonth(advanceCycleMonth(cycle.month)),
    [cycle.month, setCycleMonth],
  )

  return {
    cycle,
    month: cycle.month,
    setCycle,
    setCycleMonth,
    shiftCycle,
    advanceCycle,
  }
}
