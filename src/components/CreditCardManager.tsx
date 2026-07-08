import { useMemo, useRef, useState } from 'react'
import {
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  FastForward,
  FileText,
  Filter,
  HandCoins,
  Plus,
  Repeat,
  Search,
  Trash2,
  Undo2,
  Upload,
  X,
  Zap,
} from 'lucide-react'
import { Card } from './Card'
import { CurrencyInput } from './CurrencyInput'
import { HeaderMetric } from './HeaderMetric'
import type {
  CreditCardCycle,
  CreditCardEntry,
  CreditCardSettings,
  CreditCardSummary,
} from '../types'
import { formatCurrency } from '../utils'

interface Props {
  entries: CreditCardEntry[]
  settings: CreditCardSettings
  summary: CreditCardSummary
  availableForBudget: number
  addEntry: (entry: Omit<CreditCardEntry, 'id'>) => void
  updateEntry: (id: string, patch: Partial<Omit<CreditCardEntry, 'id'>>) => void
  removeEntry: (id: string) => void
  replaceEntries: (cycle: CreditCardCycle, entries: Omit<CreditCardEntry, 'id' | 'cycle'>[]) => void
  appendEntries: (cycle: CreditCardCycle, entries: Omit<CreditCardEntry, 'id' | 'cycle'>[]) => void
  anticipateEntry: (id: string, count: number) => void
  payInvoice: () => void
  setSettings: (settings: CreditCardSettings) => void
}

type View = CreditCardCycle | 'import'
type ParsedCardEntry = Omit<CreditCardEntry, 'id' | 'cycle'>

const KNOWN_CARDS = ['Itaú', 'XP', 'Inter', 'Nu']
const TABLE_COLS = "grid-cols-[minmax(140px,1.5fr)_92px_70px_100px_110px_110px_110px_minmax(80px,1fr)_60px]"
const RECURRING_MARKERS = ['sim', 's', 'x', '1', 'true', 'verdadeiro', 'assinatura', 'recorrente']

