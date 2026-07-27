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
import { CurrencyInput } from './CurrencyInput'
import {
  ConfirmButton,
  Meter,
  Panel,
  PanelHeader,
  SecondaryButton,
  SegmentedControl,
  StatTile,
} from './ui'
import { formatCurrency, inputClass } from '../lib/format'
import { normalizeText } from '../lib/shared'
import {
  buildRemainingAmount,
  parseInstallments,
  parseSpreadsheet,
  stripInstallmentToken,
} from '../lib/cardImport'
import { useCardsStore, useMetrics } from '../context/financasStore'
import type { BudgetArea, CreditCardCycle, CreditCardEntry } from '../types'
import { BUDGET_AREAS, BUDGET_AREA_COLORS, BUDGET_AREA_SHORT_LABELS } from '../types/constants'

type View = CreditCardCycle | 'import'
type SortKey = 'description' | 'purchaseDate' | 'cardName' | 'amount'
type SortState = { key: SortKey; dir: 'asc' | 'desc' }

const KNOWN_CARDS = ['Itaú', 'XP', 'Inter', 'Nu']
const TABLE_COLS =
  'grid-cols-[minmax(140px,1.4fr)_84px_64px_92px_128px_104px_104px_104px_minmax(72px,0.8fr)_56px]'

function todayShort() {
  const now = new Date()
  return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`
}

// Converte "dd/mm" num inteiro comparável (mm*100+dd). Sem data vai para o fim.
function dateSortValue(raw: string) {
  const match = raw.match(/(\d{1,2})\s*\/\s*(\d{1,2})/)
  if (!match) return Number.MAX_SAFE_INTEGER
  return Number(match[2]) * 100 + Number(match[1])
}

/** Célula da área do orçamento — é o que liga a fatura ao plano do mês. */
function AreaCell({
  value,
  onChange,
}: {
  value?: BudgetArea
  onChange: (area: BudgetArea | undefined) => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: value ? BUDGET_AREA_COLORS[value] : 'transparent' }}
      />
      <select
        value={value ?? ''}
        onChange={(event) => onChange((event.target.value || undefined) as BudgetArea | undefined)}
        aria-label="Área do orçamento"
        className={`w-full rounded border border-transparent bg-transparent px-1 py-1 text-xs outline-none transition-all focus:border-dark-border focus:bg-dark-input ${
          value ? 'text-dark-text-secondary' : 'text-dark-text-muted'
        }`}
      >
        <option value="">— área</option>
        {BUDGET_AREAS.map((area) => (
          <option key={area} value={area}>
            {BUDGET_AREA_SHORT_LABELS[area]}
          </option>
        ))}
      </select>
    </div>
  )
}

export function CreditCardManager() {
  const {
    entries,
    settings,
    summary,
    addEntry,
    updateEntry,
    removeEntry,
    replaceEntries,
    appendEntries,
    anticipateInstallments,
    payInvoice,
    setSettings,
  } = useCardsStore()
  const { availableForBudget } = useMetrics()

  const [view, setView] = useState<View>('current')

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
  const [newArea, setNewArea] = useState<BudgetArea | undefined>(undefined)

  const [ownerFilter, setOwnerFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortState | null>(null)
  const [importText, setImportText] = useState('')
  const [importCycle, setImportCycle] = useState<CreditCardCycle>('current')
  const [replaceOnImport, setReplaceOnImport] = useState(true)

  const [anticipateId, setAnticipateId] = useState<string | null>(null)
  const [anticipateCount, setAnticipateCount] = useState(1)

  // Exclusão com desfazer: guarda o último lançamento removido por alguns segundos.
  const [pendingUndo, setPendingUndo] = useState<CreditCardEntry | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const visibleCycle: CreditCardCycle = view === 'next' ? 'next' : 'current'
  const normalizedSearch = normalizeText(search)

  const filteredEntries = entries.filter((entry) => {
    if (entry.cycle !== visibleCycle) return false
    if (
      normalizedSearch &&
      !normalizeText(
        `${entry.description} ${entry.cardName} ${entry.ownerName ?? ''} ${entry.ownerNote ?? ''}`,
      ).includes(normalizedSearch)
    ) {
      return false
    }
    if (ownerFilter === 'all') return true
    if (ownerFilter === 'mine') return entry.personalAmount > 0
    if (ownerFilter === 'third-party') return entry.amount - entry.personalAmount > 0
    if (ownerFilter === 'prepaid') return entry.isPrepaid === true
    if (ownerFilter === 'unclassified') return !entry.budgetArea
    return (entry.ownerName || entry.ownerNote || 'Outro') === ownerFilter
  })

  const visibleEntries = sort
    ? [...filteredEntries].sort((a, b) => {
        const dir = sort.dir === 'asc' ? 1 : -1
        if (sort.key === 'amount') return dir * (a.amount - b.amount)
        if (sort.key === 'purchaseDate')
          return dir * (dateSortValue(a.purchaseDate) - dateSortValue(b.purchaseDate))
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

  const anticipatingEntry = anticipateId
    ? (entries.find((entry) => entry.id === anticipateId) ?? null)
    : null
  const anticipateMax =
    anticipatingEntry?.installmentCurrent && anticipatingEntry.installmentTotal
      ? anticipatingEntry.installmentTotal - anticipatingEntry.installmentCurrent
      : 0

  const knownCards = Array.from(
    new Set([...KNOWN_CARDS, ...entries.map((entry) => entry.cardName).filter(Boolean)]),
  )
  const knownOwners = Array.from(
    new Set(
      entries
        .filter((entry) => entry.amount - entry.personalAmount > 0)
        .map((entry) => entry.ownerName || entry.ownerNote || 'Outro'),
    ),
  )

  const personalSpendPct =
    settings.personalSpendingLimit > 0
      ? (summary.currentPersonalTotal / settings.personalSpendingLimit) * 100
      : 0

  const handleAmountChange = (val: number) => {
    if (personalAmount === amount || personalAmount === 0) setPersonalAmount(val)
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

    const isShared = amount - personalAmount > 0

    addEntry({
      cycle: visibleCycle,
      description: cleanDescription,
      purchaseDate,
      cardName: cardName.trim() || 'Cartão',
      amount,
      personalAmount,
      remainingAmount: computedRemainingAmount,
      budgetArea: newArea,
      ownerName: isShared ? ownerNote.trim() || 'Outro' : '',
      ownerNote: isShared ? '' : ownerNote.trim(),
      installmentCurrent,
      installmentTotal,
      isRecurring: newIsRecurring || undefined,
    })

    setDescription('')
    // Data, cartão e área são mantidos: em geral várias compras seguidas os compartilham.
    setAmount(0)
    setPersonalAmount(0)
    setRemainingAmount(0)
    setOwnerNote('')
    setNewInstallmentCurrent('')
    setNewInstallmentTotal('')
    setNewIsRecurring(false)
    descriptionInputRef.current?.focus()
  }

  const handleImport = () => {
    if (!parsedImport.length) return
    if (replaceOnImport) replaceEntries(importCycle, parsedImport)
    else appendEntries(importCycle, parsedImport)
    setImportText('')
    setView(importCycle)
  }

  const handleInstallmentChange = (
    entry: CreditCardEntry,
    field: 'current' | 'total',
    raw: string,
  ) => {
    const value = Number(raw.replace(/\D/g, '')) || 0
    const installmentCurrent = field === 'current' ? value : (entry.installmentCurrent ?? 0)
    const installmentTotal = field === 'total' ? value : (entry.installmentTotal ?? 0)
    updateEntry(entry.id, {
      installmentCurrent: installmentCurrent || undefined,
      installmentTotal: installmentTotal || undefined,
      remainingAmount: buildRemainingAmount(entry.amount, installmentCurrent, installmentTotal),
    })
  }

  const handleAnticipate = () => {
    if (!anticipatingEntry || anticipateMax < 1) return
    anticipateInstallments(anticipatingEntry.id, Math.min(Math.max(1, anticipateCount), anticipateMax))
    setAnticipateId(null)
    setAnticipateCount(1)
  }

  const renderSortHeader = (
    key: SortKey,
    label: string,
    align: 'left' | 'right' | 'center' = 'left',
  ) => {
    const active = sort?.key === key
    const alignClass =
      align === 'right' ? 'justify-end pr-2' : align === 'center' ? 'justify-center' : 'justify-start'
    return (
      <button
        type="button"
        onClick={() => toggleSort(key)}
        className={`flex items-center gap-1 ${alignClass} font-medium uppercase tracking-wider transition-colors hover:text-dark-text ${
          active ? 'text-dark-text' : ''
        }`}
      >
        {label}
        {active ? (
          sort?.dir === 'asc' ? (
            <ChevronUp size={12} />
          ) : (
            <ChevronDown size={12} />
          )
        ) : (
          <ArrowUpDown size={11} className="opacity-30" />
        )}
      </button>
    )
  }

  const cellClass =
    'w-full rounded border border-transparent bg-transparent px-2 py-1 text-sm outline-none transition-all focus:border-dark-border focus:bg-dark-input'
  const moneyCellClass =
    '!border-transparent !bg-transparent !py-1 !pl-6 !pr-2 text-sm transition-all hover:!bg-white/5 focus:!border-dark-border focus:!bg-dark-input'

  return (
    <div className="space-y-4">
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Fatura atual"
          value={formatCurrency(summary.currentTotal)}
          detail={
            summary.currentPrepaidTotal > 0
              ? `+ ${formatCurrency(summary.currentPrepaidTotal)} já pagos antecipado`
              : `${summary.currentEntriesCount} lançamentos`
          }
        />
        <StatTile
          label="Minha parte"
          value={formatCurrency(summary.currentPersonalTotal)}
          detail={
            availableForBudget > 0
              ? `${((summary.currentPersonalTotal / availableForBudget) * 100).toFixed(0)}% da base do orçamento`
              : undefined
          }
          tone="accent"
        />
        <StatTile
          label="Não é meu"
          value={formatCurrency(summary.currentThirdPartyTotal)}
          detail={summary.currentThirdPartyTotal > 0 ? 'a receber de terceiros' : undefined}
        />
        <StatTile
          label={summary.availablePersonalLimit >= 0 ? 'Limite disponível' : 'Acima do limite'}
          value={formatCurrency(Math.abs(summary.availablePersonalLimit))}
          detail={`${personalSpendPct.toFixed(0)}% do teto de ${formatCurrency(settings.personalSpendingLimit)}`}
          tone={summary.availablePersonalLimit >= 0 ? 'neutral' : 'negative'}
        />
      </div>

      <Panel>
        <div className="grid gap-4 lg:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-dark-text-muted">
              <Calendar size={13} />
              Data de pagamento
            </span>
            <input
              value={settings.paymentDate}
              onChange={(event) => setSettings({ ...settings, paymentDate: event.target.value })}
              className={inputClass}
              placeholder="05/07"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-dark-text-muted">
              Limite pessoal
            </span>
            <CurrencyInput
              value={settings.personalSpendingLimit}
              onChange={(value) => setSettings({ ...settings, personalSpendingLimit: value })}
            />
          </label>
          <div className="flex flex-col justify-end">
            <div className="mb-1.5 flex items-end justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-dark-text-muted">
                Uso do limite
              </span>
              <strong
                className={`text-sm tabular-nums ${
                  summary.availablePersonalLimit >= 0 ? 'text-dark-text' : 'text-rose-400'
                }`}
              >
                {personalSpendPct.toFixed(0)}%
              </strong>
            </div>
            <Meter
              value={summary.currentPersonalTotal}
              max={settings.personalSpendingLimit}
              color={BUDGET_AREA_COLORS.investimentos}
              height={8}
            />
          </div>
        </div>
      </Panel>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          className="w-full sm:w-auto sm:min-w-80"
          value={view}
          onChange={setView}
          options={[
            { value: 'current' as View, label: 'Atual' },
            { value: 'next' as View, label: 'Próxima' },
            { value: 'import' as View, label: 'Importar' },
          ]}
        />

        {view === 'current' && (
          <ConfirmButton onConfirm={payInvoice} confirmLabel="Virar a fatura" tone="primary">
            <CheckCircle2 size={15} />
            Pagar fatura
          </ConfirmButton>
        )}
        {view === 'next' && (
          <span className="flex items-center gap-1.5 text-xs text-dark-text-muted">
            <Zap size={13} />
            Parcelas e assinaturas são geradas automaticamente
          </span>
        )}
      </div>

      {view !== 'import' ? (
        <Panel padded={false} className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-dark-border-subtle p-3">
            <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-dark-text-muted">
              <Filter size={13} />
              Filtrar
            </span>
            {[
              { key: 'all', label: 'Todos' },
              { key: 'mine', label: 'Meus' },
              { key: 'third-party', label: 'Não são meus' },
              ...(summary.unclassifiedPersonal > 0
                ? [{ key: 'unclassified', label: 'Sem área' }]
                : []),
              ...(entries.some((entry) => entry.isPrepaid) ? [{ key: 'prepaid', label: 'Pagos' }] : []),
              ...knownOwners.map((owner) => ({ key: owner, label: owner })),
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setOwnerFilter(item.key)}
                className={`rounded-lg border px-3 py-1 text-xs font-medium transition-colors ${
                  ownerFilter === item.key
                    ? 'border-primary-500/60 bg-primary-500/10 text-primary-200'
                    : 'border-transparent bg-dark-input text-dark-text-muted hover:bg-white/[0.06] hover:text-dark-text'
                }`}
              >
                {item.label}
              </button>
            ))}
            <div className="relative ml-auto">
              <Search
                size={13}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-dark-text-muted"
              />
              <input
                data-card-search
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar..."
                aria-label="Buscar lançamentos"
                className="w-40 rounded-lg border border-dark-border bg-dark-input py-1.5 pl-8 pr-7 text-xs text-dark-text outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/25"
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
            <div className="flex flex-wrap items-center gap-3 border-b border-amber-500/20 bg-amber-500/[0.07] px-4 py-3">
              <FastForward size={15} className="shrink-0 text-amber-300" />
              <div className="text-sm text-dark-text">
                Antecipar parcelas de <strong>{anticipatingEntry.description}</strong>
                <span className="text-dark-text-muted">
                  {' '}
                  ({anticipatingEntry.installmentCurrent}/{anticipatingEntry.installmentTotal} ·{' '}
                  {anticipateMax} restante{anticipateMax > 1 ? 's' : ''})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={anticipateMax}
                  value={anticipateCount}
                  onChange={(event) =>
                    setAnticipateCount(
                      Math.min(anticipateMax, Math.max(1, Number(event.target.value) || 1)),
                    )
                  }
                  aria-label="Quantidade de parcelas"
                  className="w-16 rounded-md border border-dark-border bg-dark-input px-2 py-1.5 text-center text-sm text-dark-text outline-none transition-all focus:border-amber-400"
                />
                <span className="text-xs text-dark-text-muted">
                  parcela{anticipateCount > 1 ? 's' : ''} ·{' '}
                  {formatCurrency(anticipateCount * anticipatingEntry.amount)}
                </span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <SecondaryButton onClick={handleAnticipate}>Antecipar</SecondaryButton>
                <button
                  type="button"
                  onClick={() => setAnticipateId(null)}
                  className="rounded-lg px-3 py-1.5 text-sm text-dark-text-muted transition-colors hover:text-dark-text"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <div className="min-w-[960px]">
              <div
                className={`grid ${TABLE_COLS} gap-2 border-b border-dark-border bg-dark-surface/60 px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-dark-text-muted`}
              >
                {renderSortHeader('description', 'Descrição')}
                <div className="text-center">Parc.</div>
                {renderSortHeader('purchaseDate', 'Data')}
                {renderSortHeader('cardName', 'Cartão')}
                <div>Área</div>
                {renderSortHeader('amount', 'Fatura', 'right')}
                <div className="pr-2 text-right">É meu</div>
                <div className="pr-2 text-right">Restante</div>
                <div>Obs / De</div>
                <div />
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  handleAdd()
                }}
                className={`grid ${TABLE_COLS} items-center gap-2 border-b border-dark-border-subtle bg-dark-surface/30 px-3 py-2`}
              >
                <input
                  ref={descriptionInputRef}
                  placeholder="Nova compra..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  aria-label="Descrição da nova compra"
                  className="w-full rounded-md border border-dark-border/60 bg-dark-input px-2.5 py-1.5 text-sm font-medium text-dark-text outline-none transition-all placeholder:text-dark-text-muted focus:border-primary-500/60"
                />
                <div className="flex items-center justify-center gap-1">
                  {newIsRecurring ? (
                    <button
                      type="button"
                      onClick={() => setNewIsRecurring(false)}
                      title="Assinatura recorrente — clique para desmarcar"
                      className="inline-flex items-center gap-1 rounded bg-dark-input px-1.5 py-1 text-[11px] font-semibold text-dark-text-secondary transition-colors hover:text-dark-text"
                    >
                      <Repeat size={11} />
                      Assin.
                    </button>
                  ) : (
                    <>
                      <input
                        value={newInstallmentCurrent}
                        onChange={(e) =>
                          setNewInstallmentCurrent(e.target.value.replace(/\D/g, ''))
                        }
                        placeholder="1"
                        inputMode="numeric"
                        aria-label="Parcela atual"
                        className="w-7 rounded-md border border-dark-border/60 bg-dark-input px-0.5 py-1.5 text-center text-xs tabular-nums outline-none transition-all placeholder:text-dark-text-muted focus:border-primary-500/60"
                      />
                      <span className="text-xs text-dark-text-muted/60">/</span>
                      <input
                        value={newInstallmentTotal}
                        onChange={(e) => setNewInstallmentTotal(e.target.value.replace(/\D/g, ''))}
                        placeholder="x"
                        inputMode="numeric"
                        aria-label="Total de parcelas"
                        className="w-7 rounded-md border border-dark-border/60 bg-dark-input px-0.5 py-1.5 text-center text-xs tabular-nums outline-none transition-all placeholder:text-dark-text-muted focus:border-primary-500/60"
                      />
                      <button
                        type="button"
                        onClick={() => setNewIsRecurring(true)}
                        title="Marcar como assinatura recorrente"
                        className="text-dark-text-muted/50 transition-colors hover:text-dark-text"
                      >
                        <Repeat size={12} />
                      </button>
                    </>
                  )}
                </div>
                <input
                  placeholder="Data"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  aria-label="Data da compra"
                  className="w-full rounded-md border border-dark-border/60 bg-dark-input px-2 py-1.5 text-center text-sm outline-none transition-all placeholder:text-dark-text-muted focus:border-primary-500/60"
                />
                <input
                  placeholder="Cartão"
                  list="credit-card-names"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  aria-label="Cartão"
                  className="w-full rounded-md border border-dark-border/60 bg-dark-input px-2 py-1.5 text-center text-sm outline-none transition-all placeholder:text-dark-text-muted focus:border-primary-500/60"
                />
                <datalist id="credit-card-names">
                  {knownCards.map((card) => (
                    <option key={card} value={card} />
                  ))}
                </datalist>
                <AreaCell value={newArea} onChange={setNewArea} />
                <CurrencyInput
                  value={amount}
                  onChange={handleAmountChange}
                  className="!border-dark-border/60 !bg-dark-input !py-1.5 !pl-7 !pr-2.5 text-sm transition-all"
                />
                <CurrencyInput
                  value={personalAmount}
                  onChange={setPersonalAmount}
                  className="!border-dark-border/60 !bg-dark-input !py-1.5 !pl-7 !pr-2.5 text-sm transition-all"
                />
                <CurrencyInput
                  value={remainingAmount}
                  onChange={setRemainingAmount}
                  className="!border-dark-border/60 !bg-dark-input !py-1.5 !pl-7 !pr-2.5 text-sm transition-all"
                />
                <input
                  placeholder="Pessoa/Obs"
                  value={ownerNote}
                  onChange={(e) => setOwnerNote(e.target.value)}
                  aria-label="Pessoa ou observação"
                  className="w-full rounded-md border border-dark-border/60 bg-dark-input px-2 py-1.5 text-sm outline-none transition-all placeholder:text-dark-text-muted focus:border-primary-500/60"
                />
                <button
                  type="submit"
                  disabled={!description.trim() || amount === 0}
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-600 text-white transition-all hover:bg-primary-500 disabled:opacity-40"
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
                    <div
                      key={entry.id}
                      className={`group grid ${TABLE_COLS} items-center gap-2 px-3 py-1.5 transition-colors hover:bg-white/[0.03] ${
                        entry.isPrepaid ? 'bg-primary-500/[0.04]' : ''
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-1.5">
                        {entry.autoGenerated && (
                          <span
                            title="Gerado automaticamente a partir da fatura atual"
                            className="shrink-0 text-dark-text-muted"
                          >
                            <Zap size={12} />
                          </span>
                        )}
                        {entry.isPrepaid && (
                          <span
                            title="Pago antecipadamente — fora do total da fatura"
                            className="shrink-0 rounded bg-primary-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-300"
                          >
                            Pago
                          </span>
                        )}
                        <input
                          value={entry.description}
                          onChange={(e) => updateEntry(entry.id, { description: e.target.value })}
                          aria-label="Descrição"
                          className={`${cellClass} font-medium`}
                        />
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        {entry.isRecurring ? (
                          <button
                            type="button"
                            onClick={() => updateEntry(entry.id, { isRecurring: false })}
                            title="Assinatura recorrente — repete todo mês. Clique para desmarcar."
                            className="inline-flex items-center gap-1 rounded bg-dark-input px-1.5 py-0.5 text-[11px] font-semibold text-dark-text-secondary transition-colors hover:text-dark-text"
                          >
                            <Repeat size={11} />
                            Assin.
                          </button>
                        ) : (
                          <>
                            <input
                              value={entry.installmentCurrent ?? ''}
                              onChange={(e) => handleInstallmentChange(entry, 'current', e.target.value)}
                              placeholder="-"
                              inputMode="numeric"
                              aria-label="Parcela atual"
                              className="w-7 rounded border border-transparent bg-transparent px-0.5 py-1 text-center text-xs tabular-nums outline-none transition-all focus:border-dark-border focus:bg-dark-input"
                            />
                            <span className="text-xs text-dark-text-muted/50">/</span>
                            <input
                              value={entry.installmentTotal ?? ''}
                              onChange={(e) => handleInstallmentChange(entry, 'total', e.target.value)}
                              placeholder="-"
                              inputMode="numeric"
                              aria-label="Total de parcelas"
                              className="w-7 rounded border border-transparent bg-transparent px-0.5 py-1 text-center text-xs tabular-nums outline-none transition-all focus:border-dark-border focus:bg-dark-input"
                            />
                            {!entry.installmentTotal && (
                              <button
                                type="button"
                                onClick={() => updateEntry(entry.id, { isRecurring: true })}
                                title="Marcar como assinatura recorrente"
                                className="text-dark-text-muted/40 opacity-0 transition-all hover:text-dark-text focus-visible:opacity-100 group-hover:opacity-100"
                              >
                                <Repeat size={12} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                      <input
                        value={entry.purchaseDate}
                        onChange={(e) => updateEntry(entry.id, { purchaseDate: e.target.value })}
                        aria-label="Data"
                        className={`${cellClass} !px-1 text-center`}
                      />
                      <input
                        value={entry.cardName}
                        onChange={(e) => updateEntry(entry.id, { cardName: e.target.value })}
                        aria-label="Cartão"
                        className={`${cellClass} !px-1 text-center`}
                      />
                      <AreaCell
                        value={entry.budgetArea}
                        onChange={(area) => updateEntry(entry.id, { budgetArea: area })}
                      />
                      <CurrencyInput
                        value={entry.amount}
                        onChange={(v) => updateEntry(entry.id, { amount: v })}
                        className={`${moneyCellClass} ${entry.isPrepaid ? '!text-primary-400 line-through' : ''}`}
                      />
                      <CurrencyInput
                        value={entry.personalAmount}
                        onChange={(v) => updateEntry(entry.id, { personalAmount: v })}
                        className={`${moneyCellClass} ${entry.isPrepaid ? '!text-primary-400 line-through' : ''}`}
                      />
                      <CurrencyInput
                        value={entry.remainingAmount}
                        onChange={(v) => updateEntry(entry.id, { remainingAmount: v })}
                        className={moneyCellClass}
                      />
                      <input
                        value={entry.ownerName || entry.ownerNote}
                        onChange={(e) =>
                          updateEntry(entry.id, { ownerNote: e.target.value, ownerName: '' })
                        }
                        aria-label="Pessoa ou observação"
                        className={`${cellClass} text-dark-text-secondary`}
                        placeholder="-"
                      />
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          onClick={() => updateEntry(entry.id, { isPrepaid: !entry.isPrepaid })}
                          className={`flex h-7 w-7 items-center justify-center rounded-md transition-all ${
                            entry.isPrepaid
                              ? 'bg-primary-500/15 text-primary-400 hover:bg-primary-500/25'
                              : 'text-dark-text-muted opacity-0 hover:bg-primary-500/15 hover:text-primary-400 focus-visible:opacity-100 group-hover:opacity-100'
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
                              onClick={() => {
                                setAnticipateId(entry.id)
                                setAnticipateCount(1)
                              }}
                              className="flex h-7 w-7 items-center justify-center rounded-md text-dark-text-muted opacity-0 transition-all hover:bg-amber-500/15 hover:text-amber-300 focus-visible:opacity-100 group-hover:opacity-100"
                              title="Antecipar parcelas"
                            >
                              <FastForward size={15} />
                            </button>
                          )}
                        <button
                          onClick={() => handleDelete(entry)}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-dark-text-muted opacity-0 transition-all hover:bg-rose-500/15 hover:text-rose-400 focus-visible:opacity-100 group-hover:opacity-100"
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

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dark-border-subtle px-4 py-3 text-xs text-dark-text-muted">
            <span>
              {visibleCycle === 'current'
                ? `${summary.currentEntriesCount} lançamentos cadastrados`
                : `${summary.nextEntriesCount} lançamentos previstos`}
            </span>
            {visibleCycle === 'current' && summary.currentPrepaidTotal > 0 && (
              <span className="flex items-center gap-1.5 text-primary-400">
                <HandCoins size={13} />
                {formatCurrency(summary.currentPrepaidTotal)} pagos antecipadamente, fora do total
              </span>
            )}
          </div>
        </Panel>
      ) : (
        <Panel>
          <PanelHeader
            title="Colar planilha do cartão"
            icon={<Upload size={16} />}
            description='Cole linhas do Sheets com colunas parecidas: Descrição, Data, Cartão, Fatura, É meu, Restante, Área, Assinatura e Pago. Parcelas como "3/10" no nome são detectadas automaticamente.'
            actions={
              <span className="rounded-lg border border-dark-border bg-dark-surface px-3 py-1.5 text-xs font-medium text-dark-text-secondary">
                {parsedImport.length} linhas detectadas
              </span>
            }
          />

          <textarea
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            aria-label="Conteúdo da planilha"
            placeholder={
              'Descrição\tData\tCartão\tFatura\tÉ meu\tRestante\tÁrea\nYoutube premium\t20/06\tItaú\t53,90\t53,90\t0\tdesejo'
            }
            className="mt-4 min-h-[200px] w-full rounded-lg border border-dark-border bg-dark-input px-4 py-3 font-mono text-xs text-dark-text outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/25"
          />

          <div className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-dark-border bg-dark-surface p-3">
            <label className="block min-w-[150px] flex-1">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-dark-text-muted">
                Destino
              </span>
              <select
                value={importCycle}
                onChange={(event) => setImportCycle(event.target.value as CreditCardCycle)}
                className={inputClass}
              >
                <option value="current">Fatura atual</option>
                <option value="next">Próxima fatura</option>
              </select>
            </label>
            <label className="flex h-[46px] min-w-[200px] flex-1 cursor-pointer items-center gap-2 rounded-lg border border-dark-border bg-dark-input px-3 text-sm text-dark-text-secondary transition-colors hover:text-dark-text">
              <input
                type="checkbox"
                checked={replaceOnImport}
                onChange={(event) => setReplaceOnImport(event.target.checked)}
                className="h-4 w-4 rounded accent-primary-600"
              />
              Substituir fatura de destino
            </label>
            <button
              type="button"
              onClick={handleImport}
              disabled={!parsedImport.length}
              className="inline-flex h-[46px] items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-6 text-sm font-semibold text-white transition-all hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FileText size={16} />
              Importar dados
            </button>
          </div>
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel>
          <PanelHeader title="Totais por cartão" icon={<CreditCard size={15} />} />
          {summary.totalsByCard.length > 0 ? (
            <div className="mt-3 space-y-1.5">
              {summary.totalsByCard.map((card) => (
                <div
                  key={card.cardName}
                  className="flex items-center justify-between gap-3 rounded-lg bg-dark-surface px-3 py-2 text-sm"
                >
                  <span className="font-medium text-dark-text-secondary">{card.cardName}</span>
                  <span className="text-right">
                    <strong className="block tabular-nums text-dark-text">
                      {formatCurrency(card.totalAmount)}
                    </strong>
                    <span className="text-[11px] tabular-nums text-dark-text-muted">
                      meu: {formatCurrency(card.personalAmount)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-dark-text-muted">Sem cartões na fatura atual.</p>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Por área do orçamento" />
          <div className="mt-3 space-y-1.5">
            {BUDGET_AREAS.map((area) => (
              <div
                key={area}
                className="flex items-center justify-between gap-3 rounded-lg bg-dark-surface px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2 font-medium text-dark-text-secondary">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: BUDGET_AREA_COLORS[area] }}
                  />
                  {BUDGET_AREA_SHORT_LABELS[area]}
                </span>
                <strong className="tabular-nums text-dark-text">
                  {formatCurrency(summary.personalByArea[area])}
                </strong>
              </div>
            ))}
            {summary.unclassifiedPersonal > 0 && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.07] px-3 py-2 text-sm">
                <span className="font-medium text-amber-300">Sem área definida</span>
                <strong className="tabular-nums text-amber-300">
                  {formatCurrency(summary.unclassifiedPersonal)}
                </strong>
              </div>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Resumo do futuro" />
          <dl className="mt-3 space-y-1.5 text-sm">
            {[
              { label: 'Próxima fatura', value: summary.nextTotal },
              { label: 'Meu próximo', value: summary.nextPersonalTotal },
              { label: 'Parcelas restantes', value: summary.remainingInstallmentsTotal },
              { label: 'Minhas parcelas restantes', value: summary.remainingPersonalInstallmentsTotal },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-3 rounded-lg bg-dark-surface px-3 py-2"
              >
                <dt className="font-medium text-dark-text-secondary">{row.label}</dt>
                <dd className="font-semibold tabular-nums text-dark-text">
                  {formatCurrency(row.value)}
                </dd>
              </div>
            ))}
          </dl>
        </Panel>
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
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-primary-500"
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
    </div>
  )
}
