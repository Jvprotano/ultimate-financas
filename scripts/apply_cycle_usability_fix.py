from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 match, got {count}")
    return text.replace(old, new, 1)


# ---------------------------------------------------------------------------
# 1. Dedicated next-cycle allocation preview.
# ---------------------------------------------------------------------------
path = Path('src/lib/financialCycle.ts')
text = path.read_text()
addition = r'''

/**
 * Prévia do dinheiro que poderá ser alocado no próximo ciclo.
 *
 * Este número não é o caixa do ciclo que está sendo fechado. Ele responde à
 * pergunta operacional: depois que o próximo salário pagar a fatura formada
 * agora, as contas em conta e o aporte-base, quanto sobra para Desejos e aporte
 * complementar?
 */
export interface AllocationPreviewInput {
  month: string
  paycheck: number
  invoice: number
  costsOnAccount: number
  baseInvestment: number
  extraIncome?: number
  extraExpense?: number
}

export interface AllocationPreview {
  month: string
  paycheck: number
  extraIncome: number
  totalIncome: number
  invoice: number
  costsOnAccount: number
  baseInvestment: number
  extraExpense: number
  committedBeforeAllocation: number
  availableToAllocate: number
  pool: number
  shortfall: number
}

export function calculateAllocationPreview(input: AllocationPreviewInput): AllocationPreview {
  const extraIncome = Math.max(0, input.extraIncome ?? 0)
  const extraExpense = Math.max(0, input.extraExpense ?? 0)
  const totalIncome = input.paycheck + extraIncome
  const committedBeforeAllocation =
    input.invoice + input.costsOnAccount + input.baseInvestment + extraExpense
  const availableToAllocate = totalIncome - committedBeforeAllocation

  return {
    month: input.month,
    paycheck: input.paycheck,
    extraIncome,
    totalIncome,
    invoice: input.invoice,
    costsOnAccount: input.costsOnAccount,
    baseInvestment: input.baseInvestment,
    extraExpense,
    committedBeforeAllocation,
    availableToAllocate,
    pool: Math.max(0, availableToAllocate),
    shortfall: Math.max(0, -availableToAllocate),
  }
}
'''
if 'export function calculateAllocationPreview' not in text:
    text += addition
path.write_text(text)


# ---------------------------------------------------------------------------
# 2. Compose the preview from the invoice that closes the active cycle and the
#    *planned* obligations of the following month. It deliberately ignores the
#    old invoice that happened to be due in the active civil month.
# ---------------------------------------------------------------------------
path = Path('src/hooks/useFinancas.ts')
text = path.read_text()
text = replace_once(
    text,
    "import { calculateFinancialCycle } from '../lib/financialCycle'",
    "import { calculateAllocationPreview, calculateFinancialCycle } from '../lib/financialCycle'",
    'useFinancas financialCycle import',
)
text = replace_once(
    text,
    "import { projectNetWorth } from '../lib/forecast'",
    "import { occurrencesInMonth, projectNetWorth } from '../lib/forecast'",
    'useFinancas forecast import',
)
text = replace_once(
    text,
    "import { maybeCreateAutoBackup } from '../lib/backup'",
    "import { maybeCreateAutoBackup } from '../lib/backup'\nimport { addMonths } from '../lib/shared'",
    'useFinancas shared import',
)
marker = "  const monthlyContribution = useMemo(() => {"
block = r'''  /**
   * O "Liberado para alocar" pertence ao próximo ciclo. Ex.: ao fechar Agosto,
   * usa o salário que financiará Setembro e abate a fatura de Setembro formada
   * por Agosto. O snapshot mantém esse mesmo valor mesmo se a fatura já tiver
   * sido paga antes do fechamento.
   */
  const nextCycleAllocation = useMemo(() => {
    const month = addMonths(activeCycle.month, 1)
    const occurrences = occurrencesInMonth(forecast.events, month)
    const extraIncome = occurrences
      .filter((item) => item.event.kind === 'income')
      .reduce((sum, item) => sum + item.event.amount, 0)
    const extraExpense = occurrences
      .filter((item) => item.event.kind === 'expense')
      .reduce((sum, item) => sum + item.event.amount, 0)

    return calculateAllocationPreview({
      month,
      paycheck: metrics.paycheckInAccount,
      invoice: cardCycleAccounting.invoiceFormedByCycle.personalTotal,
      // Próximo mês ainda não tem realizado: use o plano recorrente, não os
      // valores efetivos do mês que está sendo encerrado.
      costsOnAccount: metrics.costsOnAccount,
      baseInvestment: metrics.directInvestmentTarget,
      extraIncome,
      extraExpense,
    })
  }, [
    activeCycle.month,
    cardCycleAccounting.invoiceFormedByCycle.personalTotal,
    forecast.events,
    metrics.costsOnAccount,
    metrics.directInvestmentTarget,
    metrics.paycheckInAccount,
  ])

'''
if marker not in text:
    raise RuntimeError('useFinancas next allocation insertion marker missing')
text = text.replace(marker, block + marker, 1)
text = replace_once(
    text,
    "    financialCycle,\n    projection,",
    "    financialCycle,\n    nextCycleAllocation,\n    projection,",
    'useFinancas return preview',
)
path.write_text(text)


