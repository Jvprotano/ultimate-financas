import { useState } from 'react'
import { CheckCircle2, ChevronDown, Flag, Layers, Plus, Trash2 } from 'lucide-react'
import { CurrencyInput } from './CurrencyInput'
import { LedgerList, LedgerMoveForm } from './Ledger'
import {
  EmptyState,
  Meter,
  Panel,
  PanelHeader,
  PrimaryButton,
  SecondaryButton,
  SegmentedControl,
  Tag,
} from './ui'
import { formatCurrency, formatMonthKey, formatMonths, inputClass } from '../lib/format'
import { INCLUSION_LABELS } from '../lib/goals'
import { monthKey } from '../lib/shared'
import { useInvestmentsStore } from '../context/financasStore'
import type { GoalInclusion, GoalSummary } from '../types'

type GoalKind = 'savings' | 'networth'

const NET_WORTH_INCLUSIONS: GoalInclusion[] = [
  { type: 'reserve' },
  { type: 'investments' },
  { type: 'goals' },
]

/** Chips do que a meta engloba: saldos que já existem em outro módulo. */
function InclusionPicker({
  selected,
  onToggle,
  classes,
  hasAssets,
  hasDebts,
}: {
  selected: GoalInclusion[]
  onToggle: (inclusion: GoalInclusion) => void
  classes: { id: string; name: string; color: string }[]
  hasAssets: boolean
  hasDebts: boolean
}) {
  const isOn = (inclusion: GoalInclusion) =>
    selected.some(
      (item) => item.type === inclusion.type && (item.id ?? '') === (inclusion.id ?? ''),
    )
  const allInvestments = isOn({ type: 'investments' })

  const options: { inclusion: GoalInclusion; label: string; color?: string; muted?: boolean }[] = [
    { inclusion: { type: 'reserve' }, label: INCLUSION_LABELS.reserve },
    { inclusion: { type: 'investments' }, label: INCLUSION_LABELS.investments },
    { inclusion: { type: 'goals' }, label: INCLUSION_LABELS.goals },
    ...classes.map((item) => ({
      inclusion: { type: 'class' as const, id: item.id },
      label: item.name,
      color: item.color,
      // "Investimentos" já cobre todas as classes.
      muted: allInvestments,
    })),
    // Bens e dívidas fecham o balanço — só aparecem quando existem, para uma
    // meta de poupança comum não carregar chips que não dizem nada.
    ...(hasAssets
      ? [{ inclusion: { type: 'assets' as const }, label: INCLUSION_LABELS.assets }]
      : []),
    ...(hasDebts
      ? [{ inclusion: { type: 'debts' as const }, label: INCLUSION_LABELS.debts }]
      : []),
  ]

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(({ inclusion, label, color, muted }) => {
        const on = isOn(inclusion) && !muted
        return (
          <button
            key={`${inclusion.type}:${inclusion.id ?? ''}`}
            type="button"
            disabled={muted}
            onClick={() => onToggle(inclusion)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
              on
                ? 'border-primary-500/60 bg-primary-500/10 text-primary-200'
                : 'border-dark-border bg-dark-input text-dark-text-muted hover:text-dark-text'
            }`}
          >
            {color && (
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
            )}
            {label}
          </button>
        )
      })}
    </div>
  )
}

function GoalRow({ goal }: { goal: GoalSummary }) {
  const {
    addGoalTransaction,
    removeGoalTransaction,
    removeGoal,
    updateGoal,
    toggleGoalInclusion,
    summary,
  } = useInvestmentsStore()
  const [expanded, setExpanded] = useState(false)

  const lateBy = goal.monthsLeft !== null && goal.monthsLeft < 0 ? -goal.monthsLeft : 0
  const tracksOthers = goal.includedLabels.length > 0

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
            {tracksOthers && (
              <Tag>
                <Layers size={10} />
                {goal.includedLabels.join(' + ')}
              </Tag>
            )}
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

          <div>
            <span className="mb-1.5 block text-[11px] text-dark-text-muted">
              Engloba saldos já cadastrados — contam para a meta sem virar dinheiro novo
            </span>
            <InclusionPicker
              selected={goal.includes ?? []}
              onToggle={(inclusion) => toggleGoalInclusion(goal.id, inclusion)}
              classes={summary.classes}
              hasAssets={summary.physicalAssets > 0}
              hasDebts={summary.liabilities > 0}
            />
          </div>

          {tracksOthers && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-dark-input/60 px-2.5 py-1.5">
                <span className="block text-dark-text-muted">Vem de outros módulos</span>
                <strong className="tabular-nums text-dark-text">
                  {formatCurrency(goal.includedBalance)}
                </strong>
              </div>
              <div className="rounded-md bg-dark-input/60 px-2.5 py-1.5">
                <span className="block text-dark-text-muted">Guardado nesta meta</span>
                <strong className="tabular-nums text-dark-text">
                  {formatCurrency(goal.ownBalance)}
                </strong>
              </div>
            </div>
          )}

          {!goal.isComplete && goal.remaining > 0 && (
            <p className="text-xs leading-relaxed text-dark-text-secondary">
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

          {tracksOthers ? (
            <p className="rounded-lg bg-dark-input/50 px-3 py-2 text-[11px] leading-relaxed text-dark-text-muted">
              Esta meta mede saldos que já existem. Aportar aqui embaixo só faz sentido se for
              dinheiro guardado <em>fora</em> da reserva e dos investimentos — o que você aportar
              soma ao seu patrimônio.
            </p>
          ) : null}

          <LedgerMoveForm
            onMove={(amount, note) => addGoalTransaction(goal.id, amount, note)}
            inLabel="Guardar"
            outLabel="Resgatar"
            disableOut={goal.ownBalance <= 0}
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
  const { goals, addGoal, summary } = useInvestmentsStore()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<GoalKind>('savings')
  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState(0)
  const [targetMonth, setTargetMonth] = useState('')
  const [initialAmount, setInitialAmount] = useState(0)
  const [includes, setIncludes] = useState<GoalInclusion[]>([])

  const toggleInclusion = (inclusion: GoalInclusion) => {
    setIncludes((prev) => {
      const matches = (item: GoalInclusion) =>
        item.type === inclusion.type && (item.id ?? '') === (inclusion.id ?? '')
      return prev.some(matches) ? prev.filter((item) => !matches(item)) : [...prev, inclusion]
    })
  }

  const selectKind = (next: GoalKind) => {
    setKind(next)
    setIncludes(next === 'networth' ? NET_WORTH_INCLUSIONS : [])
  }

  const handleAdd = () => {
    if (!name.trim()) return
    addGoal({
      name,
      targetAmount,
      targetMonth: targetMonth || undefined,
      initialAmount: kind === 'savings' ? initialAmount : 0,
      includes,
    })
    setName('')
    setTargetAmount(0)
    setTargetMonth('')
    setInitialAmount(0)
    setIncludes([])
    setKind('savings')
    setOpen(false)
  }

  // Só o dinheiro guardado dentro das metas — o resto já está em outro tile.
  const totalSaved = goals.reduce((sum, goal) => sum + goal.ownBalance, 0)

  return (
    <Panel>
      <PanelHeader
        title="Metas"
        icon={<Flag size={16} />}
        description="Objetivos com nome e prazo. Uma meta pode guardar dinheiro próprio ou apenas medir o que você já tem."
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
          <SegmentedControl
            options={[
              { value: 'savings' as GoalKind, label: 'Guardar dinheiro' },
              { value: 'networth' as GoalKind, label: 'Medir patrimônio' },
            ]}
            value={kind}
            onChange={selectKind}
          />
          <p className="text-[11px] leading-relaxed text-dark-text-muted">
            {kind === 'savings'
              ? 'Uma caixinha própria: viagem, entrada de um imóvel, troca de carro. O saldo guardado aqui soma ao seu patrimônio.'
              : 'Uma régua sobre o que já existe: “9 mil até dezembro” contando reserva e investimentos. Não guarda dinheiro — e por isso não duplica nada.'}
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[11px] text-dark-text-muted">Nome</span>
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleAdd()}
                placeholder={
                  kind === 'savings' ? 'ex.: Viagem Japão, trocar de carro' : 'ex.: Patrimônio 2026'
                }
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
            {kind === 'savings' && (
              <label className="block">
                <span className="mb-1 block text-[11px] text-dark-text-muted">
                  Já guardado (opcional)
                </span>
                <CurrencyInput value={initialAmount} onChange={setInitialAmount} />
              </label>
            )}
          </div>

          <div>
            <span className="mb-1.5 block text-[11px] text-dark-text-muted">
              Engloba saldos já cadastrados
            </span>
            <InclusionPicker
              selected={includes}
              onToggle={toggleInclusion}
              classes={summary.classes}
              hasAssets={summary.physicalAssets > 0}
              hasDebts={summary.liabilities > 0}
            />
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
            Duas naturezas cabem aqui: caixinhas que juntam dinheiro (viagem, carro) e réguas de
            patrimônio (“9 mil até dezembro”) que apenas medem a reserva e os investimentos que você
            já cadastrou.
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
