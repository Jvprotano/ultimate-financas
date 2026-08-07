import { ArrowDownRight, ArrowUpRight, Wallet } from 'lucide-react'
import { Panel, PanelHeader, SegmentedBar, type Segment } from './ui'
import { formatCurrency, formatMonthLong } from '../lib/format'
import { useFinancasStore } from '../context/financasStore'
import { isWantIncludedInCardPlan } from '../lib/scenario'
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
  const { cashFlow, cards, financialCycle, forecast, scenarios } = useFinancasStore()
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
    : `vence ~${cards.settings.paymentDate} · gastos de ${formatMonthLong(financialCycle.spendingMonth)}`
  const nextInvoiceHint =
    financialCycle.plannedNextInvoice > financialCycle.nextInvoicePersonal
      ? `plano ${formatCurrency(financialCycle.plannedNextInvoice)} · já lançado ${formatCurrency(financialCycle.nextInvoicePersonal)}`
      : `compras de ${formatMonthLong(financialCycle.nextSpendingMonth)} já no cartão`
  const dueNow = invoiceToPay + costsOnAccount + extraExpense
  const accountWantItems = scenarios.activeScenario.wants.filter(
    (want) =>
      want.paidWith === 'account' &&
      want.plannedAmount > 0 &&
      !isWantIncludedInCardPlan(want, scenarios.activeScenario.wants),
  )
  const accountWantsPlanned = accountWantItems.reduce((sum, want) => sum + want.plannedAmount, 0)
  const roomForAccountWants = financialCycle.discretionaryPool
  const accountWantsAllowed = Math.min(accountWantsPlanned, roomForAccountWants)
  const accountWantsCut = Math.max(0, accountWantsPlanned - accountWantsAllowed)
  const accountWantsScale =
    accountWantsPlanned > 0 ? Math.min(1, accountWantsAllowed / accountWantsPlanned) : 1
  const decisionRows = accountWantItems.map((want) => ({
    id: want.id,
    name: want.name,
    planned: want.plannedAmount,
    recommended: want.plannedAmount * accountWantsScale,
  }))

  const segments: Segment[] = [
    { id: 'invoice', label: 'Fatura', value: invoiceToPay, color: CHART_PALETTE.orange },
    { id: 'costs', label: 'Custos em conta', value: costsOnAccount, color: CHART_PALETTE.blue },
    { id: 'invest', label: 'Aporte direto', value: directInvestment, color: CHART_PALETTE.aqua },
    { id: 'extra', label: 'Saídas do ano', value: extraExpense, color: CHART_PALETTE.red },
    {
      id: 'wants',
      label: 'Desejos em conta (sugerido)',
      value: Math.min(wantsOnAccount, financialCycle.discretionaryPool),
      color: CHART_PALETTE.yellow,
    },
    {
      id: 'left',
      label: 'Folga além dos desejos',
      value: Math.max(0, financialCycle.discretionaryAvailable - wantsOnAccount),
      color: CHART_PALETTE.muted,
    },
  ]

  return (
    <Panel>
      <PanelHeader
        title={`Ciclo financeiro de ${formatMonthLong(financialCycle.cashMonth)}`}
        icon={<Wallet size={16} />}
        description={`Salário do fim de ${formatMonthLong(financialCycle.spendingMonth)} financia o ciclo ${formatMonthLong(financialCycle.cashMonth)}. A fatura abaixo é de gastos de ${formatMonthLong(financialCycle.spendingMonth)} e conta neste ciclo.`}
        actions={
          <span className="text-right">
            <span className="block text-[11px] uppercase tracking-wider text-dark-text-muted">
              Liberado para alocar
            </span>
            <strong
              className={`block text-lg font-semibold tabular-nums ${
                financialCycle.discretionaryShortfall === 0 ? 'text-dark-text' : 'text-rose-400'
              }`}
            >
              {formatCurrency(
                financialCycle.discretionaryShortfall > 0
                  ? -financialCycle.discretionaryShortfall
                  : financialCycle.discretionaryPool,
              )}
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
          label="Fatura do ciclo"
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
        {extraExpense > 0 && (
          <FlowRow
            label="Saídas do ano"
            value={extraExpense}
            direction="out"
            hint={expenseEvents.map((item) => item.event.name).join(', ')}
          />
        )}
      </div>

      {financialCycle.reservedForNextInvoice > 0.005 && (
        <p className="mt-3 rounded-lg border border-dark-border-subtle bg-dark-surface/40 px-3 py-2 text-[11px] leading-relaxed text-dark-text-muted">
          Cartão em formação (próximo ciclo): ~{formatCurrency(financialCycle.reservedForNextInvoice)}{' '}
          — {nextInvoiceHint}. Paga-se com o próximo salário, não com este.
        </p>
      )}

      {accountWantItems.length > 0 && (
        <div
          className={`mt-4 rounded-xl border p-4 ${
            accountWantsCut > 0
              ? 'border-rose-500/25 bg-rose-500/[0.06]'
              : 'border-primary-500/20 bg-primary-500/[0.05]'
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-dark-text">
                Quanto enviar para desejos fora do cartão
              </p>
              <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-dark-text-muted">
                Depois de pagar a fatura deste ciclo, as contas e o aporte, este bloco diz quanto
                cabe enviar para Viagens, Qualidade de Vida e outros desejos que não passam no
                cartão.
              </p>
            </div>
            <div className="text-right">
              <span className="block text-[11px] uppercase tracking-wider text-dark-text-muted">
                Cabe neste ciclo
              </span>
              <strong
                className={`block text-lg font-semibold tabular-nums ${
                  accountWantsCut > 0 ? 'text-rose-300' : 'text-primary-300'
                }`}
              >
                {formatCurrency(accountWantsAllowed)}
              </strong>
              {accountWantsCut > 0 && (
                <span className="text-[11px] text-rose-200">
                  corte {formatCurrency(accountWantsCut)}
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {decisionRows.map((row) => (
              <div key={row.id} className="rounded-lg bg-dark-card px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm font-medium text-dark-text">
                    {row.name}
                  </span>
                  <strong className="shrink-0 text-sm tabular-nums text-dark-text">
                    {formatCurrency(row.recommended)}
                  </strong>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-dark-text-muted">
                  <span>planejado {formatCurrency(row.planned)}</span>
                  {row.recommended < row.planned - 0.005 && (
                    <span className="text-rose-200">
                      adiar {formatCurrency(row.planned - row.recommended)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {financialCycle.discretionaryShortfall > 0 && (
        <p className="mt-2 text-[11px] leading-relaxed text-rose-300">
          Faltam {formatCurrency(financialCycle.discretionaryShortfall)} para cobrir a fatura deste
          ciclo, as contas e o aporte. Reduza desejos em conta ou o aporte antes de assumir novas
          compras no cartão.
        </p>
      )}

      <div className="mt-4 rounded-xl border border-dark-border bg-dark-surface/40 p-4">
        <p className="text-sm font-semibold text-dark-text">
          Como ler este ciclo na vida real
        </p>
        <div className="mt-3 grid gap-2 text-xs leading-relaxed text-dark-text-muted md:grid-cols-2">
          <div className="rounded-lg bg-dark-card px-3 py-2">
            <span className="block font-medium text-dark-text">1. Pague as obrigações do ciclo</span>
            <span>
              {formatCurrency(dueNow)} em fatura, contas e saídas do ciclo{' '}
              {formatMonthLong(financialCycle.cashMonth)}. A fatura é de gastos de{' '}
              {formatMonthLong(financialCycle.spendingMonth)} e conta neste ciclo.
            </span>
          </div>
          <div className="rounded-lg bg-dark-card px-3 py-2">
            <span className="block font-medium text-dark-text">
              2. Preserve a verba do ciclo
            </span>
            <span>
              {formatCurrency(wantsOnAccount)} está planejado fora do cartão para desejos como
              viagem/qualidade de vida em {formatMonthLong(financialCycle.cashMonth)}.
            </span>
          </div>
          <div className="rounded-lg bg-dark-card px-3 py-2">
            <span className="block font-medium text-dark-text">
              3. Cartão em formação
            </span>
            <span>
              ~{formatCurrency(financialCycle.reservedForNextInvoice)} já é prévia do próximo ciclo
              ({formatMonthLong(financialCycle.nextSpendingMonth)}). Esse valor não sai deste
              salário — o próximo paga.
            </span>
          </div>
          <div
            className={`rounded-lg px-3 py-2 ${
              financialCycle.discretionaryShortfall > 0
                ? 'bg-rose-500/[0.08] text-rose-200'
                : 'bg-primary-500/[0.08] text-primary-200'
            }`}
          >
            <span className="block font-medium text-dark-text">
              4. Decisão para Viagens/Qualidade
            </span>
            <span>
              {financialCycle.discretionaryShortfall > 0
                ? `Não aumente esses valores ainda: faltam ${formatCurrency(financialCycle.discretionaryShortfall)} para fechar o ciclo.`
                : `Depois de pagar fatura, contas e aporte, sobram ${formatCurrency(financialCycle.discretionaryPool)} livres para desejos ou investimentos.`}
            </span>
          </div>
        </div>
      </div>
    </Panel>
  )
}
