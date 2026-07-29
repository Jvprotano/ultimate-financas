import { useCallback, useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'
import type { ExpectedEvent, ForecastAssumptions } from '../types'
import {
  DEFAULT_ASSUMPTIONS,
  normalizeAssumptions,
  normalizeExpectedEvent,
  occurrencesInMonth,
  summarizeUpcoming,
} from '../lib/forecast'
import { monthKey, uid } from '../lib/shared'

const EVENTS_STORAGE_KEY = 'uf_expected_events_v1'
const ASSUMPTIONS_STORAGE_KEY = 'uf_forecast_assumptions_v1'

/** Eventos esperados (13º, bônus, IPVA…) e as premissas da projeção. */
export function useForecast() {
  const [storedEvents, setEvents] = useLocalStorage<ExpectedEvent[]>(EVENTS_STORAGE_KEY, [])
  const events = useMemo(
    () =>
      (Array.isArray(storedEvents) ? storedEvents.map(normalizeExpectedEvent) : []).sort((a, b) =>
        a.month.localeCompare(b.month),
      ),
    [storedEvents],
  )

  const [storedAssumptions, setStoredAssumptions] = useLocalStorage<ForecastAssumptions>(
    ASSUMPTIONS_STORAGE_KEY,
    DEFAULT_ASSUMPTIONS,
  )
  const assumptions = useMemo(
    () => normalizeAssumptions(storedAssumptions),
    [storedAssumptions],
  )

  const addEvent = useCallback(
    (input: Omit<ExpectedEvent, 'id' | 'createdAt'>) => {
      if (!input.name.trim() || input.amount <= 0) return
      setEvents((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        normalizeExpectedEvent({ ...input, id: uid(), createdAt: new Date().toISOString() }),
      ])
    },
    [setEvents],
  )

  const updateEvent = useCallback(
    (id: string, patch: Partial<Omit<ExpectedEvent, 'id' | 'createdAt'>>) => {
      setEvents((prev) =>
        prev.map((event) =>
          event.id === id ? normalizeExpectedEvent({ ...event, ...patch }) : event,
        ),
      )
    },
    [setEvents],
  )

  const removeEvent = useCallback(
    (id: string) => setEvents((prev) => prev.filter((event) => event.id !== id)),
    [setEvents],
  )

  const updateAssumptions = useCallback(
    (patch: Partial<ForecastAssumptions>) => {
      setStoredAssumptions((prev) => normalizeAssumptions({ ...normalizeAssumptions(prev), ...patch }))
    },
    [setStoredAssumptions],
  )

  const currentMonth = monthKey()
  const monthOccurrences = useMemo(
    () => occurrencesInMonth(events, currentMonth),
    [events, currentMonth],
  )
  const upcomingYear = useMemo(
    () => summarizeUpcoming(events, currentMonth, 12),
    [events, currentMonth],
  )

  return {
    events,
    assumptions,
    currentMonth,
    monthOccurrences,
    upcomingYear,
    addEvent,
    updateEvent,
    removeEvent,
    updateAssumptions,
  }
}
