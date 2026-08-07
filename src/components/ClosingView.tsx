import { useState, type ReactNode } from 'react'
import {
  ArrowRight,
  CalendarCheck,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  CreditCard,
  Landmark,
  ListChecks,
  PiggyBank,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { ActualsPanel } from './ActualsPanel'
import { CashFlowPanel } from './CashFlowPanel'
import { CycleAlerts } from './CycleAlerts'
import {
  ConfirmButton,
  Panel,
  PanelHeader,
  PrimaryButton,
  SecondaryButton,
  StatTile,
} from './ui'
import { formatCurrency, formatMonthLong, inputClass } from '../lib/format'
import { useFinancasStore } from '../context/financasStore'
import { isWantIncludedInCardPlan } from '../lib/scenario'
import {
  cardDueDivergesFromCycle,
  cycleSalaryMonth,
  cycleSpendingMonth,
  expectedCardDueMonth,
} from '../lib/activeCycle'
import {
  allocateWantsToPool,
  allocationChangesPlan,
} from '../lib/allocateWants'
import { parsePaymentDay } from '../lib/creditCards'

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

function WorkflowStep({
  done,
  title,
  detail,
  action,
}: {
  done: boolean
  title: string
  detail: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dark-border-subtle bg-dark-surface/40 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-2.5">
        {done ? (
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary-400" />
        ) : (
          <Circle size={16} className="mt-0.5 shrink-0 text-dark-text-muted" />
        )}
        <div className="min-w-0">
          <span className="block text-sm font-medium text-dark-text">{title}</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-dark-text-muted">{detail}</span>
        </div>
      </div>
      {action && <div className="shrink-0 sm:pl-2">{action}</div>}
    </div>
  )
}

export function ClosingView({
  onGoToCards,
  onGoToPlanning,
}: {
  onGoToCards: () => void
  onGoToPlanning: () => void
}) {
  const {
    activeCycle,
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
  const [allocatedFlash, setAllocatedFlash] = useState(false)

  const accountCostRows = actuals.summary.rows.filter((row) => row.cost.paidWith !== 'card')
  const plannedCostsOnAccount = accountCostRows.reduce((sum, row) => sum + row.planned, 0)
  const actualCostsOnAccount = accountCostRows.reduce((sum, row) => sum + row.effective, 0)

  const plannedOnCard = cashFlow.plannedOnCard
  const invoiceActual = cards.summary.currentPersonalTotal
  const cardDelta = plannedOnCard - invoiceActual
  const salaryMonth = cycleSalaryMonth(activeCycle.month)
  const spendingMonth = cycleSpendingMonth(activeCycle.month)

  const accountWantItems = scenarios.activeScenario.wants
    .filter(
      (want) =>
        want.paidWith === 'account' &&
        want.plannedAmount > 0 &&
        !isWantIncludedInCardPlan(want, scenarios.activeScenario.wants),
    )
    .map((want) => ({ id: want.id, name: want.name, planned: want.plannedAmount }))

  const pool = financialCycle.discretionaryPool
  const shortfall = financialCycle.discretionaryShortfall
  const available = financialCycle.discretionaryAvailable

  const allocations = allocateWantsToPool(accountWantItems, pool)
  const canApplyAllocation = allocationChangesPlan(accountWantItems, allocations)

  const currentDueMonth =
    cards.settings.currentDueMonth ?? expectedCardDueMonth(activeCycle.month)
  const dueDiverges = cardDueDivergesFromCycle(cards.settings.currentDueMonth, activeCycle.month)

  const handleClose = () => {
    closeCurrentMonth(currentMonth, note)
    setNote('')
  }

  const handleApplyAllocation = () => {
    scenarios.applyWantAmounts(allocations)
    setAllocatedFlash(true)
    window.setTimeout(() => setAllocatedFlash(false), 2500)
  }

  const handleAlignDueMonth = () => {
    const dueDay = parsePaymentDay(cards.settings.paymentDate, activeCycle.cycle.cardDueHintDay)
    const month = expectedCardDueMonth(activeCycle.month)
    const [, monthPart] = month.split('-')
    cards.setSettings({
      ...cards.settings,
      currentDueMonth: month,
      paymentDate: `${String(dueDay).padStart(2, '0')}/${monthPart ?? '01'}`,
    })
  }

  if (metrics.availableForBudget <= 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dark-border bg-dark-card px-6 py-16 text-center">
        <h2 className="text-xl font-semibold tracking-tight text-dark-text">
          Comece pelo salário
        </h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-dark-text-muted">
          Informe a renda e os custos em Planejar. O hub do ciclo monta o liberado para alocar, a
          fatura e o fechamento.
        </p>
        <PrimaryButton className="mt-6" onClick={onGoToPlanning}>
          Ir para Planejar
          <ArrowRight size={15} />
        </PrimaryButton>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader
          title={`Ciclo ${formatMonthLong(activeCycle.month)}`}
          icon={<CalendarRange size={16} />}
          description={
            <>
              Salário do fim de {formatMonthLong(salaryMonth)} financia este ciclo. Cartão = gastos
              de {formatMonthLong(spendingMonth)}. Desejos = viver em{' '}
              {formatMonthLong(activeCycle.month)}.
            </>
          }
          actions={
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => activeCycle.shiftCycle(-1)}
                className="rounded-md border border-dark-border p-1.5 text-dark-text-muted transition-colors hover:text-dark-text"
                aria-label="Ciclo anterior"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => activeCycle.shiftCycle(1)}
                className="rounded-md border border-dark-border p-1.5 text-dark-text-muted transition-colors hover:text-dark-text"
                aria-label="Próximo ciclo"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          }
        />
        <div className="mt-3 grid gap-2 text-xs leading-relaxed text-dark-text-muted sm:grid-cols-3">
          <div className="rounded-lg bg-dark-surface/50 px-3 py-2">
            <span className="block font-medium text-dark-text">Salário</span>
            ~dia {activeCycle.cycle.salaryHintDay} de {formatMonthLong(salaryMonth)}
          </div>
          <div className="rounded-lg bg-dark-surface/50 px-3 py-2">
            <span className="block font-medium text-dark-text">Cartão a pagar</span>
            gastos de {formatMonthLong(spendingMonth)} · vence ~dia{' '}
            {activeCycle.cycle.cardDueHintDay}
          </div>
          <div className="rounded-lg bg-dark-surface/50 px-3 py-2">
            <span className="block font-medium text-dark-text">Desejos e aporte</span>
            verba para viver {formatMonthLong(activeCycle.month)}
          </div>
        </div>
      </Panel>

      {dueDiverges && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-sm leading-relaxed text-amber-100/90">
            <strong className="font-semibold text-amber-200">Vencimento do cartão desalinhado.</strong>{' '}
            A fatura está marcada para {formatMonthLong(currentDueMonth)}, mas o ciclo ativo é{' '}
            {formatMonthLong(activeCycle.month)}. O caixa já conta a fatura neste ciclo — alinhe só
            se quiser sincronizar o rótulo.
          </div>
          <SecondaryButton onClick={handleAlignDueMonth}>
            Alinhar vencimento ao ciclo
          </SecondaryButton>
        </div>
      )}

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
            ? `Faltam ${formatCurrency(shortfall)} para cobrir a fatura deste ciclo, as contas e o aporte.`
            : `Depois das obrigações do ciclo, este valor pode ir para desejos ou reforço de aporte.`}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
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
            label="Aporte direto"
            value={formatCurrency(financialCycle.directInvestment)}
          />
        </div>
      </div>

      <CycleAlerts />

      <Panel>
        <PanelHeader
          title="Fluxo do ciclo"
          icon={<ListChecks size={16} />}
          description="Passos que escrevem estado. Pagar a fatura não fecha o ciclo — só Fechar avança."
        />
        <div className="mt-3 space-y-2">
          <WorkflowStep
            done={financialCycle.income > 0.005}
            title="1. Receber"
            detail={`${formatCurrency(financialCycle.income)} no caixa deste ciclo.`}
          />
          <WorkflowStep
            done={invoiceActual <= 0.005}
            title="2. Pagar fatura"
            detail={
              invoiceActual > 0.005
                ? `${formatCurrency(invoiceActual)} de gastos de ${formatMonthLong(spendingMonth)} — conta neste ciclo.`
                : 'Fatura atual zerada (já paga ou sem lançamentos).'
            }
            action={
              invoiceActual > 0.005 ? (
                <SecondaryButton onClick={onGoToCards}>
                  <CreditCard size={14} />
                  Ir para Cartões
                </SecondaryButton>
              ) : undefined
            }
          />
          <WorkflowStep
            done={actuals.summary.informedCount > 0}
            title="3. Informar realizados"
            detail={
              actuals.summary.informedCount > 0
                ? `${actuals.summary.informedCount} custo(s) com valor pago informado.`
                : 'Opcional, mas melhora o histórico — use a tabela abaixo.'
            }
          />
          <WorkflowStep
            done={!canApplyAllocation || allocatedFlash}
            title="4. Alocar desejos"
            detail={
              accountWantItems.length === 0
                ? 'Nenhum desejo em conta fora do cartão.'
                : canApplyAllocation
                  ? `O pool cobre parte do plano — aplicar rateio ajusta ${accountWantItems.length} desejo(s).`
                  : allocatedFlash
                    ? 'Rateio aplicado no plano.'
                    : 'Plano de desejos já cabe no liberado.'
            }
            action={
              canApplyAllocation ? (
                <PrimaryButton onClick={handleApplyAllocation}>Aplicar rateio</PrimaryButton>
              ) : undefined
            }
          />
          <WorkflowStep
            done={isCurrentMonthClosed}
            title="5. Fechar ciclo"
            detail={
              isCurrentMonthClosed
                ? `${formatMonthLong(currentMonth)} já fechado — refechar não avança de novo.`
                : 'Grava o snapshot e avança para o próximo ciclo.'
            }
            action={
              isCurrentMonthClosed ? (
                <ConfirmButton onConfirm={handleClose} confirmLabel="Substituir" tone="primary">
                  Refechar
                </ConfirmButton>
              ) : (
                <PrimaryButton onClick={handleClose}>
                  <CalendarCheck size={15} />
                  Fechar o ciclo
                </PrimaryButton>
              )
            }
          />
        </div>

        {accountWantItems.length > 0 && (
          <div className="mt-4 rounded-xl border border-dark-border bg-dark-surface/40 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-dark-text">
                Desejos em conta × liberado
              </span>
              {canApplyAllocation && (
                <SecondaryButton onClick={handleApplyAllocation}>Aplicar rateio</SecondaryButton>
              )}
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {accountWantItems.map((item) => {
                const recommended =
                  allocations.find((row) => row.id === item.id)?.plannedAmount ?? item.planned
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
        )}

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

        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Nota do ciclo (opcional) — ex.: 13º salário, mudança de aluguel"
          className={`${inputClass} mt-4`}
          aria-label="Nota do ciclo"
        />
      </Panel>

      <CashFlowPanel />

      <Panel>
        <PanelHeader
          title="Plano × realizado"
          icon={<ArrowRight size={16} />}
          description="Onde o ciclo saiu diferente do planejado — positivo no delta libera dinheiro; negativo consome a folga."
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
            hint={`Fatura pessoal de gastos de ${formatMonthLong(spendingMonth)} — conta neste ciclo`}
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
            hint="meta do ciclo (sem realizado separado ainda)"
            deltaHint="meta"
          />
          <ComparisonRow
            label="Cartão em formação (próximo ciclo)"
            planned={financialCycle.plannedNextInvoice}
            actual={financialCycle.nextInvoicePersonal}
            hint={`compras de ${formatMonthLong(financialCycle.nextSpendingMonth)} — pagas com o próximo salário`}
            deltaHint="prévia"
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
          ={' '}
          <strong className={shortfall > 0.005 ? 'text-rose-300' : 'text-primary-300'}>
            {formatCurrency(available)}
          </strong>
          . A fatura em formação (~{formatCurrency(financialCycle.reservedForNextInvoice)}) fica
          para o próximo ciclo.
        </p>
      </Panel>

      <ActualsPanel />
    </div>
  )
}
