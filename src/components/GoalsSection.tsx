import { useState } from 'react'
import { CheckCircle2, ChevronDown, Flag, Plus, Trash2 } from 'lucide-react'
import { CurrencyInput } from './CurrencyInput'
import { LedgerList, LedgerMoveForm } from './Ledger'
import { EmptyState, Meter, Panel, PanelHeader, PrimaryButton, SecondaryButton, Tag } from './ui'
import { formatCurrency, formatMonthKey, formatMonths, inputClass } from '../lib/format'
import { monthKey } from '../lib/shared'
import { useInvestmentsStore } from '../context/financasStore'
import type { GoalSummary } from '../types'

function GoalRow({ goal }: { goal: GoalSummary }) {
  const { addGoalTransaction, removeGoalTransaction, removeGoal, updateGoal } =
    useInvestmentsStore()
  const [expanded, setExpanded] = useState(false)

  const lateBy = goal.monthsLeft !== null && goal.monthsLeft < 0 ? -goal.monthsLeft : 0

  return (
    <div className="rounded-lg border border-dark-border/60 bg-dark-surface/40">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
      >
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: goal.color }}
        />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-medium text-dark-text">
            {goal.name}
            {goal.isComplete && (
              <CheckCircle2 size={13} className="shrink-0 text-primary-400" aria-label="Concluída" />
            )}
          </p>
          <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-dark-text-muted">
            {goal.targetAmount > 0 && <>{goal.progress.toFixed(0)}% de {formatCurrency(goal.targetAmount)}</>}
            {goal.targetMonth && <Tag>{formatMonthKey(goal.targetMonth)}</Tag>}
            {lateBy > 0 && !goal.isComplete && (
              <span className="text-rose-400">{formatMonths(lateBy)} atrasada</span>
            )}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums text-dark-text">
            {formatCurrency(goal.current)}
          </p>
          {!goal.isComplete && goal.suggestedMonthly > 0 && (
            <p className="text-[11px] tabular-nums text-dark-text-muted">
              {formatCurrency(goal.suggestedMonthly)}/mês
            </p>
          )}
        </div>
        <ChevronDown
          size={15}
          className={`shrink-0 text-dark-text-muted transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {goal.targetAmount > 0 && (
        <div className="px-3 pb-2.5">
          <Meter value={goal.current} max={goal.targetAmount} color={goal.color} overIsBad={false} />
        </div>
      )}

      {expanded && (
        <div className="space-y-3 border-t border-dark-border/60 px-3 py-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-[11px] text-dark-text-muted">Nome</span>
              <input
                value={goal.name}
                onChange={(event) => updateGoal(goal.id, { name: event.target.value })}
                className={`${inputClass} !py-1.5`}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] text-dark-text-muted">Valor-alvo</span>
              <CurrencyInput
                value={goal.targetAmount}
                onChange={(value) => updateGoal(goal.id, { targetAmount: value })}
                className="!py-1.5"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] text-dark-text-muted">Mês-alvo</span>
              <input
                type="month"
                value={goal.targetMonth ?? ''}
                onChange={(event) =>
                  updateGoal(goal.id, { targetMonth: event.target.value || undefined })
                }
                className={`${inputClass} !py-1.5`}
              />
            </label>
          </div>

          {!goal.isComplete && goal.remaining > 0 && (
            <p className="text-xs text-dark-text-secondary">
              Faltam <strong className="text-dark-text">{formatCurrency(goal.remaining)}</strong>
              {goal.monthsLeft !== null && goal.monthsLeft >= 0 && (
                <>
                  {' '}
                  — <strong className="text-dark-text">
                    {formatCurrency(goal.suggestedMonthly)}
                  </strong>{' '}
                  por mês para chegar em {formatMonthKey(goal.targetMonth!)}.
                </>
              )}
            </p>
          )}

          <LedgerMoveForm
            onMove={(amount, note) => addGoalTransaction(goal.id, amount, note)}
            inLabel="Guardar"
            outLabel="Resgatar"
            disableOut={goal.current <= 0}
            notePlaceholder="Nota (opcional) — ex.: aporte do mês, resgate para a passagem"
          />

          <LedgerList
            transactions={goal.transactions}
            onRemove={(id) => removeGoalTransaction(goal.id, id)}
            inLabel="Guardado"
            outLabel="Resgatado"
          />

          <button
            type="button"
            onClick={() => removeGoal(goal.id)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-dark-text-muted transition-colors hover:text-rose-400"
          >
            <Trash2 size={13} />
            Excluir meta
          </button>
        </div>
      )}
    </div>
  )
}

export function GoalsSection() {
  const { goals, addGoal } = useInvestmentsStore()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState(0)
  const [targetMonth, setTargetMonth] = useState('')
  const [initialAmount, setInitialAmount] = useState(0)

  const handleAdd = () => {
    if (!name.trim()) return
    addGoal({ name, targetAmount, targetMonth: targetMonth || undefined, initialAmount })
    setName('')
    setTargetAmount(0)
    setTargetMonth('')
    setInitialAmount(0)
    setOpen(false)
  }

  const totalSaved = goals.reduce((sum, goal) => sum + goal.current, 0)

  return (
    <Panel>
      <PanelHeader
        title="Metas"
        icon={<Flag size={16} />}
        description="Objetivos com nome e prazo — o dinheiro guardado aqui entra no seu patrimônio."
        actions={
          <>
            {totalSaved > 0 && (
              <span className="text-sm font-semibold tabular-nums text-dark-text">
                {formatCurrency(totalSaved)}
              </span>
            )}
            <SecondaryButton onClick={() => setOpen((prev) => !prev)}>
              <Plus size={14} />
              Nova meta
            </SecondaryButton>
          </>
        }
      />

      {open && (
        <div className="mt-4 space-y-3 rounded-lg border border-dark-border bg-dark-surface/60 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[11px] text-dark-text-muted">Nome</span>
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleAdd()}
                placeholder="ex.: Viagem Japão, trocar de carro"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] text-dark-text-muted">Valor-alvo</span>
              <CurrencyInput value={targetAmount} onChange={setTargetAmount} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] text-dark-text-muted">
                Mês-alvo (opcional)
              </span>
              <input
                type="month"
                min={monthKey()}
                value={targetMonth}
                onChange={(event) => setTargetMonth(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] text-dark-text-muted">
                Já guardado (opcional)
              </span>
              <CurrencyInput value={initialAmount} onChange={setInitialAmount} />
            </label>
          </div>
          <div className="flex gap-2">
            <PrimaryButton onClick={handleAdd} disabled={!name.trim()}>
              <Plus size={15} />
              Criar meta
            </PrimaryButton>
            <SecondaryButton onClick={() => setOpen(false)}>Cancelar</SecondaryButton>
          </div>
        </div>
      )}

      <div className="mt-4">
        {goals.length === 0 ? (
          <EmptyState icon={<Flag size={24} />} title="Nenhuma meta ainda">
            Reserva de emergência é uma meta de segurança. Aqui ficam as outras: viagem, carro,
            entrada de um imóvel — cada uma com valor, prazo e quanto aportar por mês.
          </EmptyState>
        ) : (
          <div className="space-y-2">
            {goals.map((goal) => (
              <GoalRow key={goal.id} goal={goal} />
            ))}
          </div>
        )}
      </div>
    </Panel>
  )
}
