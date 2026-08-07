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
 * Guia operacional do ciclo. A regra de negócio é propositalmente simples:
 * ciclo = mês que está sendo vivido. Cartão tem calendário próprio e nunca
 * avança o ciclo financeiro sozinho.
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
    .filter((row) => row.cost.paidWith !== 'card' && row.actual === null)
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
            ativo está em {formatMonthLong(activeCycle.month)}. O ciclo ativo normalmente é o mês
            que você ainda está vivendo e consumindo — não o mês de vencimento da fatura aberta.
          </div>
        </div>
      )}

      <div className="rounded-xl border border-dark-border bg-dark-surface/35 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-dark-text">Quando começa e termina este ciclo?</h3>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-dark-text-muted">
              <strong className="text-dark-text">Ciclo {formatMonthLong(activeCycle.month)}</strong>{' '}
              é o mês que você está vivendo. O salário recebido no fim de{' '}
              {formatMonthLong(previousMonth)} financia este mês. A chegada, o fechamento ou o
              pagamento de uma fatura não muda o ciclo.
            </p>
          </div>
          <span className="rounded-lg border border-dark-border bg-dark-card px-3 py-1.5 text-xs font-medium text-dark-text-secondary">
            Regra: mês vivido = ciclo
          </span>
        </div>

        <div className="mt-4 grid gap-2.5 lg:grid-cols-3">
          <div className="rounded-lg bg-dark-card px-3 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-dark-text">
              <ReceiptText size={14} />
              Quais custos entram?
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-dark-text-muted">
              Contas em débito/boleto entram no ciclo do <strong className="text-dark-text">mês em que vencem</strong>.
              Energia que vence em agosto é custo de agosto, mesmo que o consumo seja de julho.
              Verbas mensais sem vencimento — supermercado/vale, combustível, lazer — entram no
              mês em que são <strong className="text-dark-text">usadas</strong>.
            </p>
          </div>

          <div className="rounded-lg bg-dark-card px-3 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-dark-text">
              <CreditCard size={14} />
              Quando fechar o cartão?
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-dark-text-muted">
              Você <strong className="text-dark-text">não fecha o cartão manualmente</strong> no FinTano.
              O banco fecha na data do cartão: {cardCalendar}. Depois do fechamento, confira/import
              a fatura; marque como paga somente quando o pagamento realmente ocorrer. Isso gira a
              fatura, mas <strong className="text-dark-text">não vira o ciclo</strong>.
            </p>
          </div>

          <div className="rounded-lg bg-dark-card px-3 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-dark-text">
              <CalendarDays size={14} />
              Quando virar o ciclo?
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-dark-text-muted">
              Feche {formatMonthLong(activeCycle.month)} apenas quando o mês terminar e você já
              registrou o que realmente usou nele. Na prática: no fim do último dia do mês ou no
              começo do dia 1º seguinte, depois de atualizar supermercado/vale, combustível e
              demais gastos variáveis. Só então avance para o próximo ciclo.
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-primary-500/20 bg-primary-500/[0.05] px-3 py-2.5 text-xs leading-relaxed text-dark-text-secondary">
          <strong className="text-primary-200">Cartão neste mês:</strong> compras feitas em{' '}
          {formatMonthLong(activeCycle.month)} pertencem ao planejamento de{' '}
          {formatMonthLong(activeCycle.month)}, mesmo que sejam pagas na fatura de{' '}
          {formatMonthLong(cardCycleAccounting.spendingThisCycle.dueMonth)} com o salário seguinte.
        </div>

        <div className="mt-2.5 rounded-lg border border-dark-border-subtle bg-dark-card px-3 py-2.5 text-xs leading-relaxed text-dark-text-muted">
          <strong className="text-dark-text">Antes de fechar o ciclo:</strong>{' '}
          {missingActuals.length > 0
            ? `ainda há ${missingActuals.length} custo(s) sem realizado informado: ${missingActuals.join(', ')}. Se algum deles ainda será usado neste mês, mantenha o ciclo aberto.`
            : 'todos os custos em conta têm realizado informado. Ainda assim, confirme que o mês terminou e que não falta consumo variável a registrar.'}
        </div>
      </div>
    </div>
  )
}
