import { useState } from 'react'
import {
  AlertTriangle,
  CalendarCheck,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { ActualsPanel } from './ActualsPanel'
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
import { cycleSalaryMonth } from '../lib/activeCycle'

function formatPlanComparison(planned: number, actual: number) {
  const delta = actual - planned
  if (Math.abs(delta) <= 0.005) return `planejado ${formatCurrency(planned)} · no planejado`
  return `planejado ${formatCurrency(planned)} · ${formatCurrency(Math.abs(delta))} ${delta > 0 ? 'acima' : 'abaixo'}`
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
    actuals,
    cards,
    cardCycleAccounting,
    investmentActuals,
    nextCycleAllocation,
    closeCurrentMonth,
  } = useFinancasStore()
  const { currentMonth, isCurrentMonthClosed } = history
  const [note, setNote] = useState('')
  const [showCloseReview, setShowCloseReview] = useState(false)

  const missingActualRows = actuals.summary.rows.filter((row) => row.actual === null)
  const closingInvoiceDue = cardCycleAccounting.invoiceFormedByCycle.personalTotal
  const closingInvoiceTotal = cardCycleAccounting.invoiceFormedByCycle.total
  const invoiceKnown = cardCycleAccounting.invoiceFormedByCycle.amountKnown
  const closingInvoiceAlreadyPaid = cardCycleAccounting.invoiceFormedByCycle.paid
  const currentDueMonth = cards.settings.currentDueMonth ?? activeCycle.month
  const canPayClosingInvoiceTogether =
    invoiceKnown &&
    !closingInvoiceAlreadyPaid &&
    currentDueMonth === cardCycleAccounting.invoiceFormedByCycle.dueMonth
  const listedPersonal = cardCycleAccounting.spendingThisCycle.spentPersonalTotal
  const stillDuePersonal = cardCycleAccounting.spendingThisCycle.duePersonalTotal
  const prepaidPersonal = Math.max(0, listedPersonal - stillDuePersonal)
  const salaryMonth = cycleSalaryMonth(activeCycle.month)

  const finishClose = (payInvoice: boolean) => {
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

  if (metrics.availableForBudget <= 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dark-border bg-dark-card px-6 py-16 text-center">
        <h2 className="text-xl font-semibold tracking-tight text-dark-text">Comece pelo salário</h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-dark-text-muted">
          Informe sua renda e seus custos em Planejar para montar o ciclo.
        </p>
        <PrimaryButton className="mt-6" onClick={onGoToPlanning}>
          Ir para Planejar
        </PrimaryButton>
      </div>
    )
  }

  const allocationReliable = invoiceKnown
  const allocationTone = nextCycleAllocation.shortfall > 0.005 ? 'negative' : 'accent'
  const allocationPlanDelta = nextCycleAllocation.afterPlannedWants
  const costsPlanDelta = actuals.summary.effectiveCosts - actuals.summary.plannedCosts
  const invoicePlanDelta = closingInvoiceDue - metrics.plannedOnCard
  const investmentPlanDelta = investmentActuals.total - metrics.totalPlannedInvestment

  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader
          title={`Ciclo ${formatMonthLong(activeCycle.month)}`}
          icon={<CalendarRange size={16} />}
          description={`Atualize os realizados, confira a fatura e feche ${formatMonthLong(activeCycle.month)}. O próximo salário será usado para financiar ${formatMonthLong(nextCycleAllocation.month)}.`}
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
      </Panel>

      <Panel className="border-primary-500/25 bg-primary-500/[0.04]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-primary-300">
              <Sparkles size={12} />
              Liberado para alocar em {formatMonthLong(nextCycleAllocation.month)}
            </span>
            <strong
              className={`mt-1 block text-4xl font-bold leading-tight tracking-tight tabular-nums ${
                nextCycleAllocation.shortfall > 0.005 ? 'text-rose-300' : 'text-primary-300'
              }`}
            >
              {allocationReliable
                ? formatCurrency(
                    nextCycleAllocation.shortfall > 0.005
                      ? -nextCycleAllocation.shortfall
                      : nextCycleAllocation.pool,
                  )
                : '—'}
            </strong>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-dark-text-muted">
              Depois de separar a fatura de {formatMonthLong(nextCycleAllocation.month)}, os custos
              em conta e o aporte-base. Este é o valor que você pode distribuir entre Desejos e
              aporte complementar no próximo mês.
            </p>
            {allocationReliable && (
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <span className="text-dark-text-muted">
                  Desejos planejados fora do cartão{' '}
                  <strong className="font-semibold tabular-nums text-dark-text">
                    {formatCurrency(nextCycleAllocation.plannedWants)}
                  </strong>
                </span>
                <span
                  className={
                    Math.abs(allocationPlanDelta) <= 0.005
                      ? 'font-medium text-dark-text-secondary'
                      : allocationPlanDelta > 0
                        ? 'font-medium text-primary-300'
                        : 'font-medium text-rose-300'
                  }
                >
                  {Math.abs(allocationPlanDelta) <= 0.005
                    ? 'exatamente no planejado'
                    : allocationPlanDelta > 0
                      ? `${formatCurrency(allocationPlanDelta)} além do planejado`
                      : `${formatCurrency(Math.abs(allocationPlanDelta))} abaixo do planejado`}
                </span>
              </div>
            )}
          </div>
          <SecondaryButton onClick={onGoToPlanning}>Ajustar planejamento</SecondaryButton>
        </div>

        {allocationReliable ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Entradas previstas"
              value={formatCurrency(nextCycleAllocation.totalIncome)}
              detail={
                nextCycleAllocation.extraIncome > 0.005
                  ? `${formatCurrency(nextCycleAllocation.paycheck)} de salário + ${formatCurrency(nextCycleAllocation.extraIncome)} extras`
                  : `salário que financia ${formatMonthLong(nextCycleAllocation.month)}`
              }
            />
            <StatTile
              label={`Fatura de ${formatMonthLong(nextCycleAllocation.month)}`}
              value={formatCurrency(nextCycleAllocation.invoice)}
              detail={closingInvoiceAlreadyPaid ? 'já paga, mas já consumiu este caixa' : 'formada pelo ciclo atual'}
            />
            <StatTile
              label="Custos em conta"
              value={formatCurrency(nextCycleAllocation.costsOnAccount)}
              detail="planejamento recorrente do próximo mês"
            />
            <StatTile
              label="Aporte-base"
              value={formatCurrency(nextCycleAllocation.baseInvestment)}
              detail="antes do aporte complementar"
              tone={allocationTone}
            />
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-3 text-xs leading-relaxed text-amber-100/90 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-start gap-2">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-300" />
              A fatura que financiará {formatMonthLong(nextCycleAllocation.month)} ainda não tem um
              valor confiável. O FinTano não mostra um “liberado” incompleto.
            </span>
            <SecondaryButton onClick={onGoToCards}>Conferir cartões</SecondaryButton>
          </div>
        )}

        {allocationReliable && nextCycleAllocation.extraExpense > 0.005 && (
          <p className="mt-3 text-[11px] leading-relaxed text-dark-text-muted">
            A prévia também reserva {formatCurrency(nextCycleAllocation.extraExpense)} de saídas
            extraordinárias previstas para {formatMonthLong(nextCycleAllocation.month)}.
          </p>
        )}
      </Panel>

      <ActualsPanel />

      <Panel>
        <PanelHeader
          title={`Fechamento de ${formatMonthLong(activeCycle.month)}`}
          icon={<CalendarCheck size={16} />}
          description="Só o necessário para congelar o mês no Histórico."
          actions={
            isCurrentMonthClosed ? (
              <ConfirmButton onConfirm={handleReclose} confirmLabel="Substituir" tone="primary">
                Refechar
              </ConfirmButton>
            ) : (
              <PrimaryButton onClick={() => setShowCloseReview(true)}>
                <CalendarCheck size={15} />
                Revisar e fechar
              </PrimaryButton>
            )
          }
        />

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <StatTile
            label="Custos do mês"
            value={formatCurrency(actuals.summary.effectiveCosts)}
            detail={`${formatPlanComparison(actuals.summary.plannedCosts, actuals.summary.effectiveCosts)}${
              missingActualRows.length > 0
                ? ` · ${missingActualRows.length} sem realizado`
                : ''
            }`}
            tone={
              costsPlanDelta > 0.005 ? 'negative' : costsPlanDelta < -0.005 ? 'positive' : 'neutral'
            }
          />
          <StatTile
            label="Minha parte da fatura"
            value={invoiceKnown ? formatCurrency(closingInvoiceDue) : '—'}
            detail={
              invoiceKnown
                ? `${formatPlanComparison(metrics.plannedOnCard, closingInvoiceDue)} · pagar em ${formatMonthLong(cardCycleAccounting.invoiceFormedByCycle.dueMonth)}`
                : 'confira Cartões antes de fechar'
            }
            tone={
              !invoiceKnown
                ? 'neutral'
                : invoicePlanDelta > 0.005
                  ? 'negative'
                  : invoicePlanDelta < -0.005
                    ? 'positive'
                    : 'neutral'
            }
          />
          <StatTile
            label="Investido no ciclo"
            value={formatCurrency(investmentActuals.total)}
            detail={`${formatPlanComparison(metrics.totalPlannedInvestment, investmentActuals.total)} · ${investmentActuals.savingsRate.toFixed(1)}% da base`}
            tone={
              investmentPlanDelta < -0.005
                ? 'negative'
                : investmentPlanDelta > 0.005
                  ? 'positive'
                  : 'neutral'
            }
          />
        </div>

        {showCloseReview && !isCurrentMonthClosed && (
          <div className="mt-4 rounded-xl border border-dark-border-subtle bg-dark-surface/40 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-dark-text">
                  Confirmar {formatMonthLong(activeCycle.month)}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-dark-text-muted">
                  Histórico: custos {formatCurrency(actuals.summary.effectiveCosts)} · fatura pessoal{' '}
                  {invoiceKnown ? formatCurrency(closingInvoiceDue) : 'não recuperada'} · investido{' '}
                  {formatCurrency(investmentActuals.total)}.
                </p>
              </div>
              {closingInvoiceAlreadyPaid && (
                <span className="rounded-lg bg-primary-500/15 px-3 py-1.5 text-xs font-semibold text-primary-300">
                  Fatura de {formatMonthLong(cardCycleAccounting.invoiceFormedByCycle.dueMonth)} já paga
                </span>
              )}
            </div>

            {invoiceKnown && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg bg-dark-card px-3 py-2 text-xs text-dark-text-secondary">
                  <span className="block text-dark-text-muted">Fatura total</span>
                  <strong className="mt-0.5 block text-sm tabular-nums text-dark-text">
                    {closingInvoiceTotal !== null ? formatCurrency(closingInvoiceTotal) : '—'}
                  </strong>
                  {closingInvoiceTotal !== null && (
                    <span className="mt-0.5 block text-[11px] text-dark-text-muted">
                      terceiros {formatCurrency(Math.max(0, closingInvoiceTotal - closingInvoiceDue))}
                    </span>
                  )}
                </div>
                <div className="rounded-lg bg-dark-card px-3 py-2 text-xs text-dark-text-secondary">
                  <span className="block text-dark-text-muted">Antecipado fora da fatura</span>
                  <strong className="mt-0.5 block text-sm tabular-nums text-dark-text">
                    {formatCurrency(prepaidPersonal)}
                  </strong>
                  <span className="mt-0.5 block text-[11px] text-dark-text-muted">
                    não será somado novamente
                  </span>
                </div>
              </div>
            )}

            {missingActualRows.length > 0 && (
              <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.05] px-3 py-2.5 text-xs leading-relaxed text-amber-100/85">
                <strong className="text-amber-200">Usando o planejamento em:</strong>{' '}
                {missingActualRows.map((row) => row.cost.name).join(', ')}.
              </div>
            )}

            {!invoiceKnown && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-500/20 bg-rose-500/[0.05] px-3 py-2.5 text-xs text-rose-100/90">
                <span>Confira a fatura antes de fechar para não gravar um valor incompleto.</span>
                <SecondaryButton onClick={onGoToCards}>Ir para Cartões</SecondaryButton>
              </div>
            )}

            <label className="mt-3 block">
              <span className="mb-1 block text-[11px] uppercase tracking-wider text-dark-text-muted">
                Nota do ciclo (opcional)
              </span>
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="ex.: viagem, bônus, gasto excepcional"
                className={inputClass}
              />
            </label>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <SecondaryButton onClick={() => finishClose(false)}>
                Fechar apenas o ciclo
              </SecondaryButton>
              {canPayClosingInvoiceTogether && (
                <PrimaryButton onClick={() => finishClose(true)}>
                  <CheckCircle2 size={15} />
                  Fechar + pagar fatura ({formatCurrency(closingInvoiceDue)})
                </PrimaryButton>
              )}
              {closingInvoiceAlreadyPaid && (
                <PrimaryButton onClick={() => finishClose(false)}>
                  <CheckCircle2 size={15} />
                  Fechar ciclo — fatura já paga
                </PrimaryButton>
              )}
              <button
                type="button"
                onClick={() => setShowCloseReview(false)}
                className="ml-auto rounded-lg px-3 py-2 text-sm text-dark-text-muted transition-colors hover:text-dark-text"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <p className="mt-4 border-t border-dark-border-subtle pt-3 text-[11px] leading-relaxed text-dark-text-muted">
          Salário recebido no fim de {formatMonthLong(salaryMonth)} financia{' '}
          {formatMonthLong(activeCycle.month)}. A fatura que encerra este ciclo vence em{' '}
          {formatMonthLong(cardCycleAccounting.invoiceFormedByCycle.dueMonth)}; pagar a fatura não
          muda o ciclo por si só.
        </p>
      </Panel>
    </div>
  )
}
