import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useLocalStorage } from './useLocalStorage'
import type {
  CreditCardAccount,
  CreditCardCycle,
  CreditCardEntry,
  CreditCardSettings,
} from '../types'
import {
  advanceCreditCardSettingsCycle,
  buildRemainingInstallmentsAmount,
  calculateCreditCardSummary,
  describeCardCycles,
  inferDueMonthFromPaymentDate,
  normalizeCreditCardSettings,
  normalizeCardAccount,
  normalizeCreditCardEntry,
  parsePaymentDay,
  syncGeneratedNextEntries,
  unregisteredCardNames,
} from '../lib/creditCards'
import {
  createPaidInvoiceSnapshot,
  normalizePaidInvoiceSnapshot,
  normalizePaidInvoiceSnapshots,
  withCardEntrySpendingMonth,
  type PaidInvoiceSnapshot,
} from '../lib/cardCycleAccounting'
import { readJson, uid } from '../lib/shared'

const ENTRIES_STORAGE_KEY = 'uf_credit_card_entries_v1'
const SETTINGS_STORAGE_KEY = 'uf_credit_card_settings_v1'
const ACCOUNTS_STORAGE_KEY = 'uf_credit_card_accounts_v1'
const LEGACY_LAST_PAID_INVOICE_STORAGE_KEY = 'uf_credit_card_last_paid_invoice_v1'
const PAID_INVOICES_STORAGE_KEY = 'uf_credit_card_paid_invoices_v2'
const DEFAULT_SETTINGS: CreditCardSettings = { paymentDate: '05/07', personalSpendingLimit: 1500 }

type EntryWithSpendingMonth = CreditCardEntry & { spendingMonth?: string }

function hasStoredSpendingMonth(entry: CreditCardEntry) {
  return /^\d{4}-\d{2}$/.test((entry as EntryWithSpendingMonth).spendingMonth ?? '')
}

function normalizeEntryForDueMonth(entry: CreditCardEntry, currentDueMonth: string): CreditCardEntry {
  const spendingMonth = (entry as EntryWithSpendingMonth).spendingMonth
  const normalized = normalizeCreditCardEntry(entry)
  const withStoredMonth = spendingMonth
    ? ({ ...normalized, spendingMonth } as CreditCardEntry)
    : normalized
  return withCardEntrySpendingMonth(withStoredMonth, currentDueMonth)
}

function normalizeEntriesForDueMonth(entries: CreditCardEntry[], currentDueMonth: string) {
  return entries.map((entry) => normalizeEntryForDueMonth(entry, currentDueMonth))
}

function syncEntriesForDueMonth(entries: CreditCardEntry[], currentDueMonth: string) {
  const normalized = normalizeEntriesForDueMonth(entries, currentDueMonth)
  return normalizeEntriesForDueMonth(syncGeneratedNextEntries(normalized), currentDueMonth)
}

/**
 * Cada cartão passou a ter fechamento e vencimento próprios. Na primeira carga,
 * os cartões que já apareciam nos lançamentos são cadastrados herdando o
 * vencimento global antigo — nada se perde e nada precisa ser redigitado.
 */
function loadInitialAccounts(): CreditCardAccount[] {
  const stored = readJson<CreditCardAccount[] | null>(ACCOUNTS_STORAGE_KEY, null)
  if (Array.isArray(stored) && stored.length) return stored.map(normalizeCardAccount)

  const entries = readJson<CreditCardEntry[] | null>(ENTRIES_STORAGE_KEY, null)
  if (!Array.isArray(entries) || entries.length === 0) return []

  const settings = readJson<Partial<CreditCardSettings> | null>(SETTINGS_STORAGE_KEY, null)
  const dueDay = parsePaymentDay(settings?.paymentDate, 5)
  const names = Array.from(
    new Set(entries.map((entry) => entry?.cardName?.trim()).filter((name): name is string => !!name)),
  )

  return names.map((name) => normalizeCardAccount({ name, closingDay: 30, dueDay }))
}

