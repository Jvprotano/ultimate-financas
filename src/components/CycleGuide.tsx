import { AlertTriangle, CalendarDays, CreditCard, ReceiptText } from 'lucide-react'
import { formatCurrency, formatMonthLong } from '../lib/format'
import { useFinancasStore } from '../context/financasStore'

function currentMonthKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatToday(now = new Date()) {
  return now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

/** Guia operacional do ciclo orientado à fatura usada no fechamento mensal. */
export function CycleGuide() {
  const { activeCycle, actuals, cards, cardCycleAccounting } = useFinancasStore()
  const now = new Date()
  const calendarMonth = currentMonthKey(now)
  const isFutureCycle = activeCycle.month > calendarMonth
  const isPastCycle = activeCycle.month < calendarMonth

  const missingActuals = actuals.summary.rows
    .filter((row) => row.actual === null)
    .map((row) => row.cost.name)

  const cardCalendar = cards.accounts.length
    ? cards.accounts
        .map((card) => `${card.name}: fecha dia ${card.closingDay}, vence dia ${card.dueDay}`)
        .join(' · ')
    : 'Cadastre o dia de fechamento e de vencimento de cada cartão.'

  const closingInvoice = cardCycleAccounting.invoiceFormedByCycle
  const listedPersonal = cardCycleAccounting.spendingThisCycle.spentPersonalTotal
  const prepaidPersonal = Math.max(0, listedPersonal - closingInvoice.personalTotal)

  return (
    <div className="space-y-2.5">
      {(isFutureCycle || isPastCycle) && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-4 py-3 text-sm leading-relaxed text-amber-100/90">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-300" />
          <div>
            <strong className="font-semibold text-amber-200">Confira o ciclo ativo.</strong>{' '}
            Hoje é {formatToday(now)} e o mês civil é {formatMonthLong(calendarMonth)}, mas o ciclo
            ativo está em {formatMonthLong(activeCycle.month)}. Isso pode ser intencional por poucos
            dias enquanto você termina o fechamento anterior. O mês de vencimento da fatura, por
            si só, nunca é motivo para alterar o ciclo.
          </div>
        </div>
      )}

      <div className="rounded-xl border border-dark-border bg-dark-surface/35 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-dark-text">Como funciona este ciclo?</h3>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-dark-text-muted">
              <strong className="text-dark-text">Ciclo {formatMonthLong(activeCycle.month)}</strong>{' '}
              é o mês que você ainda está vivendo ou encerrando. No cartão, a referência é a fatura
              usada para fechar esse ciclo. Por isso uma fatura que vence em{' '}
              <strong className="text-dark-text">{formatMonthLong(closingInvoice.dueMonth)}</strong>{' '}
              pode ser a fatura do fechamento de {formatMonthLong(activeCycle.month)} sem qualquer
              desalinhamento.
            </p>
          </div>
          <span className="rounded-lg border border-dark-border bg-dark-card px-3 py-1.5 text-xs font-medium text-dark-text-secondary">
            Regra: bucket da fatura fecha o ciclo
          </span>
        </div>

        <div className="mt-4 grid gap-2.5 lg:grid-cols-3">
          <div className="rounded-lg bg-dark-card px-3 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-dark-text">
              <ReceiptText size={14} />
              Quais custos entram?
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-dark-text-muted">
              Contas em débito, PIX ou boleto seguem o mês em que vencem. Verbas contínuas como
              supermercado/vale, combustível e lazer seguem o mês em que são usadas. Antes de
              fechar, atualize esses realizados; o que ficar vazio será mostrado na revisão antes
              de usar o valor planejado.
            </p>
          </div>

          <div className="rounded-lg bg-dark-card px-3 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-dark-text">
              <CreditCard size={14} />
              E o cartão?
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-dark-text-muted">
              O banco fecha a fatura conforme o calendário cadastrado: {cardCalendar}. No FinTano,
              tudo que está no bucket dessa fatura permanece no mesmo ciclo, mesmo que a data
              original de uma compra seja do fim do mês anterior. A data da compra não é usada para
              repartir novamente a fatura.
            </p>
          </div>

          <div className="rounded-lg bg-dark-card px-3 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-dark-text">
              <CalendarDays size={14} />
              Quando virar?
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-dark-text-muted">
              Depois do fechamento bancário e da conferência dos últimos custos, abra{' '}
              <strong className="text-dark-text">Revisar fechamento</strong>. Para sua rotina, o
              caminho normal é <strong className="text-dark-text">Fechar ciclo + pagar fatura</strong>.
              Essa ação grava o Histórico, paga a fatura e só então avança o ciclo.
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-primary-500/20 bg-primary-500/[0.05] px-3 py-2.5 text-xs leading-relaxed text-dark-text-secondary">
          <strong className="text-primary-200">Cartão deste fechamento:</strong>{' '}
          {closingInvoice.amountKnown ? (
            <>
              sua parte é <strong className="text-dark-text">{formatCurrency(closingInvoice.personalTotal)}</strong>
              {closingInvoice.total !== null && (
                <>
                  {' '}e o total da fatura é{' '}
                  <strong className="text-dark-text">{formatCurrency(closingInvoice.total)}</strong>
                </>
              )}
              {prepaidPersonal > 0.005 && (
                <>. {formatCurrency(prepaidPersonal)} pessoais já foram antecipados e estão fora do valor a pagar</>
              )}
              .
            </>
          ) : (
            <>o valor ainda não pôde ser reconstruído; confira a aba Cartões antes do fechamento.</>
          )}
        </div>

        <div className="mt-2.5 rounded-lg border border-dark-border-subtle bg-dark-card px-3 py-2.5 text-xs leading-relaxed text-dark-text-muted">
          <strong className="text-dark-text">Antes de fechar:</strong>{' '}
          {missingActuals.length > 0
            ? `há ${missingActuals.length} custo(s) sem realizado informado: ${missingActuals.join(', ')}. A revisão mostrará cada um e, se você prosseguir sem preencher, o valor planejado será congelado como realizado.`
            : 'todos os custos têm realizado informado. A revisão ainda mostrará custos, sua parte da fatura, total da fatura e investimentos antes da confirmação.'}
        </div>
      </div>
    </div>
  )
}
