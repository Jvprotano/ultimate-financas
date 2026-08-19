import { CheckCircle2 } from 'lucide-react'
import { formatCurrency, formatMonthLong } from '../../lib/format'
import type { CreditCardSummary } from '../../types'
import { Panel, PanelHeader, PrimaryButton, StatTile } from '../ui'

export function InvoicePaymentReview({
  summary,
  currentDueMonth,
  currentSpendingMonth,
  nextDueMonth,
  onConfirm,
  onCancel,
}: {
  summary: CreditCardSummary
  currentDueMonth: string
  currentSpendingMonth: string
  nextDueMonth: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Panel className="border-primary-500/30 bg-primary-500/[0.04]">
      <PanelHeader
        title="Resumo antes de pagar"
        icon={<CheckCircle2 size={16} />}
        description={`Fatura que encerra o bucket de ${formatMonthLong(currentSpendingMonth)} e vence em ${formatMonthLong(currentDueMonth)}. Marcar como paga salva o total e a sua parte antes de girar o cartão.`}
      />
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile label="Total da fatura" value={formatCurrency(summary.currentTotal)} />
        <StatTile label="Minha parte" value={formatCurrency(summary.currentPersonalTotal)} />
        <StatTile label="Não é meu" value={formatCurrency(summary.currentThirdPartyTotal)} />
        <StatTile
          label="Lançamentos"
          value={String(summary.currentEntriesCount)}
          detail={summary.currentPrepaidTotal > 0 ? `${formatCurrency(summary.currentPrepaidTotal)} já pagos fora do total` : undefined}
        />
        <StatTile label={`Próxima: ${formatMonthLong(nextDueMonth)}`} value={formatCurrency(summary.nextTotal)} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <PrimaryButton onClick={onConfirm}>
          <CheckCircle2 size={15} />
          Pagar e abrir próxima fatura
        </PrimaryButton>
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-sm text-dark-text-muted transition-colors hover:text-dark-text">
          Cancelar
        </button>
      </div>
    </Panel>
  )
}
