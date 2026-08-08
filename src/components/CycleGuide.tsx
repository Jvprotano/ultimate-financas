import { AlertTriangle, CalendarDays, CreditCard, ReceiptText } from 'lucide-react'
import { formatMonthLong } from '../lib/format'
import { useFinancasStore } from '../context/financasStore'

function currentMonthKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatToday(now = new Date()) {
  return now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

/**
 * Guia operacional do ciclo. Competência continua seguindo o mês vivido; o
 * fechamento é uma ação explícita e pode ser feito junto do pagamento da fatura
 * formada por esse mês, sem confundir o mês do gasto com o mês do vencimento.
 */
export function CycleGuide() {
  const { activeCycle, actuals, cards, cardCycleAccounting } = useFinancasStore()
  const now = new Date()
  const calendarMonth = currentMonthKey(now)
  const isFutureCycle = activeCycle.month > calendarMonth
  const isPastCycle = activeCycle.month < calendarMonth
  const previousMonth = (() => {
    const [year, month] = activeCycle.month.split('-').map(Number)
    const date = new Date(year, month - 2, 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  })()

  const missingActuals = actuals.summary.rows
    .filter((row) => row.actual === null)
    .map((row) => row.cost.name)

  const cardCalendar = cards.accounts.length
    ? cards.accounts
        .map((card) => `${card.name}: fecha dia ${card.closingDay}, vence dia ${card.dueDay}`)
        .join(' · ')
    : 'Cadastre o dia de fechamento e de vencimento de cada cartão.'

  return (
    <div className="space-y-2.5">
      {(isFutureCycle || isPastCycle) && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-4 py-3 text-sm leading-relaxed text-amber-100/90">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-300" />
          <div>
            <strong className="font-semibold text-amber-200">Confira o ciclo ativo.</strong>{' '}
            Hoje é {formatToday(now)} e o mês civil é {formatMonthLong(calendarMonth)}, mas o ciclo
            ativo está em {formatMonthLong(activeCycle.month)}. Isso pode ser intencional por poucos
            dias enquanto você termina a revisão do mês anterior, mas o vencimento da fatura aberta
            sozinho nunca é motivo para trocar o ciclo.
          </div>
        </div>
      )}

      <div className="rounded-xl border border-dark-border bg-dark-surface/35 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-dark-text">Como funciona este ciclo?</h3>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-dark-text-muted">
              <strong className="text-dark-text">Ciclo {formatMonthLong(activeCycle.month)}</strong>{' '}
              reúne a competência do mês que você está vivendo. O salário recebido no fim de{' '}
              {formatMonthLong(previousMonth)} financia este mês. O ciclo só avança quando você usa
              a ação <strong className="text-dark-text">Fechar ciclo</strong> — nunca só porque o
              cartão fechou, venceu ou foi pago.
            </p>
          </div>
          <span className="rounded-lg border border-dark-border bg-dark-card px-3 py-1.5 text-xs font-medium text-dark-text-secondary">
            Regra: gasto no mês vivido; avanço só no fechamento
          </span>
        </div>

        <div className="mt-4 grid gap-2.5 lg:grid-cols-3">
          <div className="rounded-lg bg-dark-card px-3 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-dark-text">
              <ReceiptText size={14} />
              Quais custos entram?
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-dark-text-muted">
              Contas em débito/boleto entram no ciclo do{' '}
              <strong className="text-dark-text">mês em que vencem</strong>. Energia que vence em
              agosto é custo de agosto, mesmo que o consumo seja de julho. Verbas mensais sem
              vencimento — supermercado/vale, combustível, lazer — entram no mês em que são{' '}
              <strong className="text-dark-text">usadas</strong>.
            </p>
          </div>

          <div className="rounded-lg bg-dark-card px-3 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-dark-text">
              <CreditCard size={14} />
              E o cartão?
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-dark-text-muted">
              Você <strong className="text-dark-text">não fecha a fatura manualmente</strong> no
              FinTano; o banco fecha na data cadastrada: {cardCalendar}. Depois, confira/importa a
              fatura. Compras atribuídas a {formatMonthLong(activeCycle.month)} continuam sendo
              competência desse ciclo mesmo quando vencem em{' '}
              {formatMonthLong(cardCycleAccounting.spendingThisCycle.dueMonth)}.
            </p>
          </div>

          <div className="rounded-lg bg-dark-card px-3 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-dark-text">
              <CalendarDays size={14} />
              Quando virar?
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-dark-text-muted">
              Quando o mês estiver encerrado para você — normalmente depois do fechamento bancário
              da fatura e de atualizar os últimos gastos — clique em{' '}
              <strong className="text-dark-text">Revisar fechamento</strong>. Você poderá fechar só
              o ciclo ou <strong className="text-dark-text">fechar e pagar a fatura formada por ele</strong>{' '}
              na mesma ação. Se isso ocorrer no dia 1º seguinte, mantenha o ciclo anterior ativo até
              terminar a revisão e então avance.
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-primary-500/20 bg-primary-500/[0.05] px-3 py-2.5 text-xs leading-relaxed text-dark-text-secondary">
          <strong className="text-primary-200">Dois números do cartão:</strong> “gasto no cartão” é
          o realizado por competência do ciclo e inclui valores antecipados; “fatura a pagar” é só
          o que ainda é devido no vencimento. Eles podem ser diferentes sem haver erro.
        </div>

        <div className="mt-2.5 rounded-lg border border-dark-border-subtle bg-dark-card px-3 py-2.5 text-xs leading-relaxed text-dark-text-muted">
          <strong className="text-dark-text">Antes de fechar:</strong>{' '}
          {missingActuals.length > 0
            ? `há ${missingActuals.length} custo(s) sem realizado informado: ${missingActuals.join(', ')}. A revisão mostrará cada um e, se você prosseguir sem preencher, o valor planejado será congelado como realizado.`
            : 'todos os custos têm realizado informado. A revisão ainda mostrará custos, cartão, fatura e investimentos antes da confirmação.'}
        </div>
      </div>
    </div>
  )
}
