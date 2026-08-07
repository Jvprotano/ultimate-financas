import { useCallback, useEffect, useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'
import {
  advanceCycleMonth,
  normalizeActiveCycle,
  seedCycleFromCardDueMonth,
  shiftCycleMonth,
  type ActiveCycle,
} from '../lib/activeCycle'
import { normalizeCreditCardSettings, parsePaymentDay } from '../lib/creditCards'
import { readJson } from '../lib/shared'
import type { CreditCardSettings } from '../types'

export type { ActiveCycle }

const STORAGE_KEY = 'uf_active_cycle_v1'
const CARD_SETTINGS_KEY = 'uf_credit_card_settings_v1'

/**
 * Primeira visita (sem ciclo persistido): usa o mês de vencimento do cartão
 * quando existir, para fatura e ciclo nascerem alinhados no backup de prod.
 */
function loadInitialActiveCycle(): Partial<ActiveCycle> | null {
  const cardRaw = readJson<Partial<CreditCardSettings> | null>(CARD_SETTINGS_KEY, null)
  if (!cardRaw) return null

  const settings = normalizeCreditCardSettings(cardRaw)
  return seedCycleFromCardDueMonth(
    settings.currentDueMonth,
    parsePaymentDay(settings.paymentDate, 5),
  )
}

/**
 * Ciclo de vida que o salário está financiando. Persistido e avançado só por
 * ação do usuário — o calendário não mexe nisso sozinho.
 */
export function useActiveCycle() {
  const [stored, setStored] = useLocalStorage<Partial<ActiveCycle> | null>(
    STORAGE_KEY,
    loadInitialActiveCycle,
  )
  const cycle = useMemo(() => normalizeActiveCycle(stored ?? undefined), [stored])

  // Sem chave no storage: grava o seed (cartão ou mês civil) para não recalcular
  // a cada reload se o vencimento legado mudar de ano.
  useEffect(() => {
    if (window.localStorage.getItem(STORAGE_KEY) === null) {
      setStored(normalizeActiveCycle(stored ?? undefined))
    }
  }, [setStored, stored])

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
