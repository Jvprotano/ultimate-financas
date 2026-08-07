import type { ReactNode } from 'react'
import { ArrowRight, CalendarDays, CreditCard, Landmark, PiggyBank } from 'lucide-react'
import { Panel, PanelHeader } from './ui'
import { formatCurrency, formatMonthLong } from '../lib/format'
import { useFinancasStore } from '../context/financasStore'
import { isWantIncludedInCardPlan } from '../lib/scenario'

function StepCard({
  index,
  title,
  value,
  detail,
  tone = 'neutral',
  icon,
}: {
  index: number
  title: string
  value: number
  detail: string
  tone?: 'neutral' | 'accent' | 'warning'
  icon: ReactNode
}) {
  const toneClass =
    tone === 'accent'
      ? 'border-primary-500/25 bg-primary-500/[0.07]'
      : tone === 'warning'
        ? 'border-rose-500/25 bg-rose-500/[0.07]'
        : 'border-dark-border bg-dark-surface/50'

  return (
    <div className={`rounded-xl border p-3 ${toneClass}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-dark-card text-[11px] font-semibold text-dark-text">
          {index}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-dark-text-muted">
            {icon}
            {title}
          </div>
          <strong className="mt-1 block text-lg font-semibold tabular-nums text-dark-text">
            {formatCurrency(value)}
          </strong>
          <p className="mt-1 text-xs leading-relaxed text-dark-text-muted">{detail}</p>
        </div>
      </div>
    </div>
  )
}

export function SalaryClosingPlan() {
  const { cashFlow, financialCycle, scenarios } = useFinancasStore()
  const dueNow = cashFlow.invoiceToPay + cashFlow.costsOnAccount + cashFlow.extraExpense
  const accountWantItems = scenarios.activeScenario.wants.filter(
    (want) =>
      want.paidWith === 'account' &&
      want.plannedAmount > 0 &&
      !isWantIncludedInCardPlan(want, scenarios.activeScenario.wants),
  )
  const accountWantsPlanned = accountWantItems.reduce((sum, want) => sum + want.plannedAmount, 0)
  const roomForAccountWants = Math.max(
    0,
    financialCycle.income -
      dueNow -
      financialCycle.directInvestment -
      financialCycle.reservedForNextInvoice,
  )
  const accountWantsAllowed = Math.min(accountWantsPlanned, roomForAccountWants)
  const accountWantsCut = Math.max(0, accountWantsPlanned - accountWantsAllowed)
  const accountWantsScale =
    accountWantsPlanned > 0 ? Math.min(1, accountWantsAllowed / accountWantsPlanned) : 1

  return (
    <Panel>
      <PanelHeader
        title={`Fechamento do salário para ${formatMonthLong(financialCycle.cashMonth)}`}
        icon={<CalendarDays size={16} />}
        description={
          <>
            Regra adotada: o salário recebido no fim do mês financia o próximo ciclo. A fatura paga
            agora veio de {formatMonthLong(financialCycle.spendingMonth)}, mas sai do caixa de{' '}
            {formatMonthLong(financialCycle.cashMonth)}.
          </>
        }
        actions={
          <span className="text-right">
            <span className="block text-[11px] uppercase tracking-wider text-dark-text-muted">
              Folga final
            </span>
            <strong
              className={`block text-lg font-semibold tabular-nums ${
                financialCycle.shortfall > 0 ? 'text-rose-300' : 'text-primary-300'
              }`}
            >
              {formatCurrency(financialCycle.safeToSpend)}
            </strong>
          </span>
        }
      />

      <div className="mt-4 grid gap-3 lg:grid-cols-4">
        <StepCard
          index={1}
          title="Aporte antecipado"
          value={financialCycle.directInvestment}
          detail="Se você usa a parcela do dia 15 para investir, trate este envelope como já separado antes das contas."
          icon={<PiggyBank size={13} />}
          tone="accent"
        />
        <StepCard
          index={2}
          title="Vencimentos"
          value={dueNow}
          detail={`Fatura anterior, contas em débito/boleto e saídas do ano que vencem em ${formatMonthLong(financialCycle.cashMonth)}.`}
          icon={<Landmark size={13} />}
        />
        <StepCard
          index={3}
          title="Próxima fatura"
          value={financialCycle.reservedForNextInvoice}
          detail="Reserva pelo plano do cartão quando os lançamentos atuais ainda não representam a fatura inteira."
          icon={<CreditCard size={13} />}
        />
        <StepCard
          index={4}
          title="Desejos fora do cartão"
          value={accountWantsAllowed}
          detail={
            accountWantsCut > 0
              ? `O plano pedia ${formatCurrency(accountWantsPlanned)}; faltam ${formatCurrency(accountWantsCut)} para caber.`
              : 'Valor que cabe transferir para caixinhas e gastos fora do cartão.'
          }
          icon={<ArrowRight size={13} />}
          tone={accountWantsCut > 0 ? 'warning' : 'accent'}
        />
      </div>

      {accountWantItems.length > 0 && (
        <div className="mt-4 rounded-xl border border-dark-border bg-dark-surface/40 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-dark-text">
              Transferências recomendadas agora
            </span>
            {accountWantsCut > 0 && (
              <span className="text-xs font-medium text-rose-300">
                reduzir {formatCurrency(accountWantsCut)}
              </span>
            )}
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {accountWantItems.map((want) => {
              const recommended = want.plannedAmount * accountWantsScale
              const postponed = want.plannedAmount - recommended

              return (
                <div key={want.id} className="rounded-lg bg-dark-card px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-medium text-dark-text">
                      {want.name}
                    </span>
                    <strong className="shrink-0 text-sm tabular-nums text-dark-text">
                      {formatCurrency(recommended)}
                    </strong>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-dark-text-muted">
                    <span>planejado {formatCurrency(want.plannedAmount)}</span>
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
    </Panel>
  )
}
