import { ArrowDownRight, ArrowUpRight, Wallet } from 'lucide-react'
import { Panel, PanelHeader, SegmentedBar, type Segment } from './ui'
import { formatCurrency, formatMonthLong } from '../lib/format'
import { useFinancasStore } from '../context/financasStore'
import { CHART_PALETTE } from '../types/constants'

// ---------------------------------------------------------------------------
// O mês visto pelo extrato bancário.
//
// O orçamento (necessidades / desejos / investimentos) é regime de competência:
// um jantar de julho é um desejo de julho. Este painel é o regime de caixa: em
// julho sai da conta a fatura que fechou, não os jantares de julho. Os dois
// falam do mesmo dinheiro em momentos diferentes — e é por isso que um gasto no
// cartão nunca é "gasto duas vezes".
// ---------------------------------------------------------------------------

function FlowRow({
  label,
  value,
  hint,
  direction,
}: {
  label: string
  value: number
  hint?: string
  direction: 'in' | 'out'
}) {
  const Icon = direction === 'in' ? ArrowUpRight : ArrowDownRight
  return (
    <div className="flex items-start justify-between gap-3 border-t border-dark-border-subtle py-2 first:border-t-0">
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-sm text-dark-text-secondary">
          <Icon
            size={13}
            className={direction === 'in' ? 'text-primary-400' : 'text-dark-text-muted'}
          />
          {label}
        </span>
        {hint && <span className="mt-0.5 block pl-5 text-[11px] text-dark-text-muted">{hint}</span>}
      </span>
      <span className="shrink-0 text-sm font-medium tabular-nums text-dark-text">
        {direction === 'in' ? '+' : '−'} {formatCurrency(Math.abs(value))}
      </span>
    </div>
  )
}

export function CashFlowPanel() {
  const { cashFlow, cards, financialCycle, forecast } = useFinancasStore()
  const {
    paycheck,
    extraIncome,
    totalIn,
    invoiceToPay,
    costsOnAccount,
    wantsOnAccount,
    directInvestment,
    extraExpense,
  } = cashFlow

  const incomeEvents = forecast.monthOccurrences.filter((item) => item.event.kind === 'income')
  const expenseEvents = forecast.monthOccurrences.filter((item) => item.event.kind === 'expense')

  // Com fechamentos diferentes, "a fatura" são várias — cada uma com sua data.
  const invoices = [...cards.cycles]
    .filter((card) => card.personalAmount > 0)
    .sort((a, b) => a.daysToDue - b.daysToDue)
  const invoiceHint = invoices.length
    ? invoices
        .map((card) => `${card.name} dia ${card.dueDay}${card.isClosed ? ' (fechada)' : ''}`)
        .join(' · ')
    : `vence em ${cards.settings.paymentDate} — é o gasto do ciclo que fechou`

  const segments: Segment[] = [
    { id: 'invoice', label: 'Fatura', value: invoiceToPay, color: CHART_PALETTE.orange },
    { id: 'costs', label: 'Custos em conta', value: costsOnAccount, color: CHART_PALETTE.blue },
    { id: 'wants', label: 'Desejos em conta', value: wantsOnAccount, color: CHART_PALETTE.yellow },
    { id: 'invest', label: 'Aporte direto', value: directInvestment, color: CHART_PALETTE.aqua },
    { id: 'extra', label: 'Saídas do ano', value: extraExpense, color: CHART_PALETTE.red },
    {
      id: 'reserve',
      label: 'Reserva da próxima fatura',
      value: financialCycle.reservedForNextInvoice,
      color: CHART_PALETTE.violet,
    },
    {
      id: 'left',
      label: 'Livre',
      value: financialCycle.safeToSpend,
      color: CHART_PALETTE.muted,
    },
  ]

  return (
    <Panel>
      <PanelHeader
        title={`Ciclo financeiro de ${formatMonthLong(financialCycle.cashMonth)}`}
        icon={<Wallet size={16} />}
        description={`O dinheiro recebido no fim de ${formatMonthLong(financialCycle.spendingMonth)} financia ${formatMonthLong(financialCycle.cashMonth)}. A fatura abaixo é de gastos de ${formatMonthLong(financialCycle.spendingMonth)}.`}
        actions={
          <span className="text-right">
            <span className="block text-[11px] uppercase tracking-wider text-dark-text-muted">
              Livre depois das reservas
            </span>
            <strong
              className={`block text-lg font-semibold tabular-nums ${
                financialCycle.shortfall === 0 ? 'text-dark-text' : 'text-rose-400'
              }`}
            >
              {formatCurrency(financialCycle.safeToSpend)}
            </strong>
          </span>
        }
      />

      {totalIn > 0 && (
        <div className="mt-4">
          <SegmentedBar segments={segments} total={totalIn} height={12} />
        </div>
      )}

      <div className="mt-4">
        <FlowRow label="Salário na conta" value={paycheck} direction="in" />
        {extraIncome > 0 && (
          <FlowRow
            label="Entradas do ano"
            value={extraIncome}
            direction="in"
            hint={incomeEvents.map((item) => item.event.name).join(', ')}
          />
        )}
        <FlowRow
          label={invoices.length > 1 ? 'Faturas anteriores' : 'Fatura anterior'}
          value={invoiceToPay}
          direction="out"
          hint={`${invoiceHint} · gastos de ${formatMonthLong(financialCycle.spendingMonth)}`}
        />
        {costsOnAccount > 0 && (
          <FlowRow
            label="Custos em débito ou boleto"
            value={costsOnAccount}
            direction="out"
            hint="custos fixos que não passam no cartão"
          />
        )}
        {wantsOnAccount > 0 && (
          <FlowRow label="Desejos fora do cartão" value={wantsOnAccount} direction="out" />
        )}
        {directInvestment > 0 && (
          <FlowRow
            label="Aporte direto"
            value={directInvestment}
            direction="out"
            hint="o que você transfere para investir, além da folha"
          />
        )}
        {financialCycle.reservedForNextInvoice > 0 && (
          <FlowRow
            label="Reserva da próxima fatura"
            value={financialCycle.reservedForNextInvoice}
            direction="out"
            hint={`compras de ${formatMonthLong(financialCycle.nextSpendingMonth)} já feitas no cartão`}
          />
        )}
        {extraExpense > 0 && (
          <FlowRow
            label="Saídas do ano"
            value={extraExpense}
            direction="out"
            hint={expenseEvents.map((item) => item.event.name).join(', ')}
          />
        )}
      </div>

      {financialCycle.shortfall > 0 && (
        <p className="mt-2 text-[11px] leading-relaxed text-rose-300">
          Faltam {formatCurrency(financialCycle.shortfall)} para cobrir os compromissos atuais e
          deixar reservada a próxima fatura. Reduza desejos ou o aporte antes de assumir novas
          compras no cartão.
        </p>
      )}
    </Panel>
  )
}
