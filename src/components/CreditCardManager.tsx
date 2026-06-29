import { useMemo, useState } from 'react'
import { Calendar, CreditCard, FileText, Plus, RotateCcw, Trash2, Upload } from 'lucide-react'
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
  setSettings: (settings: CreditCardSettings) => void
}

type View = CreditCardCycle | 'import'
type OwnerMode = 'mine' | 'other' | 'partial'
type ParsedCardEntry = Omit<CreditCardEntry, 'id' | 'cycle'>

const KNOWN_CARDS = ['Itau', 'XP', 'Inter', 'Nu']

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

function nextDescription(description: string, current: number, total: number) {
  const next = `${current + 1}/${total}`
  if (/\b\d{1,2}\s*\/\s*\d{1,2}\b/.test(description)) {
    return description.replace(/\b\d{1,2}\s*\/\s*\d{1,2}\b/, next)
  }
  return `${description} ${next}`
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

      if (!amount && !personalAmount) return null

      return {
        description,
        purchaseDate: (cells[indexes.date >= 0 ? indexes.date : 1] ?? '').trim(),
        cardName: (cells[indexes.card >= 0 ? indexes.card : 2] ?? 'Cartao').trim() || 'Cartao',
        amount,
        personalAmount,
        remainingAmount,
        ownerNote: cells.slice(6).join(' ').trim(),
        installmentCurrent,
        installmentTotal,
      }
    })

  return parsedRows.filter((entry): entry is ParsedCardEntry => entry !== null)
}

