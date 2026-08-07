import { useState, type ReactNode } from 'react'
import {
  ArrowRight,
  CalendarCheck,
  CreditCard,
  Landmark,
  PiggyBank,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { ActualsPanel } from './ActualsPanel'
import {
  ConfirmButton,
  Panel,
  PanelHeader,
  PrimaryButton,
  StatTile,
} from './ui'
import { formatCurrency, formatMonthLong, inputClass } from '../lib/format'
import { useFinancasStore } from '../context/financasStore'
import { isWantIncludedInCardPlan } from '../lib/scenario'

function ComparisonRow({
  label,
  planned,
  actual,
  hint,
  deltaHint,
}: {
  label: string
  planned: number
  actual: number
  hint?: string
  /** Se false, não mostra delta (ex.: aporte ainda sem realizado próprio). */
  deltaHint?: string | null
}) {
  const delta = planned - actual
  const showDelta = deltaHint !== null && Math.abs(delta) > 0.005

  return (
    <div className="grid grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] items-start gap-2 border-t border-dark-border-subtle py-2.5 first:border-t-0 sm:gap-3">
      <div className="min-w-0">
        <span className="block text-sm font-medium text-dark-text">{label}</span>
        {hint && <span className="mt-0.5 block text-[11px] text-dark-text-muted">{hint}</span>}
      </div>
      <span className="text-right text-sm tabular-nums text-dark-text-secondary">
        {formatCurrency(planned)}
      </span>
      <span className="text-right text-sm tabular-nums text-dark-text">
        {formatCurrency(actual)}
      </span>
      <span
        className={`text-right text-sm font-medium tabular-nums ${
          !showDelta
            ? 'text-dark-text-muted'
            : delta > 0
              ? 'text-primary-400'
              : 'text-rose-400'
        }`}
      >
        {showDelta
          ? `${delta > 0 ? '+' : '−'} ${formatCurrency(Math.abs(delta))}`
          : deltaHint ?? '—'}
      </span>
    </div>
  )
}

function TransferHint({
  items,
  pool,
}: {
  items: { id: string; name: string; planned: number }[]
  pool: number
}) {
  if (items.length === 0 || pool <= 0.005) return null

  const plannedTotal = items.reduce((sum, item) => sum + item.planned, 0)
  const scale = plannedTotal > 0 ? Math.min(1, pool / plannedTotal) : 1

  return (
    <div className="mt-4 rounded-xl border border-dark-border bg-dark-surface/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-dark-text">
          Sugestão de rateio dos desejos em conta
        </span>
        {scale < 1 && (
          <span className="text-xs font-medium text-rose-300">
            pool cobre {(scale * 100).toFixed(0)}% do plano
          </span>
        )}
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {items.map((item) => {
          const recommended = item.planned * scale
          const postponed = item.planned - recommended
          return (
            <div key={item.id} className="rounded-lg bg-dark-card px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-sm font-medium text-dark-text">
                  {item.name}
                </span>
                <strong className="shrink-0 text-sm tabular-nums text-dark-text">
                  {formatCurrency(recommended)}
                </strong>
              </div>
              <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-dark-text-muted">
                <span>planejado {formatCurrency(item.planned)}</span>
                {postponed > 0.005 && (
                  <span className="text-rose-200">adiar {formatCurrency(postponed)}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StepChip({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-dark-surface/60 px-3 py-2">
      <span className="mt-0.5 text-dark-text-muted">{icon}</span>
      <div className="min-w-0">
        <span className="block text-[11px] uppercase tracking-wider text-dark-text-muted">
          {label}
        </span>
        <strong className="block text-sm tabular-nums text-dark-text">{value}</strong>
      </div>
    </div>
  )
}

export function ClosingView() {
  const {
    history,
    metrics,
    cashFlow,
    financialCycle,
    actuals,
    cards,
    scenarios,
    closeCurrentMonth,
  } = useFinancasStore()
  const { currentMonth, isCurrentMonthClosed } = history
  const [note, setNote] = useState('')

  const accountCostRows = actuals.summary.rows.filter((row) => row.cost.paidWith !== 'card')
  const plannedCostsOnAccount = accountCostRows.reduce((sum, row) => sum + row.planned, 0)
  const actualCostsOnAccount = accountCostRows.reduce((sum, row) => sum + row.effective, 0)

  const plannedOnCard = cashFlow.plannedOnCard
  const invoiceActual = cashFlow.invoiceToPay
  const cardDelta = plannedOnCard - invoiceActual

  const accountWantItems = scenarios.activeScenario.wants
    .filter(
      (want) =>
        want.paidWith === 'account' &&
        want.plannedAmount > 0 &&
        !isWantIncludedInCardPlan(want, scenarios.activeScenario.wants),
    )
    .map((want) => ({ id: want.id, name: want.name, planned: want.plannedAmount }))

  const handleClose = () => {
    closeCurrentMonth(currentMonth, note)
    setNote('')
  }

  const pool = financialCycle.discretionaryPool
  const shortfall = financialCycle.discretionaryShortfall
  const available = financialCycle.discretionaryAvailable

  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader
          title={`Fechamento de ${formatMonthLong(financialCycle.cashMonth)}`}
          icon={<CalendarCheck size={16} />}
          description={
            <>
              Depois de receber o salário, pagar a fatura de{' '}
              {formatMonthLong(financialCycle.spendingMonth)}, as contas e o aporte — e reservar a
              próxima fatura — sobra o que você pode alocar em desejos ou investimentos sem se
              complicar.
            </>
          }
          actions={
            isCurrentMonthClosed ? (
              <ConfirmButton onConfirm={handleClose} confirmLabel="Substituir" tone="primary">
                Refechar o mês
              </ConfirmButton>
            ) : (
              <PrimaryButton onClick={handleClose}>
                <CalendarCheck size={15} />
                Fechar o mês
              </PrimaryButton>
            )
          }
        />

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
          <div
            className={`flex flex-col justify-between rounded-xl border px-5 py-5 ${
              shortfall > 0.005
                ? 'border-rose-500/30 bg-rose-500/[0.06]'
                : 'border-primary-500/25 bg-primary-500/[0.06]'
            }`}
          >
            <div>
              <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-dark-text-muted">
                <Sparkles size={12} />
                Liberado para alocar
              </span>
              <strong
                className={`mt-1 block text-4xl font-bold leading-tight tracking-tight tabular-nums ${
                  shortfall > 0.005 ? 'text-rose-300' : 'text-primary-300'
                }`}
              >
                {formatCurrency(shortfall > 0.005 ? -shortfall : pool)}
              </strong>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-dark-text-muted">
              {shortfall > 0.005
                ? `Faltam ${formatCurrency(shortfall)} para cobrir fatura, contas, aporte e a reserva da próxima fatura. Corte desejos ou o aporte antes de assumir mais gastos.`
                : `Pode ir para Qualidade de vida, Viagens, reforço de aporte ou qualquer coisa que não seja custo. Não precisa “queimar” o envelope planejado se o realizado veio menor.`}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <StepChip
              icon={<Wallet size={13} />}
              label="Renda do ciclo"
              value={formatCurrency(financialCycle.income)}
            />
            <StepChip
              icon={<CreditCard size={13} />}
              label="Fatura a pagar"
              value={formatCurrency(financialCycle.invoiceToPay)}
            />
            <StepChip
              icon={<Landmark size={13} />}
              label="Custos em conta"
              value={formatCurrency(financialCycle.costsOnAccount)}
            />
            <StepChip
              icon={<PiggyBank size={13} />}
              label="Aporte + reserva"
              value={formatCurrency(
                financialCycle.directInvestment + financialCycle.reservedForNextInvoice,
              )}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
          <StatTile
            label="Plano de desejos em conta"
            value={formatCurrency(cashFlow.wantsOnAccount)}
            detail={
              cashFlow.wantsOnAccount > 0.005
                ? available + 0.005 >= cashFlow.wantsOnAccount
                  ? 'o pool cobre o plano'
                  : `pool cobre ${formatCurrency(pool)} do plano`
                : 'nenhum desejo fora do cartão'
            }
          />
          <StatTile
            label="Folga além do plano de desejos"
            value={formatCurrency(Math.max(0, available - cashFlow.wantsOnAccount))}
            detail="depois de mandar o planejado para Viagens/Qualidade"
            tone="accent"
          />
          <StatTile
            label="Cartão: plano × fatura"
            value={`${cardDelta >= 0 ? '+' : '−'} ${formatCurrency(Math.abs(cardDelta))}`}
            detail={
              plannedOnCard > 0.005
                ? `plano ${formatCurrency(plannedOnCard)} · fatura ${formatCurrency(invoiceActual)}`
                : 'sem plano no cartão'
            }
            tone={cardDelta >= 0 ? 'positive' : 'negative'}
          />
        </div>

        <TransferHint items={accountWantItems} pool={pool} />

        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Nota do mês (opcional) — ex.: 13º salário, mudança de aluguel"
          className={`${inputClass} mt-4`}
          aria-label="Nota do mês"
        />

        {isCurrentMonthClosed && (
          <p className="mt-2 text-xs text-dark-text-muted">
            {formatMonthLong(currentMonth)} já está fechado. Refechar substitui o registro pelos
            números atuais.
          </p>
        )}
      </Panel>

      <Panel>
        <PanelHeader
          title="Plano × realizado"
          icon={<ArrowRight size={16} />}
          description="Onde o mês saiu diferente do planejado — positivo no delta libera dinheiro; negativo consome a folga."
        />

        <div className="mt-3">
          <div className="grid grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] gap-2 pb-1.5 text-[11px] uppercase tracking-wider text-dark-text-muted sm:gap-3">
            <span>Linha</span>
            <span className="text-right">Plano</span>
            <span className="text-right">Realizado</span>
            <span className="text-right">Delta</span>
          </div>

          <ComparisonRow
            label="Cartão"
            planned={plannedOnCard}
            actual={invoiceActual}
            hint={`Fatura pessoal de gastos de ${formatMonthLong(financialCycle.spendingMonth)}`}
          />
          <ComparisonRow
            label="Custos em conta"
            planned={plannedCostsOnAccount}
            actual={actualCostsOnAccount}
            hint={
              actuals.summary.informedCount > 0
                ? `${actuals.summary.informedCount} itens com realizado informado`
                : 'ainda usando o plano — informe o realizado abaixo'
            }
          />
          <ComparisonRow
            label="Aporte direto"
            planned={metrics.directInvestmentTarget}
            actual={metrics.directInvestmentTarget}
            hint="meta do mês (sem realizado separado ainda)"
            deltaHint="meta"
          />
          <ComparisonRow
            label="Reserva da próxima fatura"
            planned={financialCycle.plannedNextInvoice}
            actual={financialCycle.reservedForNextInvoice}
            hint={
              financialCycle.reservedForNextInvoice > financialCycle.nextInvoicePersonal + 0.005
                ? `já lançado ${formatCurrency(financialCycle.nextInvoicePersonal)} · reserva pelo plano`
                : `compras de ${formatMonthLong(financialCycle.nextSpendingMonth)}`
            }
          />
        </div>

        <p className="mt-3 border-t border-dark-border-subtle pt-3 text-xs leading-relaxed text-dark-text-muted">
          Liberado = {formatCurrency(financialCycle.income)} − fatura{' '}
          {formatCurrency(financialCycle.invoiceToPay)} − custos{' '}
          {formatCurrency(financialCycle.costsOnAccount)} − aporte{' '}
          {formatCurrency(financialCycle.directInvestment)}
          {financialCycle.extraExpense > 0.005 && (
            <> − saídas do ano {formatCurrency(financialCycle.extraExpense)}</>
          )}{' '}
          − reserva {formatCurrency(financialCycle.reservedForNextInvoice)} ={' '}
          <strong className={shortfall > 0.005 ? 'text-rose-300' : 'text-primary-300'}>
            {formatCurrency(available)}
          </strong>
          .
        </p>
      </Panel>

      <ActualsPanel />

      {(cards.summary.currentPersonalTotal > 0 || metrics.plannedOnCard > 0) && (
        <p className="text-center text-xs text-dark-text-muted">
          Limite pessoal do cartão:{' '}
          {cards.settings.personalSpendingLimit > 0
            ? formatCurrency(cards.settings.personalSpendingLimit)
            : 'não definido'}
          {' · '}
          fatura atual {formatCurrency(cards.summary.currentPersonalTotal)}
        </p>
      )}
    </div>
  )
}
