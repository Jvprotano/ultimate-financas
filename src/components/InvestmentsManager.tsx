import { useState } from 'react'
import {
  Building2,
  ChevronDown,
  Landmark,
  Minus,
  Plus,
  PlusCircle,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { Card } from './Card'
import { CurrencyInput } from './CurrencyInput'
import { HeaderMetric } from './HeaderMetric'
import { SegmentedBar } from './ui'
import type { HoldingSummary, InvestmentAssetClass, InvestmentsSummary } from '../types'
import { INVESTMENT_CLASS_PRESET_COLORS } from '../types/constants'
import { formatCurrency } from '../utils'

interface Props {
  summary: InvestmentsSummary
  classes: InvestmentAssetClass[]
  addHolding: (input: {
    name: string
    assetClassId: string
    institution?: string
    initialAmount?: number
    note?: string
  }) => void
  updateHolding: (
    id: string,
    patch: Partial<{ name: string; assetClassId: string; institution: string; marketValue: number }>,
  ) => void
  removeHolding: (id: string) => void
  addTransaction: (holdingId: string, amount: number, note?: string) => void
  removeTransaction: (holdingId: string, transactionId: string) => void
  setMarketValue: (holdingId: string, value: number) => void
  addClass: (name: string, color: string) => void
}

function formatGainPct(pct: number) {
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
}

function formatTransactionDate(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function GainLabel({ gain, pct, className = '' }: { gain: number; pct: number | null; className?: string }) {
  const positive = gain >= 0
  return (
    <span className={`tabular-nums ${positive ? 'text-emerald-400' : 'text-rose-400'} ${className}`}>
      {positive ? '+' : '−'} {formatCurrency(Math.abs(gain))}
      {pct !== null && ` (${formatGainPct(pct)})`}
    </span>
  )
}

function HoldingRow({
  holding,
  classes,
  updateHolding,
  removeHolding,
  addTransaction,
  removeTransaction,
  setMarketValue,
}: {
  holding: HoldingSummary
  classes: InvestmentAssetClass[]
  updateHolding: Props['updateHolding']
  removeHolding: Props['removeHolding']
  addTransaction: Props['addTransaction']
  removeTransaction: Props['removeTransaction']
  setMarketValue: Props['setMarketValue']
}) {
  const [expanded, setExpanded] = useState(false)
  const [moveAmount, setMoveAmount] = useState(0)
  const [moveNote, setMoveNote] = useState('')

  const commit = (sign: 1 | -1) => {
    if (moveAmount <= 0) return
    addTransaction(holding.id, sign * moveAmount, moveNote)
    setMoveAmount(0)
    setMoveNote('')
  }

  const history = [...holding.transactions].reverse()
  const positive = holding.gain >= 0

  return (
    <div className="rounded-lg border border-dark-border/60 bg-dark-surface/40">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
            positive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
          }`}
        >
          {positive ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-dark-text">{holding.name}</p>
          {holding.institution && (
            <p className="flex items-center gap-1 text-[11px] text-dark-text-muted">
              <Building2 size={10} />
              {holding.institution}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums text-dark-text">{formatCurrency(holding.marketValue)}</p>
          <p className="text-[11px]">
            <GainLabel gain={holding.gain} pct={holding.invested > 0 ? holding.gainPct : null} />
          </p>
        </div>
        <ChevronDown
          size={15}
          className={`shrink-0 text-dark-text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-dark-border/60 px-3 py-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md bg-dark-input/60 px-2.5 py-1.5">
              <span className="block text-dark-text-muted">Aportado</span>
              <strong className="tabular-nums text-dark-text">{formatCurrency(holding.invested)}</strong>
            </div>
            <div className="rounded-md bg-dark-input/60 px-2.5 py-1.5">
              <span className="block text-dark-text-muted">Rendimento</span>
              <strong>
                <GainLabel gain={holding.gain} pct={holding.invested > 0 ? holding.gainPct : null} />
              </strong>
            </div>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              commit(1)
            }}
            className="space-y-2"
          >
            <span className="block text-xs font-semibold uppercase tracking-wide text-dark-text-muted">
              Movimentar
            </span>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="sm:flex-1">
                <CurrencyInput value={moveAmount} onChange={setMoveAmount} className="!py-2" />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={moveAmount <= 0}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/30 disabled:opacity-40 sm:flex-none"
                >
                  <Plus size={14} />
                  Aportar
                </button>
                <button
                  type="button"
                  onClick={() => commit(-1)}
                  disabled={moveAmount <= 0 || holding.marketValue <= 0}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-rose-500/15 px-3 py-2 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-500/25 disabled:opacity-40 sm:flex-none"
                >
                  <Minus size={14} />
                  Resgatar
                </button>
              </div>
            </div>
            <input
              value={moveNote}
              onChange={(event) => setMoveNote(event.target.value)}
              placeholder="Nota (opcional)"
              className="w-full rounded-lg border border-dark-border bg-dark-input px-3 py-1.5 text-sm text-dark-text outline-none transition-colors placeholder:text-dark-text-muted focus:border-primary-500 focus:ring-2 focus:ring-primary-500/25"
            />
          </form>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dark-text-muted">
                Saldo atual (marcar a mercado)
              </span>
              <CurrencyInput
                value={holding.marketValue}
                onChange={(value) => setMarketValue(holding.id, value)}
                className="!py-2"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dark-text-muted">
                Classe
              </span>
              <select
                value={holding.assetClassId}
                onChange={(event) => updateHolding(holding.id, { assetClassId: event.target.value })}
                className="h-[42px] w-full rounded-lg border border-dark-border bg-dark-input px-3 text-sm text-dark-text outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/25"
              >
                {classes.map((assetClass) => (
                  <option key={assetClass.id} value={assetClass.id}>
                    {assetClass.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <input
            value={holding.name}
            onChange={(event) => updateHolding(holding.id, { name: event.target.value })}
            className="w-full rounded-lg border border-dark-border bg-dark-input px-3 py-1.5 text-sm text-dark-text outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/25"
            placeholder="Nome da posição"
          />
          <input
            value={holding.institution ?? ''}
            onChange={(event) => updateHolding(holding.id, { institution: event.target.value })}
            className="w-full rounded-lg border border-dark-border bg-dark-input px-3 py-1.5 text-sm text-dark-text outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/25"
            placeholder="Instituição (opcional) — ex.: Itaú, XP"
          />

          {history.length > 0 && (
            <div>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-dark-text-muted">
                Movimentações
              </span>
              <ul className="max-h-44 space-y-1 overflow-y-auto pr-1">
                {history.map((tx) => {
                  const isDeposit = tx.amount >= 0
                  return (
                    <li key={tx.id} className="group flex items-center gap-2.5 rounded-md bg-dark-input/50 px-2.5 py-1.5">
                      <span className={isDeposit ? 'text-emerald-400' : 'text-rose-400'}>
                        {isDeposit ? <Plus size={13} /> : <Minus size={13} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-dark-text">{tx.note || (isDeposit ? 'Aporte' : 'Resgate')}</p>
                        <p className="text-[10px] text-dark-text-muted">{formatTransactionDate(tx.date)}</p>
                      </div>
                      <span
                        className={`shrink-0 text-xs font-semibold tabular-nums ${
                          isDeposit ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isDeposit ? '+' : '−'} {formatCurrency(Math.abs(tx.amount))}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeTransaction(holding.id, tx.id)}
                        className="text-dark-text-muted opacity-0 transition-all hover:text-rose-400 group-hover:opacity-100"
                        title="Remover movimentação"
                      >
                        <Trash2 size={13} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={() => removeHolding(holding.id)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-dark-text-muted transition-colors hover:text-rose-400"
          >
            <Trash2 size={13} />
            Excluir posição
          </button>
        </div>
      )}
    </div>
  )
}

export function InvestmentsManager({
  summary,
  classes,
  addHolding,
  updateHolding,
  removeHolding,
  addTransaction,
  removeTransaction,
  setMarketValue,
  addClass,
}: Props) {
  const [name, setName] = useState('')
  const [institution, setInstitution] = useState('')
  const [assetClassId, setAssetClassId] = useState(classes[0]?.id ?? '')
  const [initialAmount, setInitialAmount] = useState(0)
  const [newClassName, setNewClassName] = useState('')
  const [showNewClass, setShowNewClass] = useState(false)

  const selectedClassId = classes.some((item) => item.id === assetClassId) ? assetClassId : classes[0]?.id ?? ''

  const handleAdd = () => {
    if (!name.trim() || !selectedClassId) return
    addHolding({
      name,
      assetClassId: selectedClassId,
      institution,
      initialAmount,
    })
    setName('')
    setInstitution('')
    setInitialAmount(0)
  }

  const handleAddClass = () => {
    const trimmed = newClassName.trim()
    if (!trimmed) return
    const color = INVESTMENT_CLASS_PRESET_COLORS[classes.length % INVESTMENT_CLASS_PRESET_COLORS.length]
    addClass(trimmed, color)
    setNewClassName('')
    setShowNewClass(false)
  }

  const totalPositive = summary.totalGain >= 0

  return (
    <Card
      title="Investimentos"
      icon={<Landmark size={18} />}
      collapsible
      storageKey="investments"
      headerExtra={<HeaderMetric amount={summary.totalMarketValue} baseAmount={0} label="Patrimônio" tone="primary" />}
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-primary-500/20 bg-primary-500/10 px-4 py-3">
            <span className="block text-xs font-semibold uppercase tracking-wide text-primary-300/80">Patrimônio</span>
            <strong className="mt-1 block text-lg tabular-nums text-primary-100">
              {formatCurrency(summary.totalMarketValue)}
            </strong>
          </div>
          <div className="rounded-xl border border-dark-border bg-dark-surface px-4 py-3">
            <span className="block text-xs font-semibold uppercase tracking-wide text-dark-text-muted">Aportado</span>
            <strong className="mt-1 block text-lg tabular-nums text-dark-text">
              {formatCurrency(summary.totalInvested)}
            </strong>
          </div>
          <div
            className={`rounded-xl border px-4 py-3 ${
              totalPositive ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-rose-500/20 bg-rose-500/10'
            }`}
          >
            <span
              className={`block text-xs font-semibold uppercase tracking-wide ${
                totalPositive ? 'text-emerald-300/80' : 'text-rose-300/80'
              }`}
            >
              Rendimento
            </span>
            <strong className="mt-1 block text-lg">
              <GainLabel
                gain={summary.totalGain}
                pct={summary.totalInvested > 0 ? summary.totalGainPct : null}
                className="text-lg font-bold"
              />
            </strong>
          </div>
        </div>

        {summary.totalMarketValue > 0 && (
          <div className="rounded-xl border border-dark-border bg-dark-card p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-dark-text-muted">Alocação por classe</h3>
            <SegmentedBar
              segments={summary.classes.map((assetClass) => ({
                id: assetClass.id,
                label: assetClass.name,
                value: assetClass.marketValue,
                color: assetClass.color,
              }))}
              total={summary.totalMarketValue}
              height={12}
            />
          </div>
        )}

        <div className="rounded-xl border border-dark-border bg-dark-card p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-dark-text">
            <PlusCircle size={16} className="text-primary-400" />
            Nova posição
          </h3>
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleAdd()}
                placeholder="Nome — ex.: CDB Itaú 110% CDI"
                className="w-full rounded-lg border border-dark-border bg-dark-input px-3 py-2.5 text-sm text-dark-text outline-none transition-colors placeholder:text-dark-text-muted focus:border-primary-500 focus:ring-2 focus:ring-primary-500/25"
              />
              <input
                value={institution}
                onChange={(event) => setInstitution(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleAdd()}
                placeholder="Instituição (opcional)"
                className="w-full rounded-lg border border-dark-border bg-dark-input px-3 py-2.5 text-sm text-dark-text outline-none transition-colors placeholder:text-dark-text-muted focus:border-primary-500 focus:ring-2 focus:ring-primary-500/25"
              />
            </div>

            <div>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-dark-text-muted">
                Classe de ativo
              </span>
              <div className="flex flex-wrap gap-1.5">
                {classes.map((assetClass) => (
                  <button
                    key={assetClass.id}
                    type="button"
                    onClick={() => setAssetClassId(assetClass.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                      selectedClassId === assetClass.id
                        ? 'border-primary-500 bg-primary-500/20 text-primary-200'
                        : 'border-transparent bg-dark-input text-dark-text-muted hover:text-dark-text hover:bg-white/10'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: assetClass.color }} />
                    {assetClass.name}
                  </button>
                ))}
                {showNewClass ? (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-primary-500/40 bg-dark-input px-2 py-1">
                    <input
                      autoFocus
                      value={newClassName}
                      onChange={(event) => setNewClassName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') handleAddClass()
                        if (event.key === 'Escape') setShowNewClass(false)
                      }}
                      placeholder="Nova classe"
                      className="w-28 bg-transparent text-xs text-dark-text outline-none placeholder:text-dark-text-muted"
                    />
                    <button
                      type="button"
                      onClick={handleAddClass}
                      className="text-primary-300 hover:text-primary-200"
                      title="Criar classe"
                    >
                      <Plus size={13} />
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowNewClass(true)}
                    className="inline-flex items-center gap-1 rounded-lg border border-dashed border-dark-border px-3 py-1.5 text-xs font-medium text-dark-text-muted transition-colors hover:border-primary-500/50 hover:text-primary-300"
                  >
                    <Plus size={12} />
                    Nova classe
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="block sm:flex-1">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-dark-text-muted">
                  Valor aplicado hoje
                </span>
                <CurrencyInput value={initialAmount} onChange={setInitialAmount} className="!py-2.5" />
              </label>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!name.trim() || !selectedClassId}
                className="inline-flex h-[42px] items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus size={16} />
                Adicionar posição
              </button>
            </div>
          </div>
        </div>

        {summary.classes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-dark-border bg-dark-card/40 px-4 py-10 text-center">
            <Landmark size={26} className="mx-auto mb-2 text-dark-text-muted/50" />
            <p className="text-sm text-dark-text-muted">
              Cadastre sua primeira posição para acompanhar seu patrimônio e a rentabilidade por classe de ativo.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {summary.classes.map((assetClass) => (
                <div key={assetClass.id} className="rounded-xl border border-dark-border bg-dark-card">
                  <div className="flex flex-wrap items-center gap-3 border-b border-dark-border/60 px-4 py-3">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: assetClass.color }} />
                    <h3 className="text-sm font-bold text-dark-text">{assetClass.name}</h3>
                    <span className="rounded-full bg-dark-input px-2 py-0.5 text-[11px] font-medium text-dark-text-muted">
                      {assetClass.allocationPct.toFixed(0)}% do patrimônio
                    </span>
                    <div className="ml-auto text-right">
                      <p className="text-sm font-semibold tabular-nums text-dark-text">
                        {formatCurrency(assetClass.marketValue)}
                      </p>
                      <p className="text-[11px]">
                        <GainLabel gain={assetClass.gain} pct={assetClass.invested > 0 ? assetClass.gainPct : null} />
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 p-3">
                    {assetClass.holdings.map((holding) => (
                      <HoldingRow
                        key={holding.id}
                        holding={holding}
                        classes={classes}
                        updateHolding={updateHolding}
                        removeHolding={removeHolding}
                        addTransaction={addTransaction}
                        removeTransaction={removeTransaction}
                        setMarketValue={setMarketValue}
                      />
                    ))}
                  </div>
                </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
