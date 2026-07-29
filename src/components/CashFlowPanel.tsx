import { AlertTriangle, ArrowDownRight, ArrowUpRight, Wallet } from 'lucide-react'
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
  const { cashFlow, cards, forecast } = useFinancasStore()
  const {
    paycheck,
    extraIncome,
    totalIn,
    invoiceToPay,
    costsOnAccount,
    wantsOnAccount,
    directInvestment,
    extraExpense,
    plannedOnCard,
    cardPlanGap,
    leftover,
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
    { id: 'left', label: 'Sobra', value: Math.max(0, leftover), color: CHART_PALETTE.muted },
  ]

  return (
    <Panel>
      <PanelHeader
        title={`Caixa de ${formatMonthLong(forecast.currentMonth)}`}
        icon={<Wallet size={16} />}
        description="O que entra e sai da conta agora. O orçamento mede o mês em que você gastou; aqui é o mês em que o dinheiro se move."
        actions={
          <span className="text-right">
            <span className="block text-[11px] uppercase tracking-wider text-dark-text-muted">
              Sobra em caixa
            </span>
            <strong
              className={`block text-lg font-semibold tabular-nums ${
                leftover >= 0 ? 'text-dark-text' : 'text-rose-400'
              }`}
            >
              {formatCurrency(leftover)}
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
          label={invoices.length > 1 ? 'Faturas do cartão (sua parte)' : 'Fatura do cartão (sua parte)'}
          value={invoiceToPay}
          direction="out"
          hint={invoiceHint}
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
        {extraExpense > 0 && (
          <FlowRow
            label="Saídas do ano"
            value={extraExpense}
            direction="out"
            hint={expenseEvents.map((item) => item.event.name).join(', ')}
          />
        )}
      </div>

      {plannedOnCard > 0 && (
        <p
          className={`mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-[11px] leading-relaxed ${
            cardPlanGap > 0.005
              ? 'border-amber-500/25 bg-amber-500/[0.07] text-amber-200'
              : 'border-dark-border bg-dark-surface text-dark-text-muted'
          }`}
        >
          {cardPlanGap > 0.005 && <AlertTriangle size={13} className="mt-px shrink-0" />}
          <span>
            Seu plano prevê <strong>{formatCurrency(plannedOnCard)}</strong> passando no cartão e a
            fatura registra <strong>{formatCurrency(invoiceToPay)}</strong>.
            {cardPlanGap > 0.005
              ? ` São ${formatCurrency(cardPlanGap)} acima do planejado — a diferença é gasto que ainda não tem lugar no orçamento.`
              : ' A fatura está dentro do plano.'}
          </span>
        </p>
      )}

      {invoiceToPay > 0 && leftover < 0 && (
        <p className="mt-2 text-[11px] leading-relaxed text-rose-300">
          O salário deste mês não cobre a fatura que vence mais o resto. Como a fatura é o gasto do
          mês passado, a saída costuma ser cortar o cartão agora — o efeito só aparece no caixa do
          mês seguinte.
        </p>
      )}
    </Panel>
  )
}