function loadInitialPaidInvoices(): PaidInvoiceSnapshot[] {
  const stored = normalizePaidInvoiceSnapshots(readJson<unknown>(PAID_INVOICES_STORAGE_KEY, []))
  if (stored.length) return stored

  const legacy = normalizePaidInvoiceSnapshot(
    readJson<Partial<PaidInvoiceSnapshot> | null>(LEGACY_LAST_PAID_INVOICE_STORAGE_KEY, null),
  )
  return legacy ? [legacy] : []
}

export function useCreditCards() {
  const [storedSettings, setSettingsRaw] = useLocalStorage<CreditCardSettings>(
    SETTINGS_STORAGE_KEY,
    DEFAULT_SETTINGS,
  )
  const settings = useMemo(() => normalizeCreditCardSettings(storedSettings), [storedSettings])
  const currentDueMonth =
    settings.currentDueMonth ?? inferDueMonthFromPaymentDate(settings.paymentDate)

  const [storedEntries, setEntries] = useLocalStorage<CreditCardEntry[]>(ENTRIES_STORAGE_KEY, [])
  const entries = useMemo(
    () =>
      Array.isArray(storedEntries)
        ? normalizeEntriesForDueMonth(storedEntries, currentDueMonth)
        : [],
    [currentDueMonth, storedEntries],
  )

  const [storedAccounts, setStoredAccounts] = useLocalStorage<CreditCardAccount[]>(
    ACCOUNTS_STORAGE_KEY,
    loadInitialAccounts,
  )
  const accounts = useMemo(
    () => (Array.isArray(storedAccounts) ? storedAccounts.map(normalizeCardAccount) : []),
    [storedAccounts],
  )

  const [storedPaidInvoices, setStoredPaidInvoices] = useLocalStorage<PaidInvoiceSnapshot[]>(
    PAID_INVOICES_STORAGE_KEY,
    loadInitialPaidInvoices,
  )
  const paidInvoices = useMemo(
    () => normalizePaidInvoiceSnapshots(storedPaidInvoices),
    [storedPaidInvoices],
  )
  const lastPaidInvoice = paidInvoices.length ? paidInvoices[paidInvoices.length - 1] : null

  // Backups anteriores não tinham competência explícita em cada lançamento.
  // Persiste a inferência uma única vez para que `current`/`next` possam girar
  // sem alterar a qual mês aquele gasto pertence.
  useEffect(() => {
    if (!Array.isArray(storedEntries) || storedEntries.every(hasStoredSpendingMonth)) return
    setEntries((prev) => normalizeEntriesForDueMonth(prev, currentDueMonth))
  }, [currentDueMonth, setEntries, storedEntries])

  // Os cartões herdados dos lançamentos só existem em memória até a primeira
  // gravação; persiste-os no mount para a migração não se perder.
  useEffect(() => {
    if (window.localStorage.getItem(ACCOUNTS_STORAGE_KEY) === null && accounts.length > 0) {
      setStoredAccounts(accounts)
    }
  }, [accounts, setStoredAccounts])

  // A geração da próxima fatura roda a cada mutação, mas dados que chegam
  // prontos (backup importado, outro dispositivo) nunca passaram por uma.
  const syncedOnMount = useRef(false)
  useEffect(() => {
    if (syncedOnMount.current || entries.length === 0) return
    syncedOnMount.current = true
    setEntries((prev) => syncEntriesForDueMonth(prev, currentDueMonth))
  }, [currentDueMonth, entries.length, setEntries])

  const addEntry = useCallback(
    (entry: Omit<CreditCardEntry, 'id'>) => {
      setEntries((prev) => {
        const nextEntries = [
          ...normalizeEntriesForDueMonth(prev, currentDueMonth),
          normalizeEntryForDueMonth({ ...entry, id: uid() }, currentDueMonth),
        ]
        return entry.cycle === 'current'
          ? syncEntriesForDueMonth(nextEntries, currentDueMonth)
          : nextEntries
      })
    },
    [currentDueMonth, setEntries],
  )

  const updateEntry = useCallback(
    (id: string, patch: Partial<Omit<CreditCardEntry, 'id'>>) => {
      setEntries((prev) => {
        const normalizedPrev = normalizeEntriesForDueMonth(prev, currentDueMonth)
        const target = normalizedPrev.find((entry) => entry.id === id)
        if (!target) return prev

        // Editar um lançamento gerado automaticamente o torna manual,
        // para a edição não ser descartada na próxima sincronização.
        const effectivePatch =
          target.cycle === 'next' && target.autoGenerated
            ? { ...patch, autoGenerated: false }
            : patch
        const nextEntries = normalizedPrev.map((entry) =>
          entry.id === id
            ? normalizeEntryForDueMonth({ ...entry, ...effectivePatch }, currentDueMonth)
            : entry,
        )

        return target.cycle === 'current'
          ? syncEntriesForDueMonth(nextEntries, currentDueMonth)
          : nextEntries
      })
    },
    [currentDueMonth, setEntries],
  )

  const removeEntry = useCallback(
    (id: string) => {
      setEntries((prev) => {
        const normalizedPrev = normalizeEntriesForDueMonth(prev, currentDueMonth)
        const target = normalizedPrev.find((entry) => entry.id === id)
        const nextEntries = normalizedPrev.filter((entry) => entry.id !== id)
        return target?.cycle === 'current'
          ? syncEntriesForDueMonth(nextEntries, currentDueMonth)
          : nextEntries
      })
    },
    [currentDueMonth, setEntries],
  )

  const replaceEntries = useCallback(
    (cycle: CreditCardCycle, incoming: Omit<CreditCardEntry, 'id' | 'cycle'>[]) => {
      setEntries((prev) => {
        const nextEntries = [
          ...normalizeEntriesForDueMonth(prev, currentDueMonth).filter(
            (entry) => entry.cycle !== cycle,
          ),
          ...incoming.map((entry) =>
            normalizeEntryForDueMonth({ ...entry, cycle, id: uid() }, currentDueMonth),
          ),
        ]
        return cycle === 'current'
          ? syncEntriesForDueMonth(nextEntries, currentDueMonth)
          : nextEntries
      })
    },
    [currentDueMonth, setEntries],
  )

  const appendEntries = useCallback(
    (cycle: CreditCardCycle, incoming: Omit<CreditCardEntry, 'id' | 'cycle'>[]) => {
      setEntries((prev) => {
        const nextEntries = [
          ...normalizeEntriesForDueMonth(prev, currentDueMonth),
          ...incoming.map((entry) =>
            normalizeEntryForDueMonth({ ...entry, cycle, id: uid() }, currentDueMonth),
          ),
        ]
        return cycle === 'current'
          ? syncEntriesForDueMonth(nextEntries, currentDueMonth)
          : nextEntries
      })
    },
    [currentDueMonth, setEntries],
  )

  const anticipateInstallments = useCallback(
    (id: string, count: number) => {
      setEntries((prev) => {
        const normalizedPrev = normalizeEntriesForDueMonth(prev, currentDueMonth)
        const entry = normalizedPrev.find((item) => item.id === id)
        if (
          !entry ||
          entry.cycle !== 'current' ||
          !entry.installmentCurrent ||
          !entry.installmentTotal
        ) {
          return prev
        }

        const current = entry.installmentCurrent
        const total = entry.installmentTotal
        const quantity = Math.min(Math.max(1, Math.floor(count)), total - current)
        if (quantity < 1) return prev

        // Cada parcela antecipada vira um lançamento próprio na mesma competência.
        const anticipated = Array.from({ length: quantity }, (_, index) => {
          const installment = current + index + 1
          return normalizeEntryForDueMonth(
            {
              ...entry,
              id: uid(),
              installmentCurrent: installment,
              remainingAmount:
                installment === current + quantity
                  ? buildRemainingInstallmentsAmount(entry.amount, installment, total)
                  : 0,
            },
            currentDueMonth,
          )
        })

        return syncEntriesForDueMonth(
          [
            ...normalizedPrev.map((item) =>
              item.id === id ? { ...item, remainingAmount: 0 } : item,
            ),
            ...anticipated,
          ],
          currentDueMonth,
        )
      })
    },
    [currentDueMonth, setEntries],
  )

  const payInvoice = useCallback(() => {
    const paidSummary = calculateCreditCardSummary(entries, settings)
    const snapshot = createPaidInvoiceSnapshot({
      entries,
      currentDueMonth,
      personalTotal: paidSummary.currentPersonalTotal,
    })
    setStoredPaidInvoices((prev) => {
      const existing = normalizePaidInvoiceSnapshots(prev)
      return [...existing.filter((item) => item.dueMonth !== snapshot.dueMonth), snapshot]
        .sort((a, b) => a.paidAt.localeCompare(b.paidAt))
        .slice(-24)
    })

    const nextSettings = advanceCreditCardSettingsCycle(settings)
    const nextDueMonth =
      nextSettings.currentDueMonth ?? inferDueMonthFromPaymentDate(nextSettings.paymentDate)

    setEntries((prev) => {
      // Sincroniza antes de virar: assinaturas/parcelas precisam existir na próxima fatura.
      const syncedEntries = syncEntriesForDueMonth(prev, currentDueMonth)
      const newCurrentEntries = syncedEntries
        .filter((entry) => entry.cycle === 'next')
        .map((entry) =>
          normalizeEntryForDueMonth(
            {
              ...entry,
              id: uid(),
              cycle: 'current',
              autoGenerated: false,
              sourceEntryId: undefined,
            },
            nextDueMonth,
          ),
        )

      return syncEntriesForDueMonth(newCurrentEntries, nextDueMonth)
    })
    setSettingsRaw(nextSettings)
  }, [
    currentDueMonth,
    entries,
    setEntries,
    setSettingsRaw,
    setStoredPaidInvoices,
    settings,
  ])

  const setSettings = useCallback(
    (next: CreditCardSettings) => {
      setSettingsRaw(normalizeCreditCardSettings(next))
    },
    [setSettingsRaw],
  )

  const addAccount = useCallback(
    (input: { name: string; closingDay: number; dueDay: number; limit?: number }) => {
      const trimmed = input.name.trim()
      if (!trimmed) return
      setStoredAccounts((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        normalizeCardAccount({ ...input, name: trimmed, id: uid() }),
      ])
    },
    [setStoredAccounts],
  )

  const updateAccount = useCallback(
    (id: string, patch: Partial<Omit<CreditCardAccount, 'id'>>) => {
      setStoredAccounts((prev) =>
        prev.map((account) =>
          account.id === id ? normalizeCardAccount({ ...account, ...patch }) : account,
        ),
      )
    },
    [setStoredAccounts],
  )

  const removeAccount = useCallback(
    (id: string) => setStoredAccounts((prev) => prev.filter((account) => account.id !== id)),
    [setStoredAccounts],
  )

  const summary = useMemo(() => calculateCreditCardSummary(entries, settings), [entries, settings])
  const cycles = useMemo(() => describeCardCycles(accounts, summary), [accounts, summary])
  const unregistered = useMemo(() => unregisteredCardNames(entries, accounts), [entries, accounts])

  return {
    entries,
    settings,
    accounts,
    cycles,
    unregistered,
    summary,
    paidInvoices,
    lastPaidInvoice,
    addAccount,
    updateAccount,
    removeAccount,
    addEntry,
    updateEntry,
    removeEntry,
    replaceEntries,
    appendEntries,
    anticipateInstallments,
    payInvoice,
    setSettings,
  }
}