# ---------------------------------------------------------------------------
# 3. Rebuild Ciclo as a focused operational screen: next-month allocation,
#    actuals, then close. Remove duplicated guide/alerts/cashflow/comparisons.
# ---------------------------------------------------------------------------
closing = r'''import { useState } from 'react'
import {
  AlertTriangle,
  CalendarCheck,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
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
  SecondaryButton,
  StatTile,
} from './ui'
import { formatCurrency, formatMonthLong, inputClass } from '../lib/format'
import { useFinancasStore } from '../context/financasStore'
import { cycleSalaryMonth } from '../lib/activeCycle'

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
            detail={
              missingActualRows.length > 0
                ? `${missingActualRows.length} sem realizado · usarão o plano`
                : 'todos os realizados conferidos'
            }
          />
          <StatTile
            label="Minha parte da fatura"
            value={invoiceKnown ? formatCurrency(closingInvoiceDue) : '—'}
            detail={
              invoiceKnown
                ? `pagar em ${formatMonthLong(cardCycleAccounting.invoiceFormedByCycle.dueMonth)}`
                : 'confira Cartões antes de fechar'
            }
            tone="accent"
          />
          <StatTile
            label="Investido no ciclo"
            value={formatCurrency(investmentActuals.total)}
            detail={`${investmentActuals.savingsRate.toFixed(1)}% da base`}
            tone="positive"
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
'''
Path('src/components/ClosingView.tsx').write_text(closing)


# ---------------------------------------------------------------------------
# 4. Unit tests for the allocation preview. The backup invoice is deliberately
#    the September invoice produced by the August cycle.
# ---------------------------------------------------------------------------
path = Path('src/lib/financialCycle.test.ts')
text = path.read_text()
text = replace_once(
    text,
    "import { calculateFinancialCycle } from './financialCycle'",
    "import { calculateAllocationPreview, calculateFinancialCycle } from './financialCycle'",
    'financialCycle test import',
)
if "describe('calculateAllocationPreview'" not in text:
    text += r'''


describe('calculateAllocationPreview', () => {
  it('usa a fatura formada pelo ciclo atual para calcular o próximo mês', () => {
    const preview = calculateAllocationPreview({
      month: '2026-09',
      paycheck: 8_800,
      invoice: 2_511.64,
      costsOnAccount: 3_000,
      baseInvestment: 1_500,
    })

    expect(preview.month).toBe('2026-09')
    expect(preview.invoice).toBeCloseTo(2_511.64)
    expect(preview.availableToAllocate).toBeCloseTo(1_788.36)
    expect(preview.pool).toBeCloseTo(1_788.36)
    expect(preview.shortfall).toBe(0)
  })

  it('inclui eventos do próximo mês e deixa desejos fora até a alocação', () => {
    const preview = calculateAllocationPreview({
      month: '2026-09',
      paycheck: 8_800,
      invoice: 2_511.64,
      costsOnAccount: 3_000,
      baseInvestment: 1_500,
      extraIncome: 300,
      extraExpense: 100,
    })

    // 8800 + 300 - 2511.64 - 3000 - 1500 - 100
    expect(preview.totalIncome).toBe(9_100)
    expect(preview.committedBeforeAllocation).toBeCloseTo(7_111.64)
    expect(preview.availableToAllocate).toBeCloseTo(1_988.36)
  })

  it('mostra shortfall quando as obrigações do próximo mês excedem as entradas', () => {
    const preview = calculateAllocationPreview({
      month: '2026-09',
      paycheck: 7_000,
      invoice: 3_000,
      costsOnAccount: 3_000,
      baseInvestment: 1_500,
    })

    expect(preview.availableToAllocate).toBe(-500)
    expect(preview.pool).toBe(0)
    expect(preview.shortfall).toBe(500)
  })
})
'''
path.write_text(text)


# ---------------------------------------------------------------------------
# 5. Documentation: record the semantics so this does not drift again.
# ---------------------------------------------------------------------------
path = Path('docs/ciclo-financeiro.md')
text = path.read_text()
section = r'''

## Liberado para alocar

A aba Ciclo não usa mais o caixa do mês que está sendo fechado como “Liberado”. O número é uma **prévia do próximo ciclo**.

Ao fechar Agosto, por exemplo, o FinTano calcula o que poderá ser distribuído em Setembro:

`entradas de Setembro − fatura de Setembro − custos em conta de Setembro − aporte-base − saídas extraordinárias de Setembro`

O resultado fica disponível para **Desejos** (por exemplo, Comer fora e Viagens) e **aporte complementar**.

Regras importantes:

- a fatura abatida é `invoiceFormedByCycle`, isto é, a fatura que o ciclo atual acabou de formar;
- no backup de Agosto/2026, a prévia de Setembro deve abater **R$ 2.511,64**, e não procurar a fatura antiga que venceu em Agosto;
- se a fatura de Setembro for paga antes de Agosto ser fechado, o snapshot preserva os mesmos R$ 2.511,64 e o Liberado **não muda só por causa do pagamento**;
- custos do próximo mês vêm do planejamento recorrente, não dos realizados do mês que acabou;
- Desejos não são abatidos antes do cálculo, porque o objetivo desse número é justamente dizer quanto ainda pode ser alocado entre Desejos e aporte extra;
- se o valor da fatura que financiará o próximo ciclo não for confiável, a UI mostra `—` em vez de exibir um Liberado enganoso.

## Estrutura da aba Ciclo

A aba deve permanecer operacional e curta. A ordem é:

1. identificação do ciclo ativo;
2. **Liberado para alocar no próximo mês**, com a decomposição mínima do cálculo;
3. **Realizado do mês**, para corrigir débito/boleto e verbas variáveis;
4. **Fechamento**, com custos, minha parte da fatura e investimento realizado;
5. revisão final apenas quando o usuário escolher fechar.

Guias extensos, alertas duplicados, fluxo em cinco passos, painel completo de caixa e comparação detalhada Plano × Realizado não ficam mais na tela principal de Ciclo.
'''
if '## Liberado para alocar' not in text:
    text += section
path.write_text(text)

print('cycle usability patch applied')