function cycleLabel(cycle: CreditCardCycle) {
  return cycle === 'current' ? 'Fatura atual' : 'Proxima fatura'
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
  setSettings,
}: Props) {
  const [view, setView] = useState<View>('current')
  const [description, setDescription] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [cardName, setCardName] = useState('Itau')
  const [amount, setAmount] = useState(0)
  const [ownerMode, setOwnerMode] = useState<OwnerMode>('mine')
  const [personalAmount, setPersonalAmount] = useState(0)
  const [remainingAmount, setRemainingAmount] = useState(0)
  const [ownerNote, setOwnerNote] = useState('')
  const [importText, setImportText] = useState('')
  const [importCycle, setImportCycle] = useState<CreditCardCycle>('current')
  const [replaceOnImport, setReplaceOnImport] = useState(true)

  const currentEntries = entries.filter((entry) => entry.cycle === 'current')
  const visibleCycle: CreditCardCycle = view === 'next' ? 'next' : 'current'
  const visibleEntries = entries.filter((entry) => entry.cycle === visibleCycle)
  const parsedImport = useMemo(() => parseSpreadsheet(importText), [importText])
  const generatedNextEntries = useMemo(
    () =>
      currentEntries
        .filter(
          (entry) =>
            entry.installmentCurrent &&
            entry.installmentTotal &&
            entry.installmentCurrent < entry.installmentTotal,
        )
        .map((entry) => {
          const nextCurrent = (entry.installmentCurrent ?? 0) + 1
          const total = entry.installmentTotal ?? nextCurrent

          return {
            description: nextDescription(entry.description, entry.installmentCurrent ?? 0, total),
            purchaseDate: entry.purchaseDate,
            cardName: entry.cardName,
            amount: entry.amount,
            personalAmount: entry.personalAmount,
            remainingAmount: buildRemainingAmount(entry.amount, nextCurrent, total),
            ownerNote: entry.ownerNote || 'Gerado pela fatura atual',
            installmentCurrent: nextCurrent,
            installmentTotal: total,
          }
        }),
    [currentEntries],
  )

  const knownCards = Array.from(new Set([...KNOWN_CARDS, ...entries.map((entry) => entry.cardName).filter(Boolean)]))
  const availableLimitTone = summary.availablePersonalLimit >= 0 ? 'text-emerald-300' : 'text-rose-300'
  const personalSpendPct =
    settings.personalSpendingLimit > 0
      ? Math.min(999, (summary.currentPersonalTotal / settings.personalSpendingLimit) * 100)
      : 0

  const resetForm = () => {
    setDescription('')
    setPurchaseDate('')
    setAmount(0)
    setPersonalAmount(0)
    setRemainingAmount(0)
    setOwnerNote('')
    setOwnerMode('mine')
  }

  const handleAdd = () => {
    if (!description.trim() || amount === 0) return
    const installmentInfo = parseInstallments(description)
    const computedPersonalAmount =
      ownerMode === 'mine' ? amount : ownerMode === 'other' ? 0 : personalAmount
    const computedRemainingAmount =
      remainingAmount || buildRemainingAmount(amount, installmentInfo.installmentCurrent, installmentInfo.installmentTotal)

    addEntry({
      cycle: visibleCycle,
      description: description.trim(),
      purchaseDate,
      cardName: cardName.trim() || 'Cartao',
      amount,
      personalAmount: computedPersonalAmount,
      remainingAmount: computedRemainingAmount,
      ownerNote: ownerMode === 'other' && !ownerNote ? 'Nao e meu' : ownerNote,
      ...installmentInfo,
    })
    resetForm()
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

  const handleGenerateNext = () => {
    if (!generatedNextEntries.length) return
    replaceEntries('next', generatedNextEntries)
    setView('next')
  }

  return (
    <Card
      title="Cartoes e Faturas"
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
          <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-3">
            <span className="block text-xs text-sky-300">Total dos cartoes</span>
            <strong className="text-sm text-sky-100">{formatCurrency(summary.currentTotal)}</strong>
          </div>
          <div className="rounded-lg border border-primary-500/20 bg-primary-500/10 px-3 py-3">
            <span className="block text-xs text-primary-300">Meu total</span>
            <strong className="text-sm text-primary-100">{formatCurrency(summary.currentPersonalTotal)}</strong>
          </div>
          <div className="rounded-lg border border-dark-border bg-dark-surface px-3 py-3">
            <span className="block text-xs text-dark-text-muted">Limite esperado</span>
            <strong className="text-sm text-dark-text">{formatCurrency(settings.personalSpendingLimit)}</strong>
          </div>
          <div
            className={`rounded-lg border px-3 py-3 ${
              summary.availablePersonalLimit >= 0
                ? 'border-emerald-500/20 bg-emerald-500/10'
                : 'border-rose-500/20 bg-rose-500/10'
            }`}
          >
            <span className={`block text-xs ${availableLimitTone}`}>
              {summary.availablePersonalLimit >= 0 ? 'Ainda disponivel' : 'Acima do limite'}
            </span>
            <strong className={`text-sm ${availableLimitTone}`}>
              {formatCurrency(Math.abs(summary.availablePersonalLimit))}
            </strong>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr]">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-dark-text-muted">
              <Calendar size={12} />
              Data de pagamento
            </span>
            <input
              value={settings.paymentDate}
              onChange={(event) => setSettings({ ...settings, paymentDate: event.target.value })}
              className="w-full rounded-lg border border-dark-border bg-dark-input px-3 py-2.5 text-sm text-dark-text outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
              placeholder="05/07"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-dark-text-muted">Limite pessoal esperado</span>
            <CurrencyInput
              value={settings.personalSpendingLimit}
              onChange={(value) => setSettings({ ...settings, personalSpendingLimit: value })}
            />
          </label>
          <div className="rounded-lg border border-dark-border bg-dark-surface px-3 py-2.5">
            <span className="block text-xs text-dark-text-muted">Uso do limite pessoal</span>
            <strong className={availableLimitTone}>{personalSpendPct.toFixed(0)}%</strong>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className={`h-full rounded-full ${summary.availablePersonalLimit >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                style={{ width: `${Math.min(100, personalSpendPct)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 rounded-lg border border-dark-border bg-dark-surface p-1">
          {[
            { key: 'current' as View, label: 'Atual' },
            { key: 'next' as View, label: 'Proxima' },
            { key: 'import' as View, label: 'Importar' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setView(item.key)}
              className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                view === item.key ? 'bg-sky-600 text-white' : 'text-dark-text-muted hover:text-dark-text'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {view !== 'import' ? (
          <>
            <div className="rounded-lg border border-dark-border bg-dark-surface p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-dark-text">{cycleLabel(visibleCycle)}</h3>
                  <p className="text-xs text-dark-text-muted">
                    {visibleCycle === 'current'
                      ? `${summary.currentEntriesCount} lancamentos cadastrados`
                      : `${summary.nextEntriesCount} lancamentos previstos`}
                  </p>
                </div>
                {visibleCycle === 'next' && (
                  <button
                    type="button"
                    onClick={handleGenerateNext}
                    disabled={!generatedNextEntries.length}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-dark-border bg-dark-input px-3 py-2 text-xs font-semibold text-dark-text-secondary transition-colors hover:border-sky-500/40 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <RotateCcw size={13} />
                    Gerar pelas parcelas
                  </button>
                )}
              </div>

              <div className="grid gap-2 xl:grid-cols-[1.4fr_92px_120px_130px_130px_130px] xl:items-end">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-dark-text-muted">Compra</span>
                  <input
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Ex: Amazon mesa 8/12"
                    className="w-full rounded-lg border border-dark-border bg-dark-input px-3 py-2.5 text-sm text-dark-text outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-dark-text-muted">Data</span>
                  <input
                    value={purchaseDate}
                    onChange={(event) => setPurchaseDate(event.target.value)}
                    placeholder="20/06"
                    className="w-full rounded-lg border border-dark-border bg-dark-input px-3 py-2.5 text-sm text-dark-text outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-dark-text-muted">Cartao</span>
                  <input
                    list="credit-card-names"
                    value={cardName}
                    onChange={(event) => setCardName(event.target.value)}
                    className="w-full rounded-lg border border-dark-border bg-dark-input px-3 py-2.5 text-sm text-dark-text outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  />
                  <datalist id="credit-card-names">
                    {knownCards.map((card) => (
                      <option key={card} value={card} />
                    ))}
                  </datalist>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-dark-text-muted">Fatura</span>
                  <CurrencyInput value={amount} onChange={setAmount} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-dark-text-muted">Restante</span>
                  <CurrencyInput value={remainingAmount} onChange={setRemainingAmount} />
                </label>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!description.trim() || amount === 0}
                  className="inline-flex h-[42px] items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus size={15} />
                  Adicionar
                </button>
              </div>

              <div className="mt-3 grid gap-2 lg:grid-cols-[auto_1fr] lg:items-center">
                <div className="grid grid-cols-3 rounded-lg border border-dark-border bg-dark-input p-1">
                  {[
                    { key: 'mine' as OwnerMode, label: 'Meu' },
                    { key: 'other' as OwnerMode, label: 'Outro' },
                    { key: 'partial' as OwnerMode, label: 'Parcial' },
                  ].map((mode) => (
                    <button
                      key={mode.key}
                      type="button"
                      onClick={() => setOwnerMode(mode.key)}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                        ownerMode === mode.key ? 'bg-sky-600 text-white' : 'text-dark-text-muted hover:text-dark-text'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ownerMode === 'partial' ? (
                    <CurrencyInput value={personalAmount} onChange={setPersonalAmount} />
                  ) : (
                    <div className="rounded-lg border border-dark-border bg-dark-input px-3 py-2 text-sm text-dark-text-muted">
                      {ownerMode === 'mine' ? 'Valor meu sera igual a fatura.' : 'Valor meu sera R$ 0,00.'}
                    </div>
                  )}
                  <input
                    value={ownerNote}
                    onChange={(event) => setOwnerNote(event.target.value)}
                    placeholder="Observacao: Mae, antec, reembolso..."
                    className="w-full rounded-lg border border-dark-border bg-dark-input px-3 py-2.5 text-sm text-dark-text outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {visibleEntries.length === 0 ? (
                <div className="rounded-lg border border-dashed border-dark-border px-4 py-5 text-center text-sm text-dark-text-muted">
                  Nenhum lancamento nesta fatura.
                </div>
              ) : (
                visibleEntries.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-dark-border bg-dark-surface p-3">
                    <div className="grid gap-2 xl:grid-cols-[1.4fr_82px_110px_120px_120px_120px_auto] xl:items-center">
                      <input
                        value={entry.description}
                        onChange={(event) => updateEntry(entry.id, { description: event.target.value })}
                        className="min-w-0 rounded-lg border border-dark-border bg-dark-input px-3 py-2 text-sm font-semibold text-dark-text outline-none focus:border-sky-500"
                      />
                      <input
                        value={entry.purchaseDate}
                        onChange={(event) => updateEntry(entry.id, { purchaseDate: event.target.value })}
                        className="rounded-lg border border-dark-border bg-dark-input px-3 py-2 text-sm text-dark-text outline-none focus:border-sky-500"
                      />
                      <input
                        value={entry.cardName}
                        onChange={(event) => updateEntry(entry.id, { cardName: event.target.value })}
                        className="rounded-lg border border-dark-border bg-dark-input px-3 py-2 text-sm text-dark-text outline-none focus:border-sky-500"
                      />
                      <CurrencyInput value={formatNumberInputValue(entry.amount)} onChange={(value) => updateEntry(entry.id, { amount: value })} />
                      <CurrencyInput
                        value={formatNumberInputValue(entry.personalAmount)}
                        onChange={(value) => updateEntry(entry.id, { personalAmount: value })}
                      />
                      <CurrencyInput
                        value={formatNumberInputValue(entry.remainingAmount)}
                        onChange={(value) => updateEntry(entry.id, { remainingAmount: value })}
                      />
                      <button
                        type="button"
                        onClick={() => removeEntry(entry.id)}
                        className="inline-flex h-10 items-center justify-center rounded-lg text-dark-text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                        aria-label={`Remover ${entry.description}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-dark-text-muted">
                      <span>{cycleLabel(entry.cycle)}</span>
                      {entry.installmentCurrent && entry.installmentTotal && (
                        <span>
                          Parcela {entry.installmentCurrent}/{entry.installmentTotal}
                        </span>
                      )}
                      {entry.ownerNote && <span>{entry.ownerNote}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-dark-border bg-dark-surface p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-dark-text">
                  <Upload size={15} className="text-sky-300" />
                  Colar planilha do cartao
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-dark-text-muted">
                  Cole linhas do Sheets com colunas como Descricao, Data, Cartao, Fatura, E meu e Restante.
                </p>
              </div>
              <span className="rounded-lg border border-sky-500/20 bg-sky-500/10 px-2.5 py-1.5 text-xs font-semibold text-sky-300">
                {parsedImport.length} linhas detectadas
              </span>
            </div>

            <textarea
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder={'Descricao\tData\tCartao\tFatura\tE meu\tRestante\nYoutube premium\t20/06\tItau\t53,90\t53,90\t0'}
              className="mt-3 min-h-44 w-full rounded-lg border border-dark-border bg-dark-input px-3 py-2.5 font-mono text-xs text-dark-text outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
            />

            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-dark-text-muted">Destino</span>
                <select
                  value={importCycle}
                  onChange={(event) => setImportCycle(event.target.value as CreditCardCycle)}
                  className="w-full rounded-lg border border-dark-border bg-dark-input px-3 py-2.5 text-sm text-dark-text outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                >
                  <option value="current">Fatura atual</option>
                  <option value="next">Proxima fatura</option>
                </select>
              </label>
              <label className="flex h-[42px] items-center gap-2 rounded-lg border border-dark-border bg-dark-input px-3 text-sm text-dark-text-secondary">
                <input
                  type="checkbox"
                  checked={replaceOnImport}
                  onChange={(event) => setReplaceOnImport(event.target.checked)}
                  className="h-4 w-4 accent-sky-600"
                />
                Substituir fatura de destino
              </label>
              <button
                type="button"
                onClick={handleImport}
                disabled={!parsedImport.length}
                className="inline-flex h-[42px] items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FileText size={15} />
                Importar
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
          <div className="rounded-lg border border-dark-border bg-dark-surface p-3">
            <h3 className="mb-2 text-sm font-bold text-dark-text">Totais por cartao</h3>
            {summary.totalsByCard.length > 0 ? (
              <div className="space-y-2">
                {summary.totalsByCard.map((card) => (
                  <div key={card.cardName} className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-dark-text-secondary">{card.cardName}</span>
                    <span className="text-right">
                      <strong className="block text-dark-text">{formatCurrency(card.totalAmount)}</strong>
                      <span className="text-xs text-dark-text-muted">meu {formatCurrency(card.personalAmount)}</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-dark-text-muted">Sem cartoes na fatura atual.</p>
            )}
          </div>

          <div className="rounded-lg border border-dark-border bg-dark-surface p-3">
            <h3 className="mb-2 text-sm font-bold text-dark-text">Futuro</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-dark-text-muted">Proxima fatura</dt>
                <dd className="font-semibold text-dark-text">{formatCurrency(summary.nextTotal)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-dark-text-muted">Meu proximo</dt>
                <dd className="font-semibold text-primary-300">{formatCurrency(summary.nextPersonalTotal)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-dark-text-muted">Parcelas restantes</dt>
                <dd className="font-semibold text-amber-300">{formatCurrency(summary.remainingInstallmentsTotal)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </Card>
  )
}
