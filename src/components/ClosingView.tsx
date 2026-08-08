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
import { CycleGuide } from './CycleGuide'
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
import { cycleSalaryMonth, cycleSpendingMonth } from '../lib/activeCycle'
import { allocateWantsToPool, allocationChangesPlan } from '../lib/allocateWants'

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
    cardCycleAccounting,
    investmentActuals,
    scenarios,
    closeCurrentMonth,
  } = useFinancasStore()
  const { currentMonth, isCurrentMonthClosed } = history
  const [note, setNote] = useState('')
  const [allocatedFlash, setAllocatedFlash] = useState(false)
  const [showCloseReview, setShowCloseReview] = useState(false)

  const accountCostRows = actuals.summary.rows.filter((row) => row.cost.paidWith !== 'card')
  const plannedCostsOnAccount = accountCostRows.reduce((sum, row) => sum + row.planned, 0)
  const actualCostsOnAccount = accountCostRows.reduce((sum, row) => sum + row.effective, 0)
  const missingActualRows = actuals.summary.rows.filter((row) => row.actual === null)

  const plannedOnCard = cashFlow.plannedOnCard
  const cardSpendingActual = cardCycleAccounting.spendingThisCycle.spentPersonalTotal
  const competenceStillDue = cardCycleAccounting.spendingThisCycle.duePersonalTotal
  const closingInvoiceDue = cardCycleAccounting.invoiceFormedByCycle.personalTotal
  const invoiceActual = cardCycleAccounting.invoiceThisCycle.personalTotal
  const cardDelta = plannedOnCard - cardSpendingActual
  const salaryMonth = cycleSalaryMonth(activeCycle.month)
  const previousSpendingMonth = cycleSpendingMonth(activeCycle.month)
  const currentDueMonth = cards.settings.currentDueMonth ?? activeCycle.month
  const prepaidInCycle = Math.max(0, cardSpendingActual - competenceStillDue)

  const canPayClosingInvoiceTogether =
    cardCycleAccounting.invoiceFormedByCycle.amountKnown &&
    !cardCycleAccounting.invoiceFormedByCycle.paid &&
    currentDueMonth === cardCycleAccounting.invoiceFormedByCycle.dueMonth
  const closingInvoiceAlreadyPaid = cardCycleAccounting.invoiceFormedByCycle.paid

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

  const finishClose = (payInvoice: boolean) => {
    // O resumo já usa `effective`: faltantes = planejado. Persistimos os faltantes
    // antes de fechar para que o backup deixe explícito o valor congelado.
    actuals.fillFromPlan(currentMonth)
    closeCurrentMonth(currentMonth, note)
    if (payInvoice && canPayClosingInvoiceTogether) cards.payInvoice()
    setNote('')
    setShowCloseReview(false)
  }

  const handleReclose = () => {
    actuals.fillFromPlan(currentMonth)
    closeCurrentMonth(currentMonth, note)
    setNote('')
  }

  const handleApplyAllocation = () => {
    scenarios.applyWantAmounts(allocations)
    setAllocatedFlash(true)
    window.setTimeout(() => setAllocatedFlash(false), 2500)
  }

  if (metrics.availableForBudget <= 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dark-border bg-dark-card px-6 py-16 text-center">
        <h2 className="text-xl font-semibold tracking-tight text-dark-text">Comece pelo salário</h2>
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

  const investmentHint = [
    `folha ${formatCurrency(investmentActuals.payroll)}`,
    `reserva ${formatCurrency(investmentActuals.reserveNet)}`,
    `posições ${formatCurrency(investmentActuals.holdingsNet)}`,
    `metas ${formatCurrency(investmentActuals.goalsNet)}`,
    metrics.employerInvestmentContributions > 0
      ? `empresa ${formatCurrency(metrics.employerInvestmentContributions)} fora da sua taxa`
      : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader
          title={`Ciclo ${formatMonthLong(activeCycle.month)}`}
          icon={<CalendarRange size={16} />}
          description={
            <>
              Salário do fim de {formatMonthLong(salaryMonth)} financia{' '}
              {formatMonthLong(activeCycle.month)}. O gasto no cartão é apurado por competência;
              a fatura completa formada no fechamento vence em{' '}
              {formatMonthLong(cardCycleAccounting.invoiceFormedByCycle.dueMonth)}. No fechamento
              você pode encerrar apenas o ciclo ou encerrar e pagar essa fatura junto.
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
            <span className="block font-medium text-dark-text">Salário que financia o ciclo</span>
            ~dia {activeCycle.cycle.salaryHintDay} de {formatMonthLong(salaryMonth)}
          </div>
          <div className="rounded-lg bg-dark-surface/50 px-3 py-2">
            <span className="block font-medium text-dark-text">Fatura no caixa deste ciclo</span>
            vence em {formatMonthLong(activeCycle.month)} · compras de{' '}
            {formatMonthLong(previousSpendingMonth)}
          </div>
          <div className="rounded-lg bg-dark-surface/50 px-3 py-2">
            <span className="block font-medium text-dark-text">Fatura formada no fechamento</span>
            vence em {formatMonthLong(cardCycleAccounting.invoiceFormedByCycle.dueMonth)} · total{' '}
            {cardCycleAccounting.invoiceFormedByCycle.amountKnown
              ? formatCurrency(closingInvoiceDue)
              : 'não recuperado'}
          </div>
        </div>
      </Panel>

      <CycleGuide />

      {!cardCycleAccounting.invoiceThisCycle.amountKnown && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-4 py-3 text-sm leading-relaxed text-amber-100/90">
          <strong className="font-semibold text-amber-200">Fatura antiga sem snapshot.</strong>{' '}
          O cartão já avançou para {formatMonthLong(currentDueMonth)} e uma versão anterior não
          preservou o valor da fatura que venceu em {formatMonthLong(activeCycle.month)}. Isso não
          é motivo para alterar o ciclo ativo; o novo formato passa a preservar os pagamentos
          seguintes.
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
            ? `Faltam ${formatCurrency(shortfall)} para cobrir a fatura que vence neste ciclo, as contas e o aporte planejado.`
            : 'Depois das obrigações do ciclo, este valor pode ir para desejos ou reforço de aporte.'}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <StepChip
            icon={<Wallet size={13} />}
            label="Renda do ciclo"
            value={formatCurrency(financialCycle.income)}
          />
          <StepChip
            icon={<CreditCard size={13} />}
            label="Fatura que vence no ciclo"
            value={
              cardCycleAccounting.invoiceThisCycle.amountKnown
                ? formatCurrency(financialCycle.invoiceToPay)
                : '—'
            }
          />
          <StepChip
            icon={<Landmark size={13} />}
            label="Custos em conta"
            value={formatCurrency(financialCycle.costsOnAccount)}
          />
          <StepChip
            icon={<PiggyBank size={13} />}
            label="Aporte direto planejado"
            value={formatCurrency(financialCycle.directInvestment)}
          />
        </div>
      </div>

      <CycleAlerts />

      <Panel>
        <PanelHeader
          title="Fluxo do ciclo"
          icon={<ListChecks size={16} />}
          description="Durante o mês você registra o realizado. No fim, a revisão congela os números e pode pagar a fatura completa formada pelo ciclo na mesma ação."
        />
        <div className="mt-3 space-y-2">
          <WorkflowStep
            done={financialCycle.income > 0.005}
            title="1. Receber"
            detail={`${formatCurrency(financialCycle.income)} disponíveis para financiar ${formatMonthLong(activeCycle.month)}.`}
          />
          <WorkflowStep
            done={missingActualRows.length === 0}
            title="2. Atualizar custos realizados"
            detail={
              missingActualRows.length === 0
                ? 'Todos os custos têm valor realizado informado.'
                : `${missingActualRows.length} custo(s) ainda sem realizado. No fechamento, cada um usará o valor planejado e isso será persistido.`
            }
          />
          <WorkflowStep
            done={
              cardCycleAccounting.spendingThisCycle.amountKnown &&
              cardCycleAccounting.spendingThisCycle.unclassifiedPersonal <= 0.005
            }
            title="3. Conferir cartão do mês"
            detail={
              cardCycleAccounting.spendingThisCycle.amountKnown
                ? `${formatCurrency(cardSpendingActual)} de gasto por competência em ${formatMonthLong(activeCycle.month)}. Desses gastos, ${formatCurrency(competenceStillDue)} ainda estão devidos e ${formatCurrency(prepaidInCycle)} já foram antecipados. A fatura completa de ${formatMonthLong(cardCycleAccounting.invoiceFormedByCycle.dueMonth)} está em ${cardCycleAccounting.invoiceFormedByCycle.amountKnown ? formatCurrency(closingInvoiceDue) : 'valor não recuperado'}.`
                : 'Não foi possível reconstruir com segurança o detalhe desta competência; confira Cartões antes de fechar.'
            }
            action={
              !cardCycleAccounting.spendingThisCycle.amountKnown ||
              cardCycleAccounting.spendingThisCycle.unclassifiedPersonal > 0.005 ? (
                <SecondaryButton onClick={onGoToCards}>
                  <CreditCard size={14} />
                  Ir para Cartões
                </SecondaryButton>
              ) : undefined
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
            title="5. Revisar e fechar ciclo"
            detail={
              isCurrentMonthClosed
                ? `${formatMonthLong(currentMonth)} já fechado — refechar substitui o snapshot sem avançar de novo.`
                : `Abra a revisão final de ${formatMonthLong(activeCycle.month)} antes de congelar o histórico e avançar.`
            }
            action={
              isCurrentMonthClosed ? (
                <ConfirmButton onConfirm={handleReclose} confirmLabel="Substituir" tone="primary">
                  Refechar
                </ConfirmButton>
              ) : (
                <PrimaryButton onClick={() => setShowCloseReview(true)}>
                  <CalendarCheck size={15} />
                  Revisar fechamento
                </PrimaryButton>
              )
            }
          />
        </div>

        {showCloseReview && !isCurrentMonthClosed && (
          <div className="mt-4 rounded-xl border border-primary-500/30 bg-primary-500/[0.05] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-dark-text">
                  Fechamento de {formatMonthLong(activeCycle.month)}
                </h3>
                <p className="mt-1 max-w-3xl text-xs leading-relaxed text-dark-text-muted">
                  Este é o snapshot que ficará no Histórico. “Gasto no cartão” é apenas a
                  competência de {formatMonthLong(activeCycle.month)}; “fatura a pagar” é a fatura
                  completa com vencimento em{' '}
                  {formatMonthLong(cardCycleAccounting.invoiceFormedByCycle.dueMonth)} e pode conter
                  lançamentos de outra competência. São leituras diferentes do mesmo cartão.
                </p>
              </div>
              {closingInvoiceAlreadyPaid && (
                <span className="rounded-lg bg-primary-500/15 px-3 py-1.5 text-xs font-semibold text-primary-300">
                  Fatura de {formatMonthLong(cardCycleAccounting.invoiceFormedByCycle.dueMonth)} já paga
                </span>
              )}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile
                label="Custos do ciclo"
                value={formatCurrency(actuals.summary.effectiveCosts)}
                detail={
                  missingActualRows.length
                    ? `${missingActualRows.length} faltante(s) usarão o planejado`
                    : 'todos com realizado informado'
                }
              />
              <StatTile
                label="Gasto no cartão"
                value={formatCurrency(cardSpendingActual)}
                detail={`competência de ${formatMonthLong(activeCycle.month)}${prepaidInCycle > 0.005 ? ` · inclui ${formatCurrency(prepaidInCycle)} antecipados` : ''}`}
                tone="accent"
              />
              <StatTile
                label={`Fatura a pagar em ${formatMonthLong(cardCycleAccounting.invoiceFormedByCycle.dueMonth)}`}
                value={
                  cardCycleAccounting.invoiceFormedByCycle.amountKnown
                    ? formatCurrency(closingInvoiceDue)
                    : '—'
                }
                detail={closingInvoiceAlreadyPaid ? 'já marcada como paga' : 'fatura completa'}
              />
              <StatTile
                label="Investido no ciclo"
                value={formatCurrency(investmentActuals.total)}
                detail={`${investmentActuals.savingsRate.toFixed(1)}% da base`}
                tone="positive"
              />
            </div>

            {missingActualRows.length > 0 && (
              <div className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/[0.07] px-3 py-3">
                <strong className="text-sm font-semibold text-amber-200">
                  Valores não preenchidos
                </strong>
                <p className="mt-1 text-xs leading-relaxed text-amber-100/80">
                  Estes itens serão congelados pelo valor do planejamento:
                </p>
                <div className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                  {missingActualRows.map((row) => (
                    <div
                      key={row.cost.id}
                      className="flex items-center justify-between gap-3 rounded-md bg-dark-card/70 px-2.5 py-1.5 text-xs"
                    >
                      <span className="truncate text-dark-text-secondary">{row.cost.name}</span>
                      <strong className="shrink-0 tabular-nums text-dark-text">
                        {formatCurrency(row.planned)}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!cardCycleAccounting.spendingThisCycle.amountKnown && (
              <div className="mt-3 rounded-lg border border-rose-500/25 bg-rose-500/[0.07] px-3 py-2.5 text-xs leading-relaxed text-rose-100/90">
                A competência do cartão não está completa neste estado legado. Você ainda pode
                fechar somente o ciclo, mas confira a aba Cartões antes de confiar no valor de
                cartão gravado no Histórico.
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <SecondaryButton onClick={() => finishClose(false)}>
                Fechar apenas o ciclo
              </SecondaryButton>
              {canPayClosingInvoiceTogether && (
                <PrimaryButton onClick={() => finishClose(true)}>
                  <CheckCircle2 size={15} />
                  Fechar ciclo + pagar fatura ({formatCurrency(closingInvoiceDue)})
                </PrimaryButton>
              )}
              {closingInvoiceAlreadyPaid && (
                <PrimaryButton onClick={() => finishClose(false)}>
                  <CheckCircle2 size={15} />
                  Fechar ciclo — fatura já paga
                </PrimaryButton>
              )}
              {!canPayClosingInvoiceTogether &&
                !closingInvoiceAlreadyPaid &&
                cardCycleAccounting.invoiceFormedByCycle.amountKnown && (
                  <span className="text-xs leading-relaxed text-dark-text-muted">
                    A fatura aberta atualmente vence em {formatMonthLong(currentDueMonth)}; para
                    pagar junto, ela precisa ser a fatura de{' '}
                    {formatMonthLong(cardCycleAccounting.invoiceFormedByCycle.dueMonth)} formada por
                    este fechamento.
                  </span>
                )}
              <button
                type="button"
                onClick={() => setShowCloseReview(false)}
                className="ml-auto rounded-lg px-3 py-2 text-sm text-dark-text-muted transition-colors hover:text-dark-text"
              >
                Voltar
              </button>
            </div>
          </div>
        )}

        {accountWantItems.length > 0 && (
          <div className="mt-4 rounded-xl border border-dark-border bg-dark-surface/40 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-dark-text">Desejos em conta × liberado</span>
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
            label={`Cartão em ${formatMonthLong(activeCycle.month)}: plano × gasto`}
            value={`${cardDelta >= 0 ? '+' : '−'} ${formatCurrency(Math.abs(cardDelta))}`}
            detail={
              plannedOnCard > 0.005
                ? `plano ${formatCurrency(plannedOnCard)} · gasto ${formatCurrency(cardSpendingActual)}`
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
          description={`Competência de ${formatMonthLong(activeCycle.month)}: compras, parcelas e aportes atribuídos a este mês permanecem neste realizado mesmo que a fatura seja paga antes do fechamento.`}
        />

        <div className="mt-3">
          <div className="grid grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] gap-2 pb-1.5 text-[11px] uppercase tracking-wider text-dark-text-muted sm:gap-3">
            <span>Linha</span>
            <span className="text-right">Plano</span>
            <span className="text-right">Realizado</span>
            <span className="text-right">Delta</span>
          </div>

          <ComparisonRow
            label={`Gasto no cartão em ${formatMonthLong(activeCycle.month)}`}
            planned={plannedOnCard}
            actual={cardSpendingActual}
            hint={`dos gastos desta competência, ${formatCurrency(competenceStillDue)} ainda estão devidos e ${formatCurrency(prepaidInCycle)} foram antecipados; fatura completa de ${formatMonthLong(cardCycleAccounting.invoiceFormedByCycle.dueMonth)}: ${cardCycleAccounting.invoiceFormedByCycle.amountKnown ? formatCurrency(closingInvoiceDue) : '—'}`}
          />
          <ComparisonRow
            label="Custos em conta"
            planned={plannedCostsOnAccount}
            actual={actualCostsOnAccount}
            hint={
              missingActualRows.length === 0
                ? 'todos os custos com realizado informado'
                : `${missingActualRows.length} item(ns) ainda usam o valor planejado`
            }
          />
          <ComparisonRow
            label="Investimentos"
            planned={metrics.totalPlannedInvestment}
            actual={investmentActuals.total}
            hint={`${investmentHint}. Aportes/retiradas são líquidos; saldo inicial e valorização de mercado não contam como aporte.`}
          />
        </div>

        <p className="mt-3 border-t border-dark-border-subtle pt-3 text-xs leading-relaxed text-dark-text-muted">
          O bloco “Liberado” acima continua usando o{' '}
          <strong className="text-dark-text">aporte planejado</strong> para orientar o caixa durante
          o mês. No fechamento, o histórico grava{' '}
          <strong className="text-dark-text">
            {formatCurrency(investmentActuals.total)} efetivamente investidos
          </strong>{' '}
          neste ciclo e uma taxa realizada de {investmentActuals.savingsRate.toFixed(1)}%.
        </p>

        <p className="mt-2 border-t border-dark-border-subtle pt-3 text-xs leading-relaxed text-dark-text-muted">
          Liberado = {formatCurrency(financialCycle.income)} − fatura que vence neste ciclo{' '}
          {cardCycleAccounting.invoiceThisCycle.amountKnown
            ? formatCurrency(invoiceActual)
            : 'valor não recuperado'}{' '}
          − custos {formatCurrency(financialCycle.costsOnAccount)} − aporte planejado{' '}
          {formatCurrency(financialCycle.directInvestment)}
          {financialCycle.extraExpense > 0.005 && (
            <> − saídas do ano {formatCurrency(financialCycle.extraExpense)}</>
          )}{' '}
          ={' '}
          <strong className={shortfall > 0.005 ? 'text-rose-300' : 'text-primary-300'}>
            {formatCurrency(available)}
          </strong>
          . A fatura completa formada neste fechamento vence em{' '}
          {formatMonthLong(cardCycleAccounting.invoiceFormedByCycle.dueMonth)} e está em{' '}
          {cardCycleAccounting.invoiceFormedByCycle.amountKnown
            ? formatCurrency(closingInvoiceDue)
            : 'valor não recuperado'}.
        </p>
      </Panel>

      <ActualsPanel />
    </div>
  )
}
