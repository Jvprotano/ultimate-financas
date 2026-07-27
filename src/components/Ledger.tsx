import { useState } from 'react'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { CurrencyInput } from './CurrencyInput'
import { formatCurrency, formatDate } from '../lib/format'
import type { LedgerEntry } from '../types'

// Reserva, posições e metas compartilham o mesmo livro-razão: um formulário de
// entrada/saída e uma lista de movimentações.

export function LedgerMoveForm({
  onMove,
  outLabel = 'Retirar',
  inLabel = 'Aportar',
  disableOut = false,
  notePlaceholder = 'Nota (opcional)',
}: {
  onMove: (amount: number, note?: string) => void
  outLabel?: string
  inLabel?: string
  disableOut?: boolean
  notePlaceholder?: string
}) {
  const [amount, setAmount] = useState(0)
  const [note, setNote] = useState('')

  const commit = (sign: 1 | -1) => {
    if (amount <= 0) return
    onMove(sign * amount, note)
    setAmount(0)
    setNote('')
  }

  return (
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
          <CurrencyInput value={amount} onChange={setAmount} className="!py-2" />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={amount <= 0}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary-500/15 px-3 py-2 text-sm font-semibold text-primary-300 transition-colors hover:bg-primary-500/25 disabled:opacity-40 sm:flex-none"
          >
            <Plus size={14} />
            {inLabel}
          </button>
          <button
            type="button"
            onClick={() => commit(-1)}
            disabled={amount <= 0 || disableOut}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-500/20 disabled:opacity-40 sm:flex-none"
          >
            <Minus size={14} />
            {outLabel}
          </button>
        </div>
      </div>
      <input
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder={notePlaceholder}
        className="w-full rounded-lg border border-dark-border bg-dark-input px-3 py-1.5 text-sm text-dark-text outline-none transition-colors placeholder:text-dark-text-muted focus:border-primary-500 focus:ring-2 focus:ring-primary-500/25"
      />
    </form>
  )
}

export function LedgerList({
  transactions,
  onRemove,
  inLabel = 'Aporte',
  outLabel = 'Retirada',
}: {
  transactions: LedgerEntry[]
  onRemove: (id: string) => void
  inLabel?: string
  outLabel?: string
}) {
  if (transactions.length === 0) return null
  const history = [...transactions].reverse()

  return (
    <div>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-dark-text-muted">
        Movimentações
      </span>
      <ul className="max-h-44 space-y-1 overflow-y-auto pr-1">
        {history.map((tx) => {
          const isDeposit = tx.amount >= 0
          return (
            <li
              key={tx.id}
              className="group flex items-center gap-2.5 rounded-md bg-dark-input/50 px-2.5 py-1.5"
            >
              <span className={isDeposit ? 'text-primary-400' : 'text-rose-400'}>
                {isDeposit ? <Plus size={13} /> : <Minus size={13} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-dark-text">
                  {tx.note || (isDeposit ? inLabel : outLabel)}
                </p>
                <p className="text-[10px] text-dark-text-muted">{formatDate(tx.date)}</p>
              </div>
              <span
                className={`shrink-0 text-xs font-semibold tabular-nums ${
                  isDeposit ? 'text-primary-400' : 'text-rose-400'
                }`}
              >
                {isDeposit ? '+' : '−'} {formatCurrency(Math.abs(tx.amount))}
              </span>
              <button
                type="button"
                onClick={() => onRemove(tx.id)}
                className="text-dark-text-muted opacity-0 transition-all hover:text-rose-400 focus-visible:opacity-100 group-hover:opacity-100"
                title="Remover movimentação"
              >
                <Trash2 size={13} />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
