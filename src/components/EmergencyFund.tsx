import { useState } from 'react'
import { Minus, Plus, Shield, Trash2 } from 'lucide-react'
import { Card } from './Card'
import { CurrencyInput } from './CurrencyInput'
import { HeaderMetric } from './HeaderMetric'
import { Meter } from './ui'
import type { EmergencyFundState } from '../types'
import { formatCurrency, formatMonths } from '../utils'

interface Props {
  emergencyFund: EmergencyFundState
  addTransaction: (amount: number, note?: string) => void
  removeTransaction: (id: string) => void
  setTargetMonths: (months: number) => void
  totalCosts: number
  target: number
  remaining: number
  progress: number
  monthsToGoal: number
  fixedIncomeMonthlyAllocation: number
}

const MONTH_OPTIONS = [3, 6, 12]

function formatTransactionDate(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export function EmergencyFund({
  emergencyFund,
  addTransaction,
  removeTransaction,
  setTargetMonths,
  totalCosts,
  target,
  remaining,
  progress,
  monthsToGoal,
  fixedIncomeMonthlyAllocation,
}: Props) {
  const [amount, setAmount] = useState(0)
  const [note, setNote] = useState('')

  const commit = (sign: 1 | -1) => {
    if (amount <= 0) return
    addTransaction(sign * amount, note)
    setAmount(0)
    setNote('')
  }

  const history = [...emergencyFund.transactions].reverse()

  return (
    <Card
      title="Reserva de emergência"
      icon={<Shield size={17} />}
      collapsible
      storageKey="emergency"
      headerExtra={
        target > 0 ? <HeaderMetric amount={emergencyFund.current} baseAmount={target} label="Guardado" tone="slate" /> : undefined
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-dark-border bg-dark-surface/60 p-3">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-sm font-medium text-dark-text-secondary">Movimentar reserva</span>
            <span className="text-sm">
              Saldo:{' '}
              <strong className="tabular-nums text-dark-text">{formatCurrency(emergencyFund.current)}</strong>
            </span>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              commit(1)
            }}
            className="space-y-2"
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="sm:flex-1">
                <CurrencyInput value={amount} onChange={setAmount} />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={amount <= 0}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-500/20 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
                >
                  <Plus size={15} />
                  Adicionar
                </button>
                <button
                  type="button"
                  onClick={() => commit(-1)}
                  disabled={amount <= 0 || emergencyFund.current <= 0}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-rose-500/15 px-4 py-2.5 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
                >
                  <Minus size={15} />
                  Remover
                </button>
              </div>
            </div>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Nota (opcional) — ex.: aporte mensal, resgate para conserto do carro"
              className="w-full rounded-lg border border-dark-border bg-dark-input px-3 py-2 text-sm text-dark-text outline-none transition-colors placeholder:text-dark-text-muted focus:border-primary-500 focus:ring-2 focus:ring-primary-500/25"
            />
          </form>
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-dark-text-secondary">Meta em meses de custo</span>
          <div className="grid grid-cols-3 gap-1 rounded-lg border border-dark-border bg-dark-input p-1">
            {MONTH_OPTIONS.map((months) => (
              <button
                key={months}
                type="button"
                onClick={() => setTargetMonths(months)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  emergencyFund.targetMonths === months
                    ? 'bg-dark-surface text-dark-text shadow-sm'
                    : 'text-dark-text-muted hover:text-dark-text'
                }`}
              >
                {months}m
              </button>
            ))}
          </div>
        </div>

        {totalCosts > 0 ? (
          <>
            <div>
              <div className="mb-1.5 flex items-baseline justify-between text-xs">
                <span className="text-dark-text-muted">
                  Meta: {formatCurrency(target)} ({emergencyFund.targetMonths} meses de custos fixos)
                </span>
                <span className="font-semibold tabular-nums text-dark-text">{progress.toFixed(0)}%</span>
              </div>
              <Meter value={emergencyFund.current} max={target} color="#3987e5" height={8} />
            </div>

            <p className="text-sm leading-relaxed text-dark-text-secondary">
              {remaining <= 0 ? (
                <>Reserva completa. Aportes em renda fixa agora podem mirar outros objetivos.</>
              ) : fixedIncomeMonthlyAllocation > 0 ? (
                <>
                  Faltam <strong className="text-dark-text">{formatCurrency(remaining)}</strong>. No ritmo atual de{' '}
                  {formatCurrency(fixedIncomeMonthlyAllocation)}/mês em renda fixa, você completa em{' '}
                  <strong className="text-dark-text">{formatMonths(monthsToGoal)}</strong>.
                </>
              ) : (
                <>
                  Faltam <strong className="text-dark-text">{formatCurrency(remaining)}</strong>. Direcione parte do
                  aporte para renda fixa para estimar o prazo.
                </>
              )}
            </p>
          </>
        ) : (
          <p className="text-sm text-dark-text-muted">
            Cadastre os custos fixos para calcular a meta — a reserva ideal cobre alguns meses do seu custo de vida.
          </p>
        )}

        {history.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-dark-text-muted">
              Histórico de movimentações
            </h4>
            <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
              {history.map((tx) => {
                const isDeposit = tx.amount >= 0
                return (
                  <li
                    key={tx.id}
                    className="group flex items-center gap-3 rounded-lg border border-dark-border/60 bg-dark-surface/40 px-3 py-2"
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        isDeposit ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                      }`}
                    >
                      {isDeposit ? <Plus size={14} /> : <Minus size={14} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-dark-text">{tx.note || (isDeposit ? 'Aporte' : 'Retirada')}</p>
                      <p className="text-[11px] text-dark-text-muted">{formatTransactionDate(tx.date)}</p>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-semibold tabular-nums ${
                        isDeposit ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isDeposit ? '+' : '−'} {formatCurrency(Math.abs(tx.amount))}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeTransaction(tx.id)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-dark-text-muted opacity-0 transition-all hover:bg-rose-500/20 hover:text-rose-400 group-hover:opacity-100"
                      title="Remover movimentação"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </Card>
  )
}