function todayShort() {
  const now = new Date()
  return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`
}

type SortKey = 'description' | 'purchaseDate' | 'cardName' | 'amount'
type SortState = { key: SortKey; dir: 'asc' | 'desc' }

// Converte "dd/mm" num inteiro comparável (mm*100+dd). Sem data vai para o fim.
function dateSortValue(raw: string) {
  const match = raw.match(/(\d{1,2})\s*\/\s*(\d{1,2})/)
  if (!match) return Number.MAX_SAFE_INTEGER
  return Number(match[2]) * 100 + Number(match[1])
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

function parseCurrencyLike(value: string) {
  const cleaned = value
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.')
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatNumberInputValue(value: number) {
  return Number.isFinite(value) ? value : 0
}

function parseInstallments(description: string) {
  const match = description.match(/(?:^|\s)(\d{1,2})\s*\/\s*(\d{1,2})(?:\s|$)/)
  if (!match) return {}

  const installmentCurrent = Number(match[1])
  const installmentTotal = Number(match[2])
  if (!installmentCurrent || !installmentTotal || installmentCurrent > installmentTotal) return {}

  return { installmentCurrent, installmentTotal }
}

function buildRemainingAmount(amount: number, current?: number, total?: number) {
  if (!current || !total || current >= total) return 0
  return amount * (total - current)
}

function stripInstallmentToken(description: string) {
  const cleaned = description
    .replace(/(?:^|\s)(?:parc(?:ela)?\.?\s*)?\(?\d{1,2}\s*\/\s*\d{1,2}\)?(?=\s|$)/i, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*[-–—]\s*$/, '')
    .trim()
  return cleaned || description.trim()
}

function splitSpreadsheetLine(line: string) {
  if (line.includes('\t')) return line.split('\t')
  if (line.includes(';')) return line.split(';')
  return line.split(/\s{2,}/)
}

function detectColumnIndex(headers: string[], candidates: string[]) {
  return headers.findIndex((header) => candidates.some((candidate) => header.includes(candidate)))
}

function parseSpreadsheet(text: string): ParsedCardEntry[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (!lines.length) return []

  const firstRow = splitSpreadsheetLine(lines[0]).map(normalizeText)
  const hasHeader = firstRow.some((cell) => ['descricao', 'data', 'cartao', 'fatura', 'e meu'].includes(cell))
  const headers = hasHeader ? firstRow : ['descricao', 'data', 'cartao', 'fatura', 'e meu', 'restante', 'obs']
  const body = hasHeader ? lines.slice(1) : lines
  const indexes = {
    description: detectColumnIndex(headers, ['descricao', 'nome', 'compra']),
    date: detectColumnIndex(headers, ['data']),
    card: detectColumnIndex(headers, ['cartao', 'banco']),
    amount: detectColumnIndex(headers, ['fatura', 'valor']),
    personal: detectColumnIndex(headers, ['e meu', 'meu']),
    remaining: detectColumnIndex(headers, ['restante', 'antec', 'parcelas']),
    recurring: detectColumnIndex(headers, ['assinatura', 'recorrente']),
    prepaid: detectColumnIndex(headers, ['pago', 'quitado']),
  }

  const parsedRows: Array<ParsedCardEntry | null> = body.map((line) => {
      const cells = splitSpreadsheetLine(line)
      const description = (cells[indexes.description >= 0 ? indexes.description : 0] ?? '').trim()
      const marker = normalizeText(description)

      if (!description || marker.includes('total') || marker.includes('disponivel') || marker.includes('proxima fatura')) {
        return null
      }

      const amount = parseCurrencyLike(cells[indexes.amount >= 0 ? indexes.amount : 3] ?? '')
      const personalRaw = cells[indexes.personal >= 0 ? indexes.personal : 4] ?? ''
      const personalAmount = personalRaw.trim() ? parseCurrencyLike(personalRaw) : amount
      const { installmentCurrent, installmentTotal } = parseInstallments(description)
      const remainingRaw = cells[indexes.remaining >= 0 ? indexes.remaining : 5] ?? ''
      const remainingAmount = remainingRaw.trim()
        ? parseCurrencyLike(remainingRaw)
        : buildRemainingAmount(amount, installmentCurrent, installmentTotal)
      const recurringRaw = indexes.recurring >= 0 ? normalizeText(cells[indexes.recurring] ?? '') : ''
      const isRecurring = RECURRING_MARKERS.includes(recurringRaw)
      const prepaidRaw = indexes.prepaid >= 0 ? normalizeText(cells[indexes.prepaid] ?? '') : ''
      const isPrepaid = RECURRING_MARKERS.includes(prepaidRaw) || prepaidRaw === 'pago'
      const extraText = cells
        .filter((_, cellIndex) => cellIndex >= 6 && cellIndex !== indexes.recurring && cellIndex !== indexes.prepaid)
        .join(' ')
        .trim()

      if (!amount && !personalAmount) return null

      return {
        description: installmentTotal ? stripInstallmentToken(description) : description,
        purchaseDate: (cells[indexes.date >= 0 ? indexes.date : 1] ?? '').trim(),
        cardName: (cells[indexes.card >= 0 ? indexes.card : 2] ?? 'Cartão').trim() || 'Cartão',
        amount,
        personalAmount,
        remainingAmount,
        ownerName: personalAmount < amount ? extraText || 'Outro' : '',
        ownerNote: extraText,
        installmentCurrent,
        installmentTotal,
        isRecurring: isRecurring || undefined,
        isPrepaid: isPrepaid || undefined,
      }
    })

  return parsedRows.filter((entry): entry is ParsedCardEntry => entry !== null)
}



export function CreditCardManager({
  entries,
  settings,
  summary,
  availableForBudget,
  addEntry,
  updateEntry,
  removeEntry,
  replaceEntries,
  appendEntries,
  anticipateEntry,
  payInvoice,
  setSettings,
}: Props) {
  const [view, setView] = useState<View>('current')

  // New Entry Form State
  const descriptionInputRef = useRef<HTMLInputElement>(null)
  const [description, setDescription] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(todayShort)
  const [cardName, setCardName] = useState('Itaú')
  const [amount, setAmount] = useState(0)
  const [personalAmount, setPersonalAmount] = useState(0)
  const [remainingAmount, setRemainingAmount] = useState(0)
  const [ownerNote, setOwnerNote] = useState('')
  const [newInstallmentCurrent, setNewInstallmentCurrent] = useState('')
  const [newInstallmentTotal, setNewInstallmentTotal] = useState('')
  const [newIsRecurring, setNewIsRecurring] = useState(false)

  const [ownerFilter, setOwnerFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortState | null>(null)
  const [importText, setImportText] = useState('')
  const [importCycle, setImportCycle] = useState<CreditCardCycle>('current')
  const [replaceOnImport, setReplaceOnImport] = useState(true)

  const [anticipateId, setAnticipateId] = useState<string | null>(null)
  const [anticipateCount, setAnticipateCount] = useState(1)

  const [confirmingPay, setConfirmingPay] = useState(false)

  // Exclusão com desfazer: guarda o último lançamento removido por alguns segundos.
  const [pendingUndo, setPendingUndo] = useState<CreditCardEntry | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const visibleCycle: CreditCardCycle = view === 'next' ? 'next' : 'current'

  const normalizedSearch = normalizeText(search)
  const filteredEntries = entries.filter((entry) => {
    if (entry.cycle !== visibleCycle) return false
    if (
      normalizedSearch &&
      !normalizeText(`${entry.description} ${entry.cardName} ${entry.ownerName ?? ''} ${entry.ownerNote ?? ''}`).includes(
        normalizedSearch,
      )
    ) {
      return false
    }
    if (ownerFilter === 'all') return true
    if (ownerFilter === 'mine') return entry.personalAmount > 0
    if (ownerFilter === 'third-party') return entry.amount - entry.personalAmount > 0
    if (ownerFilter === 'prepaid') return entry.isPrepaid === true
    return (entry.ownerName || entry.ownerNote || 'Outro') === ownerFilter
  })

  const visibleEntries = sort
    ? [...filteredEntries].sort((a, b) => {
        const dir = sort.dir === 'asc' ? 1 : -1
        if (sort.key === 'amount') return dir * (a.amount - b.amount)
        if (sort.key === 'purchaseDate') return dir * (dateSortValue(a.purchaseDate) - dateSortValue(b.purchaseDate))
        return dir * (a[sort.key] || '').localeCompare(b[sort.key] || '', 'pt-BR')
      })
    : filteredEntries

  const toggleSort = (key: SortKey) =>
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' }
      return prev.dir === 'asc' ? { key, dir: 'desc' } : null
    })

  const handleDelete = (entry: CreditCardEntry) => {
    removeEntry(entry.id)
    setPendingUndo(entry)
    if (undoTimer.current) clearTimeout(undoTimer.current)
    undoTimer.current = setTimeout(() => setPendingUndo(null), 6000)
  }

  const handleUndoDelete = () => {
    if (!pendingUndo) return
    const { id: _id, ...rest } = pendingUndo
    void _id
    addEntry(rest)
    setPendingUndo(null)
    if (undoTimer.current) clearTimeout(undoTimer.current)
  }

  const parsedImport = useMemo(() => parseSpreadsheet(importText), [importText])

  const anticipatingEntry = anticipateId ? entries.find((entry) => entry.id === anticipateId) ?? null : null
  const anticipateMax =
    anticipatingEntry?.installmentCurrent && anticipatingEntry.installmentTotal
      ? anticipatingEntry.installmentTotal - anticipatingEntry.installmentCurrent
      : 0

  const knownCards = Array.from(new Set([...KNOWN_CARDS, ...entries.map((entry) => entry.cardName).filter(Boolean)]))
  const knownOwners = Array.from(
    new Set(
      entries
        .filter((entry) => entry.amount - entry.personalAmount > 0)
        .map((entry) => entry.ownerName || entry.ownerNote || 'Outro'),
    ),
  )
  
  const availableLimitTone = summary.availablePersonalLimit >= 0 ? 'text-emerald-300' : 'text-rose-300'
  const personalSpendPct =
    settings.personalSpendingLimit > 0
      ? Math.min(999, (summary.currentPersonalTotal / settings.personalSpendingLimit) * 100)
      : 0

  const handleAmountChange = (val: number) => {
    if (personalAmount === amount || personalAmount === 0) {
      setPersonalAmount(val)
    }
    setAmount(val)
  }

  const handleAdd = () => {
    if (!description.trim() || amount === 0) return
    const parsedFromName = parseInstallments(description)
    const installmentCurrent = newIsRecurring
      ? undefined
      : Number(newInstallmentCurrent) || parsedFromName.installmentCurrent
    const installmentTotal = newIsRecurring
      ? undefined
      : Number(newInstallmentTotal) || parsedFromName.installmentTotal
    const cleanDescription = parsedFromName.installmentTotal
      ? stripInstallmentToken(description)
      : description.trim()
    const computedRemainingAmount =
      remainingAmount || buildRemainingAmount(amount, installmentCurrent, installmentTotal)

    let computedOwnerName = ''
    let computedOwnerNote = ''
    if (amount - personalAmount > 0) {
        computedOwnerName = ownerNote.trim() || 'Outro'
    } else {
        computedOwnerNote = ownerNote.trim()
    }

    addEntry({
      cycle: visibleCycle,
      description: cleanDescription,
      purchaseDate,
      cardName: cardName.trim() || 'Cartão',
      amount,
      personalAmount,
      remainingAmount: computedRemainingAmount,
      ownerName: computedOwnerName,
      ownerNote: computedOwnerNote,
      installmentCurrent,
      installmentTotal,
      isRecurring: newIsRecurring || undefined,
    })

    setDescription('')
    // Data e cartão são mantidos: em geral várias compras seguidas compartilham os dois.
    setAmount(0)
    setPersonalAmount(0)
    setRemainingAmount(0)
    setOwnerNote('')
    setNewInstallmentCurrent('')
    setNewInstallmentTotal('')
    setNewIsRecurring(false)
    descriptionInputRef.current?.focus()
  }

  const handleConfirmPay = () => {
    payInvoice()
    setConfirmingPay(false)
    setView('current')
  }

  const renderSortHeader = (key: SortKey, label: string, align: 'left' | 'right' | 'center' = 'left') => {
    const active = sort?.key === key
    const alignClass = align === 'right' ? 'justify-end pr-2' : align === 'center' ? 'justify-center' : 'justify-start'
    return (
      <button
        type="button"
        onClick={() => toggleSort(key)}
        className={`flex items-center gap-1 ${alignClass} font-bold uppercase tracking-wider transition-colors hover:text-dark-text ${
          active ? 'text-sky-300' : ''
        }`}
      >
        {label}
        {active ? (
          sort?.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
        ) : (
          <ArrowUpDown size={11} className="opacity-30" />
        )}
      </button>
    )
  }

  const handleImport = () => {
    if (!parsedImport.length) return
    if (replaceOnImport) {
      replaceEntries(importCycle, parsedImport)
    } else {
      appendEntries(importCycle, parsedImport)
    }
    setImportText('')
    setView(importCycle)
  }

  const handleInstallmentChange = (entry: CreditCardEntry, field: 'current' | 'total', raw: string) => {
    const value = Number(raw.replace(/\D/g, '')) || 0
    const installmentCurrent = field === 'current' ? value : entry.installmentCurrent ?? 0
    const installmentTotal = field === 'total' ? value : entry.installmentTotal ?? 0
    updateEntry(entry.id, {
      installmentCurrent: installmentCurrent || undefined,
      installmentTotal: installmentTotal || undefined,
      remainingAmount: buildRemainingAmount(entry.amount, installmentCurrent, installmentTotal),
    })
  }

  const handleAnticipate = () => {
    if (!anticipatingEntry || anticipateMax < 1) return
    anticipateEntry(anticipatingEntry.id, Math.min(Math.max(1, anticipateCount), anticipateMax))
    setAnticipateId(null)
    setAnticipateCount(1)
  }

  return (
    <Card
      title="Cartões e Faturas"
      icon={<CreditCard size={18} />}
      accentColor="bg-sky-600"
      collapsible
      storageKey="credit-cards"
      headerExtra={
        <HeaderMetric amount={summary.currentPersonalTotal} baseAmount={availableForBudget} label="Meu atual" tone="primary" />
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 shadow-sm transition-all hover:bg-sky-500/15">
            <span className="block text-xs font-semibold uppercase tracking-wide text-sky-300/80">Total dos cartões</span>
            <strong className="mt-1 block text-lg text-sky-100">{formatCurrency(summary.currentTotal)}</strong>
            {summary.currentPrepaidTotal > 0 && (
              <span className="mt-0.5 block text-[11px] font-semibold text-emerald-300/90">
                + {formatCurrency(summary.currentPrepaidTotal)} já pago antecipado
              </span>
            )}
          </div>
          <div className="rounded-xl border border-primary-500/20 bg-primary-500/10 px-4 py-3 shadow-sm transition-all hover:bg-primary-500/15">
            <span className="block text-xs font-semibold uppercase tracking-wide text-primary-300/80">Meu total</span>
            <strong className="mt-1 block text-lg text-primary-100">{formatCurrency(summary.currentPersonalTotal)}</strong>
          </div>
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-3 shadow-sm transition-all hover:bg-violet-500/15">
            <span className="block text-xs font-semibold uppercase tracking-wide text-violet-300/80">Não é meu</span>
            <strong className="mt-1 block text-lg text-violet-100">{formatCurrency(summary.currentThirdPartyTotal)}</strong>
            {summary.currentThirdPartyTotal > 0 && (
              <span className="mt-0.5 block text-[11px] font-medium text-violet-300/60">a receber de terceiros</span>
            )}
          </div>
          <div
            className={`rounded-xl border px-4 py-3 shadow-sm transition-all ${
              summary.availablePersonalLimit >= 0
                ? 'border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/15'
                : 'border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/15'
            }`}
          >
            <span className={`block text-xs font-semibold uppercase tracking-wide ${availableLimitTone} opacity-80`}>
              {summary.availablePersonalLimit >= 0 ? 'Ainda disponível' : 'Acima do limite'}
            </span>
            <strong className={`mt-1 block text-lg ${availableLimitTone}`}>
              {formatCurrency(Math.abs(summary.availablePersonalLimit))}
            </strong>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <label className="block rounded-xl border border-dark-border bg-dark-card p-3 shadow-sm">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-dark-text-muted">
              <Calendar size={13} />
              Data de pagamento
            </span>
            <input
              value={settings.paymentDate}
              onChange={(event) => setSettings({ ...settings, paymentDate: event.target.value })}
              className="w-full rounded-md border border-dark-border bg-dark-input px-3 py-2 text-sm text-dark-text outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 transition-all"
              placeholder="05/07"
            />
          </label>
          <label className="block rounded-xl border border-dark-border bg-dark-card p-3 shadow-sm">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-dark-text-muted">Limite pessoal</span>
            <CurrencyInput
              value={settings.personalSpendingLimit}
              onChange={(value) => setSettings({ ...settings, personalSpendingLimit: value })}
              className="!py-2"
            />
          </label>
          <div className="rounded-xl border border-dark-border bg-dark-card p-3 shadow-sm flex flex-col justify-center">
            <div className="flex justify-between items-end mb-1">
              <span className="block text-xs font-bold uppercase tracking-wide text-dark-text-muted">Uso do limite</span>
              <strong className={`text-sm ${availableLimitTone}`}>{personalSpendPct.toFixed(0)}%</strong>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className={`h-full rounded-full ${summary.availablePersonalLimit >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                style={{ width: `${Math.min(100, personalSpendPct)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dark-border bg-dark-surface/50 p-2">
            <div className="flex gap-1 p-1 bg-dark-input rounded-md border border-dark-border">
            {[
                { key: 'current' as View, label: 'Atual' },
                { key: 'next' as View, label: 'Próxima' },
                { key: 'import' as View, label: 'Importar' },
            ].map((item) => (
                <button
                key={item.key}
                type="button"
                onClick={() => setView(item.key)}
                className={`rounded px-4 py-1.5 text-sm font-semibold transition-all ${
                    view === item.key 
                    ? 'bg-sky-600 text-white shadow-sm' 
                    : 'text-dark-text-secondary hover:text-dark-text hover:bg-white/5'
                }`}
                >
                {item.label}
                </button>
            ))}
            </div>

            <div className="flex items-center gap-2 px-2">
               {view === 'current' && (
                 confirmingPay ? (
                   <div className="flex items-center gap-2">
                     <span className="text-xs text-dark-text-secondary">
                       Virar a fatura? A próxima vira a atual.
                     </span>
                     <button
                       onClick={handleConfirmPay}
                       className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 px-3 py-1.5 text-sm font-bold hover:bg-emerald-500/30 transition-all border border-emerald-500/40"
                     >
                       <CheckCircle2 size={15} />
                       Confirmar
                     </button>
                     <button
                       onClick={() => setConfirmingPay(false)}
                       className="rounded-lg px-3 py-1.5 text-sm text-dark-text-muted transition-colors hover:text-dark-text"
                     >
                       Cancelar
                     </button>
                   </div>
                 ) : (
                   <button
                      onClick={() => setConfirmingPay(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 px-4 py-1.5 text-sm font-bold hover:bg-emerald-500/30 hover:text-emerald-300 transition-all border border-emerald-500/30"
                   >
                      <CheckCircle2 size={16} />
                      Pagar Fatura
                   </button>
                 )
               )}
               {view === 'next' && (
                 <span className="flex items-center gap-1.5 text-xs text-dark-text-muted">
                   <Zap size={13} className="text-sky-400/70" />
                   Parcelas e assinaturas são geradas automaticamente
                 </span>
               )}
            </div>
        </div>

        {view !== 'import' ? (
          <div className="rounded-xl border border-dark-border bg-dark-card shadow-lg overflow-hidden flex flex-col">
            <div className="flex flex-wrap items-center gap-2 p-3 bg-dark-surface border-b border-dark-border/50">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-dark-text-muted">
                <Filter size={13} />
                Filtrar
              </span>
              {[
                { key: 'all', label: 'Todos' },
                { key: 'mine', label: 'Meus' },
                { key: 'third-party', label: 'Não são meus' },
                ...(entries.some((entry) => entry.isPrepaid) ? [{ key: 'prepaid', label: 'Pagos' }] : []),
                ...knownOwners.map((owner) => ({ key: owner, label: owner })),
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setOwnerFilter(item.key)}
                  className={`rounded-lg border px-3 py-1 text-xs font-semibold transition-all ${
                    ownerFilter === item.key
                      ? 'border-sky-500 bg-sky-500/20 text-sky-200 shadow-sm'
                      : 'border-transparent bg-dark-input text-dark-text-muted hover:text-dark-text hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <div className="relative ml-auto">
                <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-dark-text-muted" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar..."
                  className="w-40 rounded-lg border border-dark-border bg-dark-input py-1.5 pl-8 pr-7 text-xs text-dark-text outline-none transition-all focus:border-sky-500 focus:ring-2 focus:ring-sky-500/25"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-dark-text-muted transition-colors hover:text-dark-text"
                    title="Limpar busca"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {anticipatingEntry && anticipateMax > 0 && (
              <div className="flex flex-wrap items-center gap-3 border-b border-amber-500/20 bg-amber-500/10 px-4 py-3">
                <FastForward size={15} className="shrink-0 text-amber-400" />
                <div className="text-sm text-amber-100">
                  Antecipar parcelas de <strong>{anticipatingEntry.description}</strong>
                  <span className="text-amber-300/80">
                    {' '}({anticipatingEntry.installmentCurrent}/{anticipatingEntry.installmentTotal} · {anticipateMax} restante{anticipateMax > 1 ? 's' : ''})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={anticipateMax}
                    value={anticipateCount}
                    onChange={(event) =>
                      setAnticipateCount(Math.min(anticipateMax, Math.max(1, Number(event.target.value) || 1)))
                    }
                    className="w-16 rounded-md border border-amber-500/30 bg-dark-input px-2 py-1.5 text-center text-sm text-dark-text outline-none focus:border-amber-500 transition-all"
                  />
                  <span className="text-xs text-amber-300/80">
                    parcela{anticipateCount > 1 ? 's' : ''} · {formatCurrency(anticipateCount * anticipatingEntry.amount)}
                  </span>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAnticipate}
                    className="rounded-md border border-amber-500/40 bg-amber-500/20 px-4 py-1.5 text-sm font-bold text-amber-300 transition-colors hover:bg-amber-500/30"
                  >
                    Antecipar
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnticipateId(null)}
                    className="rounded-md px-3 py-1.5 text-sm text-dark-text-muted transition-colors hover:text-dark-text"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
                <div className="min-w-[820px]">
                    <div className={`grid ${TABLE_COLS} gap-2 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-dark-text-muted border-b border-dark-border bg-dark-surface/80`}>
                        {renderSortHeader('description', 'Descrição')}
                        <div className="text-center">Parc.</div>
                        {renderSortHeader('purchaseDate', 'Data')}
                        {renderSortHeader('cardName', 'Cartão')}
                        {renderSortHeader('amount', 'Fatura', 'right')}
                        <div className="text-right pr-2">É meu</div>
                        <div className="text-right pr-2">Restante</div>
                        <div>Obs / De</div>
                        <div></div>
                    </div>

                    <form
                        onSubmit={(event) => {
                          event.preventDefault()
                          handleAdd()
                        }}
                        className={`grid ${TABLE_COLS} gap-2 px-3 py-2 items-center bg-sky-900/10 border-b border-sky-500/20`}
                    >
                        <input
                            ref={descriptionInputRef}
                            placeholder="Nova compra..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full bg-dark-input border border-dark-border/50 focus:border-sky-500/50 rounded-md px-2.5 py-1.5 text-sm outline-none font-medium text-sky-100 placeholder:text-sky-200/30 transition-all"
                        />
                        <div className="flex items-center justify-center gap-1">
                          {newIsRecurring ? (
                            <button
                              type="button"
                              onClick={() => setNewIsRecurring(false)}
                              title="Assinatura recorrente — clique para desmarcar"
                              className="inline-flex items-center gap-1 rounded bg-violet-500/15 px-1.5 py-1 text-[11px] font-bold text-violet-300 transition-colors hover:bg-violet-500/25"
                            >
                              <Repeat size={11} />
                              Assin.
                            </button>
                          ) : (
                            <>
                              <input
                                value={newInstallmentCurrent}
                                onChange={e => setNewInstallmentCurrent(e.target.value.replace(/\D/g, ''))}
                                placeholder="1"
                                inputMode="numeric"
                                className="w-7 bg-dark-input border border-dark-border/50 focus:border-sky-500/50 rounded-md px-0.5 py-1.5 text-xs text-center tabular-nums outline-none placeholder:text-sky-200/30 transition-all"
                              />
                              <span className="text-xs text-dark-text-muted/60">/</span>
                              <input
                                value={newInstallmentTotal}
                                onChange={e => setNewInstallmentTotal(e.target.value.replace(/\D/g, ''))}
                                placeholder="x"
                                inputMode="numeric"
                                className="w-7 bg-dark-input border border-dark-border/50 focus:border-sky-500/50 rounded-md px-0.5 py-1.5 text-xs text-center tabular-nums outline-none placeholder:text-sky-200/30 transition-all"
                              />
                              <button
                                type="button"
                                onClick={() => setNewIsRecurring(true)}
                                title="Marcar como assinatura recorrente"
                                className="text-dark-text-muted/40 transition-colors hover:text-violet-300"
                              >
                                <Repeat size={12} />
                              </button>
                            </>
                          )}
                        </div>
                        <input
                            placeholder="Data"
                            value={purchaseDate}
                            onChange={e => setPurchaseDate(e.target.value)}
                            className="w-full bg-dark-input border border-dark-border/50 focus:border-sky-500/50 rounded-md px-2 py-1.5 text-sm outline-none text-center placeholder:text-sky-200/30 transition-all"
                        />
                        <input
                            placeholder="Cartão"
                            list="credit-card-names"
                            value={cardName}
                            onChange={e => setCardName(e.target.value)}
                            className="w-full bg-dark-input border border-dark-border/50 focus:border-sky-500/50 rounded-md px-2 py-1.5 text-sm outline-none text-center placeholder:text-sky-200/30 transition-all"
                        />
                        <datalist id="credit-card-names">
                            {knownCards.map((card) => (
                                <option key={card} value={card} />
                            ))}
                        </datalist>
                        <CurrencyInput 
                            value={amount} 
                            onChange={handleAmountChange} 
                            className="!py-1.5 !px-2.5 !pl-7 !bg-dark-input !border-dark-border/50 focus:!border-sky-500/50 text-sm transition-all"
                        />
                        <CurrencyInput 
                            value={personalAmount} 
                            onChange={setPersonalAmount} 
                            className="!py-1.5 !px-2.5 !pl-7 !bg-dark-input !border-dark-border/50 focus:!border-sky-500/50 text-sm transition-all"
                        />
                        <CurrencyInput 
                            value={remainingAmount} 
                            onChange={setRemainingAmount} 
                            className="!py-1.5 !px-2.5 !pl-7 !bg-dark-input !border-dark-border/50 focus:!border-sky-500/50 text-sm transition-all"
                        />
                        <input 
                            placeholder="Pessoa/Obs" 
                            value={ownerNote} 
                            onChange={e => setOwnerNote(e.target.value)}
                            className="w-full bg-dark-input border border-dark-border/50 focus:border-sky-500/50 rounded-md px-2 py-1.5 text-sm outline-none placeholder:text-sky-200/30 transition-all"
                        />
                        <button
                            type="submit"
                            disabled={!description.trim() || amount === 0}
                            className="flex h-8 w-8 items-center justify-center rounded-md bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-40 transition-all shadow-sm"
                            title="Adicionar lançamento (Enter)"
                        >
                            <Plus size={18} />
                        </button>
                    </form>

                    <div className="divide-y divide-dark-border/40">
                        {visibleEntries.length === 0 ? (
                            <div className="px-4 py-8 text-center text-sm text-dark-text-muted">
                                {search || ownerFilter !== 'all'
                                  ? 'Nenhum lançamento corresponde ao filtro.'
                                  : 'Nenhum lançamento nesta fatura.'}
                            </div>
                        ) : (
                            visibleEntries.map((entry) => (
                            <div key={entry.id} className={`grid ${TABLE_COLS} gap-2 px-3 py-1.5 items-center hover:bg-white/[0.03] transition-colors group ${entry.isPrepaid ? 'bg-emerald-500/[0.05]' : ''}`}>
                                <div className="flex min-w-0 items-center gap-1.5">
                                    {entry.autoGenerated && (
                                      <span title="Gerado automaticamente a partir da fatura atual" className="shrink-0 text-sky-400/70">
                                        <Zap size={12} />
                                      </span>
                                    )}
                                    {entry.isPrepaid && (
                                      <span
                                        title="Pago antecipadamente — fora do total da fatura"
                                        className="shrink-0 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300"
                                      >
                                        Pago
                                      </span>
                                    )}
                                    <input
                                        value={entry.description}
                                        onChange={e => updateEntry(entry.id, { description: e.target.value })}
                                        className={`w-full bg-transparent border border-transparent focus:bg-dark-input focus:border-dark-border rounded px-2 py-1 text-sm font-medium outline-none transition-all ${entry.isPrepaid ? 'text-emerald-200/80' : ''}`}
                                    />
                                </div>
                                <div className="flex items-center justify-center gap-1">
                                  {entry.isRecurring ? (
                                    <button
                                      type="button"
                                      onClick={() => updateEntry(entry.id, { isRecurring: false })}
                                      title="Assinatura recorrente — repete todo mês. Clique para desmarcar."
                                      className="inline-flex items-center gap-1 rounded bg-violet-500/15 px-1.5 py-0.5 text-[11px] font-bold text-violet-300 transition-colors hover:bg-violet-500/25"
                                    >
                                      <Repeat size={11} />
                                      Assin.
                                    </button>
                                  ) : (
                                    <>
                                      <input
                                        value={entry.installmentCurrent ?? ''}
                                        onChange={e => handleInstallmentChange(entry, 'current', e.target.value)}
                                        placeholder="-"
                                        inputMode="numeric"
                                        className="w-7 bg-transparent border border-transparent focus:bg-dark-input focus:border-dark-border rounded px-0.5 py-1 text-xs text-center tabular-nums outline-none transition-all"
                                      />
                                      <span className="text-xs text-dark-text-muted/50">/</span>
                                      <input
                                        value={entry.installmentTotal ?? ''}
                                        onChange={e => handleInstallmentChange(entry, 'total', e.target.value)}
                                        placeholder="-"
                                        inputMode="numeric"
                                        className="w-7 bg-transparent border border-transparent focus:bg-dark-input focus:border-dark-border rounded px-0.5 py-1 text-xs text-center tabular-nums outline-none transition-all"
                                      />
                                      {!entry.installmentTotal && (
                                        <button
                                          type="button"
                                          onClick={() => updateEntry(entry.id, { isRecurring: true })}
                                          title="Marcar como assinatura recorrente"
                                          className="text-dark-text-muted/40 opacity-0 transition-all group-hover:opacity-100 hover:text-violet-300"
                                        >
                                          <Repeat size={12} />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                                <input
                                    value={entry.purchaseDate}
                                    onChange={e => updateEntry(entry.id, { purchaseDate: e.target.value })}
                                    className="w-full bg-transparent border border-transparent focus:bg-dark-input focus:border-dark-border rounded px-1 py-1 text-sm outline-none text-center transition-all"
                                />
                                <input
                                    value={entry.cardName}
                                    onChange={e => updateEntry(entry.id, { cardName: e.target.value })}
                                    className="w-full bg-transparent border border-transparent focus:bg-dark-input focus:border-dark-border rounded px-1 py-1 text-sm outline-none text-center transition-all"
                                />
                                <CurrencyInput
                                    value={formatNumberInputValue(entry.amount)}
                                    onChange={v => updateEntry(entry.id, { amount: v })}
                                    className={`!py-1 !px-2 !pl-6 !bg-transparent !border-transparent hover:!bg-white/5 focus:!bg-dark-input focus:!border-dark-border text-sm transition-all ${entry.isPrepaid ? '!text-emerald-400 line-through' : ''}`}
                                />
                                <CurrencyInput
                                    value={formatNumberInputValue(entry.personalAmount)}
                                    onChange={v => updateEntry(entry.id, { personalAmount: v })}
                                    className={`!py-1 !px-2 !pl-6 !bg-transparent !border-transparent hover:!bg-white/5 focus:!bg-dark-input focus:!border-dark-border text-sm transition-all ${entry.isPrepaid ? '!text-emerald-400 line-through' : ''}`}
                                />
                                <CurrencyInput 
                                    value={formatNumberInputValue(entry.remainingAmount)} 
                                    onChange={v => updateEntry(entry.id, { remainingAmount: v })}
                                    className="!py-1 !px-2 !pl-6 !bg-transparent !border-transparent hover:!bg-white/5 focus:!bg-dark-input focus:!border-dark-border text-sm transition-all"
                                />
                                <input 
                                    value={entry.ownerName || entry.ownerNote}
                                    onChange={e => updateEntry(entry.id, { ownerNote: e.target.value, ownerName: '' })}
                                    className="w-full bg-transparent border border-transparent focus:bg-dark-input focus:border-dark-border rounded px-2 py-1 text-sm outline-none text-dark-text-secondary transition-all"
                                    placeholder="-"
                                />
                                <div className="flex items-center justify-end gap-0.5">
                                    <button
                                        onClick={() => updateEntry(entry.id, { isPrepaid: !entry.isPrepaid })}
                                        className={`flex h-7 w-7 items-center justify-center rounded-md transition-all ${
                                          entry.isPrepaid
                                            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                            : 'text-dark-text-muted hover:bg-emerald-500/20 hover:text-emerald-400 opacity-0 group-hover:opacity-100'
                                        }`}
                                        title={
                                          entry.isPrepaid
                                            ? 'Pago antecipadamente — clique para devolver ao total da fatura'
                                            : 'Já paguei antecipado (tira do total da fatura)'
                                        }
                                    >
                                        <HandCoins size={15} />
                                    </button>
                                    {visibleCycle === 'current' &&
                                      !entry.isRecurring &&
                                      (entry.installmentCurrent ?? 0) > 0 &&
                                      (entry.installmentCurrent ?? 0) < (entry.installmentTotal ?? 0) && (
                                      <button
                                          onClick={() => { setAnticipateId(entry.id); setAnticipateCount(1) }}
                                          className="flex h-7 w-7 items-center justify-center rounded-md text-dark-text-muted hover:bg-amber-500/20 hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-all"
                                          title="Antecipar parcelas"
                                      >
                                          <FastForward size={15} />
                                      </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(entry)}
                                        className="flex h-7 w-7 items-center justify-center rounded-md text-dark-text-muted hover:bg-rose-500/20 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
                                        title="Remover"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
            
            <div className="bg-dark-surface px-4 py-3 border-t border-dark-border flex flex-wrap justify-between items-center gap-2">
                <div className="text-xs text-dark-text-muted">
                    {visibleCycle === 'current'
                    ? `${summary.currentEntriesCount} lançamentos cadastrados`
                    : `${summary.nextEntriesCount} lançamentos previstos`}
                </div>
                {visibleCycle === 'current' && summary.currentPrepaidTotal > 0 && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                    <HandCoins size={13} />
                    {formatCurrency(summary.currentPrepaidTotal)} pagos antecipadamente, fora do total da fatura
                  </div>
                )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dark-border bg-dark-card p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-dark-text">
                  <Upload size={16} className="text-sky-400" />
                  Colar planilha do cartão
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-dark-text-muted max-w-lg">
                  Cole linhas do Sheets com colunas na ordem parecida: Descrição, Data, Cartão, Fatura, É meu, Restante, Assinatura e Pago.
                  Parcelas como "3/10" no nome são detectadas e movidas para a coluna Parc.; marque "sim" em Assinatura para compras recorrentes
                  e "sim" em Pago para compras já pagas antecipadamente.
                </p>
              </div>
              <span className="rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-300">
                {parsedImport.length} linhas detectadas
              </span>
            </div>

            <textarea
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder={'Descrição\tData\tCartão\tFatura\tÉ meu\tRestante\nYoutube premium\t20/06\tItaú\t53,90\t53,90\t0'}
              className="mt-4 min-h-[200px] w-full rounded-lg border border-dark-border bg-dark-input px-4 py-3 font-mono text-xs text-dark-text outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 transition-all"
            />

            <div className="mt-4 flex flex-wrap items-end gap-3 bg-dark-surface p-3 rounded-lg border border-dark-border">
              <label className="block flex-1 min-w-[150px]">
                <span className="mb-1.5 block text-xs font-semibold text-dark-text-muted uppercase tracking-wide">Destino</span>
                <select
                  value={importCycle}
                  onChange={(event) => setImportCycle(event.target.value as CreditCardCycle)}
                  className="w-full rounded-md border border-dark-border bg-dark-input px-3 py-2.5 text-sm font-medium text-dark-text outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 transition-all"
                >
                  <option value="current">Fatura atual</option>
                  <option value="next">Próxima fatura</option>
                </select>
              </label>
              <label className="flex h-[42px] flex-1 min-w-[200px] items-center gap-2 rounded-md border border-dark-border bg-dark-input px-3 text-sm font-medium text-dark-text-secondary cursor-pointer hover:bg-dark-input/80 transition-colors">
                <input
                  type="checkbox"
                  checked={replaceOnImport}
                  onChange={(event) => setReplaceOnImport(event.target.checked)}
                  className="h-4 w-4 accent-sky-600 rounded"
                />
                Substituir fatura de destino
              </label>
              <button
                type="button"
                onClick={handleImport}
                disabled={!parsedImport.length}
                className="inline-flex h-[42px] items-center justify-center gap-1.5 rounded-md bg-sky-600 px-6 text-sm font-bold text-white transition-all hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40 shadow-sm"
              >
                <FileText size={16} />
                Importar Dados
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-dark-border bg-dark-card p-4 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-dark-text-muted">
               <CreditCard size={14} /> Totais por cartão
            </h3>
            {summary.totalsByCard.length > 0 ? (
              <div className="space-y-2.5">
                {summary.totalsByCard.map((card) => (
                  <div key={card.cardName} className="flex items-center justify-between gap-3 text-sm p-2 rounded-lg bg-dark-surface border border-dark-border/50">
                    <span className="font-semibold text-dark-text-secondary">{card.cardName}</span>
                    <span className="text-right">
                      <strong className="block text-dark-text">{formatCurrency(card.totalAmount)}</strong>
                      <span className="text-[10px] uppercase tracking-wide text-primary-300">Meu: {formatCurrency(card.personalAmount)}</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-dark-text-muted py-2">Sem cartões na fatura atual.</p>
            )}
          </div>

          <div className="rounded-xl border border-dark-border bg-dark-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-dark-text-muted">Por pessoa</h3>
            {summary.totalsByOwner.length > 0 ? (
              <div className="space-y-2.5">
                {summary.totalsByOwner.map((owner) => (
                  <div key={owner.cardName} className="flex items-center justify-between gap-3 text-sm p-2 rounded-lg bg-dark-surface border border-dark-border/50">
                    <span className="font-semibold text-dark-text-secondary">{owner.cardName}</span>
                    <strong className="text-sky-300">{formatCurrency(owner.totalAmount)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-dark-text-muted py-2">Sem compras de terceiros na fatura atual.</p>
            )}
          </div>

          <div className="rounded-xl border border-dark-border bg-dark-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-dark-text-muted">Resumo do Futuro</h3>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between items-center gap-3 p-2 rounded-lg bg-dark-surface border border-dark-border/50">
                <dt className="font-medium text-dark-text-secondary">Próxima fatura</dt>
                <dd className="font-bold text-dark-text">{formatCurrency(summary.nextTotal)}</dd>
              </div>
              <div className="flex justify-between items-center gap-3 p-2 rounded-lg bg-dark-surface border border-dark-border/50">
                <dt className="font-medium text-dark-text-secondary">Meu próximo</dt>
                <dd className="font-bold text-primary-300">{formatCurrency(summary.nextPersonalTotal)}</dd>
              </div>
              <div className="flex justify-between items-center gap-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <dt className="font-medium text-amber-500/80">Parcelas restantes</dt>
                <dd className="font-bold text-amber-400">{formatCurrency(summary.remainingInstallmentsTotal)}</dd>
              </div>
              <div className="flex justify-between items-center gap-3 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <dt className="font-medium text-amber-400/70">Minhas parcelas restantes</dt>
                <dd className="font-bold text-amber-300">{formatCurrency(summary.remainingPersonalInstallmentsTotal)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {pendingUndo && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-dark-border bg-dark-surface/95 px-4 py-3 shadow-2xl backdrop-blur">
          <Trash2 size={15} className="shrink-0 text-rose-400" />
          <span className="text-sm text-dark-text">
            <strong className="font-semibold">{pendingUndo.description}</strong> removido
          </span>
          <button
            type="button"
            onClick={handleUndoDelete}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-bold text-white transition-colors hover:bg-sky-500"
          >
            <Undo2 size={15} />
            Desfazer
          </button>
          <button
            type="button"
            onClick={() => setPendingUndo(null)}
            className="text-dark-text-muted transition-colors hover:text-dark-text"
            title="Dispensar"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </Card>
  )
}
