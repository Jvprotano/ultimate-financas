import { useState } from 'react'
import { CalendarClock, CreditCard, Plus, Trash2 } from 'lucide-react'
import { CurrencyInput } from './CurrencyInput'
import { EmptyState, Meter, Panel, PanelHeader, PrimaryButton, SecondaryButton, Tag } from './ui'
import { formatCurrency, inputClass } from '../lib/format'
import { useCardsStore } from '../context/financasStore'
import { CHART_PALETTE } from '../types/constants'
import type { CardCycleStatus } from '../types'

// ---------------------------------------------------------------------------
// Cartões cadastrados.
//
// Um vencimento global não descreve dois cartões que fecham em datas
// diferentes: um pode ter fechado ontem (e não aceita mais compras deste ciclo)
// enquanto o outro fecha só na semana que vem. Cada cartão tem o seu calendário.
// ---------------------------------------------------------------------------

function dayLabel(days: number): string {
  if (days === 0) return 'hoje'
  if (days === 1) return 'amanhã'
  return `em ${days} dias`
}

function CardRow({ card }: { card: CardCycleStatus }) {
  const { updateAccount, removeAccount } = useCardsStore()
  const [editing, setEditing] = useState(false)

  return (
    <li className="rounded-lg bg-dark-surface px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="shrink-0 rounded-md bg-dark-input p-1.5 text-dark-text-muted">
          <CreditCard size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-dark-text">{card.name}</p>
          <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-dark-text-muted">
            {card.isClosed ? (
              <span className="text-amber-300">fatura fechada</span>
            ) : (
              <span>fecha {dayLabel(card.daysToClosing)}</span>
            )}
            <span>· vence {dayLabel(card.daysToDue)}</span>
            {card.limit > 0 && <Tag>limite {formatCurrency(card.limit)}</Tag>}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums text-dark-text">
            {formatCurrency(card.personalAmount)}
          </p>
          <p className="text-[11px] tabular-nums text-dark-text-muted">
            de {formatCurrency(card.totalAmount)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing((prev) => !prev)}
          className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-dark-text-muted transition-colors hover:text-dark-text"
          aria-expanded={editing}
        >
          {editing ? 'Fechar' : 'Editar'}
        </button>
      </div>

      {card.usagePct !== null && (
        <div className="mt-2">
          <Meter
            value={card.totalAmount}
            max={card.limit}
            color={card.usagePct > 80 ? CHART_PALETTE.orange : CHART_PALETTE.blue}
            height={4}
          />
          <p className="mt-1 text-[11px] tabular-nums text-dark-text-muted">
            {card.usagePct.toFixed(0)}% do limite do banco
          </p>
        </div>
      )}

      {editing && (
        <div className="mt-2.5 grid gap-2 border-t border-dark-border-subtle pt-2.5 sm:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-[11px] text-dark-text-muted">Nome</span>
            <input
              value={card.name}
              onChange={(event) => updateAccount(card.id, { name: event.target.value })}
              className={`${inputClass} !py-1.5`}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-dark-text-muted">Fecha no dia</span>
            <input
              type="number"
              min="1"
              max="31"
              value={card.closingDay}
              onChange={(event) =>
                updateAccount(card.id, { closingDay: Number(event.target.value) })
              }
              className={`${inputClass} !py-1.5 text-right tabular-nums`}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-dark-text-muted">Vence no dia</span>
            <input
              type="number"
              min="1"
              max="31"
              value={card.dueDay}
              onChange={(event) => updateAccount(card.id, { dueDay: Number(event.target.value) })}
              className={`${inputClass} !py-1.5 text-right tabular-nums`}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-dark-text-muted">Limite do banco</span>
            <CurrencyInput
              value={card.limit}
              onChange={(value) => updateAccount(card.id, { limit: value })}
              className="!py-1.5"
            />
          </label>
          <button
            type="button"
            onClick={() => removeAccount(card.id)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-dark-text-muted transition-colors hover:text-rose-400 sm:col-span-4"
          >
            <Trash2 size={13} />
            Remover cartão (os lançamentos ficam)
          </button>
        </div>
      )}
    </li>
  )
}

export function CardAccountsPanel() {
  const { cycles, unregistered, addAccount } = useCardsStore()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [closingDay, setClosingDay] = useState(30)
  const [dueDay, setDueDay] = useState(5)
  const [limit, setLimit] = useState(0)

  const handleAdd = (cardName = name) => {
    if (!cardName.trim()) return
    addAccount({ name: cardName, closingDay, dueDay, limit })
    setName('')
    setLimit(0)
    setOpen(false)
  }

  // Ordem de leitura: o que vence primeiro é o que importa primeiro.
  const ordered = [...cycles].sort((a, b) => a.daysToDue - b.daysToDue)

  return (
    <Panel>
      <PanelHeader
        title="Cartões cadastrados"
        icon={<CalendarClock size={16} />}
        description="Fechamento e vencimento de cada cartão. É o que diz quais compras ainda cabem neste ciclo e quando cada fatura sai da conta."
        actions={
          !open && (
            <SecondaryButton onClick={() => setOpen(true)}>
              <Plus size={14} />
              Novo cartão
            </SecondaryButton>
          )
        }
      />

      {unregistered.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2.5">
          <p className="text-[11px] leading-relaxed text-amber-200">
            Estes cartões aparecem na sua fatura mas não têm calendário cadastrado:
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {unregistered.map((cardName) => (
              <button
                key={cardName}
                type="button"
                onClick={() => handleAdd(cardName)}
                className="rounded-full border border-amber-500/40 bg-dark-input px-3 py-1 text-xs font-medium text-amber-200 transition-colors hover:border-amber-400"
              >
                + {cardName}
              </button>
            ))}
          </div>
        </div>
      )}

      {open && (
        <div className="mt-4 space-y-3 rounded-lg border border-dark-border bg-dark-surface/60 p-3">
          <div className="grid gap-2 sm:grid-cols-4">
            <label className="block">
              <span className="mb-1 block text-[11px] text-dark-text-muted">Nome</span>
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleAdd()}
                placeholder="ex.: Itaú"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] text-dark-text-muted">Fecha no dia</span>
              <input
                type="number"
                min="1"
                max="31"
                value={closingDay}
                onChange={(event) => setClosingDay(Number(event.target.value))}
                className={`${inputClass} text-right tabular-nums`}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] text-dark-text-muted">Vence no dia</span>
              <input
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(event) => setDueDay(Number(event.target.value))}
                className={`${inputClass} text-right tabular-nums`}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] text-dark-text-muted">
                Limite do banco (opcional)
              </span>
              <CurrencyInput value={limit} onChange={setLimit} />
            </label>
          </div>
          <div className="flex gap-2">
            <PrimaryButton onClick={() => handleAdd()} disabled={!name.trim()}>
              <Plus size={15} />
              Adicionar
            </PrimaryButton>
            <SecondaryButton onClick={() => setOpen(false)}>Cancelar</SecondaryButton>
          </div>
        </div>
      )}

      <div className="mt-4">
        {ordered.length === 0 ? (
          <EmptyState icon={<CreditCard size={24} />} title="Nenhum cartão cadastrado">
            Cadastre seus cartões com o dia de fechamento e de vencimento. O caixa do mês passa a
            saber exatamente quando cada fatura sai da conta.
          </EmptyState>
        ) : (
          <ul className="space-y-1.5">
            {ordered.map((card) => (
              <CardRow key={card.id} card={card} />
            ))}
          </ul>
        )}
      </div>
    </Panel>
  )
}
