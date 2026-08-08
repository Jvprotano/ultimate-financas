from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 match, got {count}")
    return text.replace(old, new, 1)


# ClosingView: remove the old civil-month invoice framing and make the closing
# invoice the single card reference for the monthly review/history.
path = Path('src/components/ClosingView.tsx')
text = path.read_text()
text = replace_once(text, "import { CycleGuide } from './CycleGuide'\n", '', 'ClosingView CycleGuide import')
text = replace_once(
    text,
    "import { cycleSalaryMonth, cycleSpendingMonth } from '../lib/activeCycle'",
    "import { cycleSalaryMonth } from '../lib/activeCycle'",
    'ClosingView activeCycle import',
)
text = replace_once(
    text,
    "  const previousSpendingMonth = cycleSpendingMonth(activeCycle.month)\n",
    '',
    'ClosingView previous month const',
)
text = replace_once(text, "\n      <CycleGuide />\n\n", "\n", 'ClosingView duplicate guide')
text = replace_once(
    text,
    '''        <div className="mt-3 grid gap-2 text-xs leading-relaxed text-dark-text-muted sm:grid-cols-3">
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
            vence em {formatMonthLong(cardCycleAccounting.invoiceFormedByCycle.dueMonth)} · sua parte{' '}
            {cardCycleAccounting.invoiceFormedByCycle.amountKnown
              ? formatCurrency(closingInvoiceDue)
              : 'não recuperada'}
          </div>
        </div>''',
    '''        <div className="mt-3 grid gap-2 text-xs leading-relaxed text-dark-text-muted sm:grid-cols-3">
          <div className="rounded-lg bg-dark-surface/50 px-3 py-2">
            <span className="block font-medium text-dark-text">Salário que financia o ciclo</span>
            ~dia {activeCycle.cycle.salaryHintDay} de {formatMonthLong(salaryMonth)}
          </div>
          <div className="rounded-lg bg-dark-surface/50 px-3 py-2">
            <span className="block font-medium text-dark-text">Minha parte da fatura do ciclo</span>
            {formatCurrency(closingInvoiceDue)} · pagar em{' '}
            {formatMonthLong(cardCycleAccounting.invoiceFormedByCycle.dueMonth)}
          </div>
          <div className="rounded-lg bg-dark-surface/50 px-3 py-2">
            <span className="block font-medium text-dark-text">Total da fatura</span>
            {closingInvoiceTotal !== null ? formatCurrency(closingInvoiceTotal) : 'não recuperado'}
            {closingInvoiceTotal !== null && (
              <> · terceiros {formatCurrency(Math.max(0, closingInvoiceTotal - closingInvoiceDue))}</>
            )}
          </div>
        </div>''',
    'ClosingView top cycle cards',
)
text = replace_once(
    text,
    '''            {!cardCycleAccounting.spendingThisCycle.amountKnown && (
              <div className="mt-3 rounded-lg border border-rose-500/25 bg-rose-500/[0.07] px-3 py-2.5 text-xs leading-relaxed text-rose-100/90">
                A competência do cartão não está completa neste estado legado. Você ainda pode
                fechar somente o ciclo, mas confira a aba Cartões antes de confiar no valor de
                cartão gravado no Histórico.
              </div>
            )}''',
    '''            {!cardCycleAccounting.spendingThisCycle.amountKnown && (
              <div className="mt-3 rounded-lg border border-rose-500/25 bg-rose-500/[0.07] px-3 py-2.5 text-xs leading-relaxed text-rose-100/90">
                Uma versão antiga já girou esta fatura sem preservar a composição do bucket. A
                parte pessoal paga ainda pode existir no snapshot, mas confira a aba Cartões antes
                de corrigir áreas do orçamento de um ciclo passado.
              </div>
            )}''',
    'ClosingView legacy review warning',
)
text = replace_once(
    text,
    "            label={`Cartão em ${formatMonthLong(activeCycle.month)}: plano × gasto`}\n",
    "            label={`Fatura pessoal em ${formatMonthLong(activeCycle.month)}: plano × realizado`}\n",
    'ClosingView compact comparison label',
)
text = replace_once(
    text,
    "                ? `plano ${formatCurrency(plannedOnCard)} · gasto ${formatCurrency(cardSpendingActual)}`\n",
    "                ? `plano ${formatCurrency(plannedOnCard)} · fatura ${formatCurrency(cardSpendingActual)}`\n",
    'ClosingView compact comparison detail',
)
text = replace_once(
    text,
    "          description={`Competência de ${formatMonthLong(activeCycle.month)}: compras, parcelas e aportes atribuídos a este mês permanecem neste realizado mesmo que a fatura seja paga antes do fechamento.`}",
    "          description={`Fechamento de ${formatMonthLong(activeCycle.month)}: no cartão, o realizado é a sua parte da fatura usada para encerrar o ciclo. Pagar antes ou junto do fechamento preserva o mesmo valor.`}",
    'ClosingView plan realized description',
)
text = replace_once(
    text,
    '''          . A fatura completa formada neste fechamento vence em{' '}
          {formatMonthLong(cardCycleAccounting.invoiceFormedByCycle.dueMonth)} e está em{' '}
          {cardCycleAccounting.invoiceFormedByCycle.amountKnown
            ? formatCurrency(closingInvoiceDue)
            : 'valor não recuperado'}.''',
    '''          . A sua parte da fatura que encerra este ciclo vence em{' '}
          {formatMonthLong(cardCycleAccounting.invoiceFormedByCycle.dueMonth)} e está em{' '}
          {cardCycleAccounting.invoiceFormedByCycle.amountKnown
            ? formatCurrency(closingInvoiceDue)
            : 'valor não recuperado'}.''',
    'ClosingView footer invoice wording',
)
path.write_text(text)


# CreditCardManager: keep “Pagar em Setembro”, but describe it as the bucket that
# closes August rather than a date-derived competence.
path = Path('src/components/CreditCardManager.tsx')
text = path.read_text()
text = replace_once(
    text,
    "          description={`Fatura atual: lançamentos atribuídos a ${formatMonthLong(currentSpendingMonth)}, com vencimento em ${formatMonthLong(currentDueMonth)}. O ciclo ativo é ${formatMonthLong(activeCycle.month)} e não precisa ser alinhado ao vencimento. A aba seguinte prepara ${formatMonthLong(nextSpendingMonth)}, com vencimento em ${formatMonthLong(nextDueMonth)}.`}",
    "          description={`Fatura atual: bucket que encerra ${formatMonthLong(currentSpendingMonth)}, com vencimento em ${formatMonthLong(currentDueMonth)}. O ciclo ativo é ${formatMonthLong(activeCycle.month)} e não precisa ser alinhado ao vencimento. A data original de uma compra não redistribui este bucket. A aba seguinte prepara o fechamento de ${formatMonthLong(nextSpendingMonth)}, com vencimento em ${formatMonthLong(nextDueMonth)}.`}",
    'CreditCardManager header description',
)
text = replace_once(
    text,
    "            description={`Fatura com competência principal de ${formatMonthLong(currentSpendingMonth)} e vencimento em ${formatMonthLong(currentDueMonth)}. Marcar como paga preserva a competência dos lançamentos e gira o cartão. Se esta é a fatura formada pelo ciclo que você está encerrando, também é possível pagar junto pela revisão da aba Ciclo.`}",
    "            description={`Fatura que encerra o bucket de ${formatMonthLong(currentSpendingMonth)} e vence em ${formatMonthLong(currentDueMonth)}. Marcar como paga salva o total e a sua parte antes de girar o cartão. Se você está encerrando esse ciclo agora, também pode pagar junto pela revisão da aba Ciclo.`}",
    'CreditCardManager pay description',
)
text = replace_once(
    text,
    '            description="Este bloco segue o ciclo ativo por competência, mesmo se você já pagou a fatura e o cartão girou. A área não cria um gasto novo: ela mostra de qual caixa do plano o gasto do mês saiu."',
    '            description="Este bloco segue a fatura usada para encerrar o ciclo ativo, mesmo se ela já foi paga e o cartão girou. As áreas distribuem apenas a sua parte efetivamente devida; valores antecipados ficam fora para não serem somados duas vezes."',
    'CreditCardManager area description',
)
text = replace_once(
    text,
    '''              Do planejamento de {formatMonthLong(activeCycle.month)}, {formatCurrency(plannedOnCard)}{' '}
              deveriam passar pelo cartão. O gasto pessoal atribuído a este ciclo está em{' '}
              {formatCurrency(cardCycleAccounting.spendingThisCycle.spentPersonalTotal)}; a parte
              ainda devida da fatura formada por ele é{' '}
              {formatCurrency(cardCycleAccounting.spendingThisCycle.duePersonalTotal)}.''',
    '''              Do planejamento de {formatMonthLong(activeCycle.month)}, {formatCurrency(plannedOnCard)}{' '}
              deveriam passar pelo cartão. A sua parte da fatura que encerra este ciclo está em{' '}
              {formatCurrency(cardCycleAccounting.invoiceFormedByCycle.personalTotal)}
              {Math.max(
                0,
                cardCycleAccounting.spendingThisCycle.spentPersonalTotal -
                  cardCycleAccounting.spendingThisCycle.duePersonalTotal,
              ) > 0.005 && (
                <>
                  {' '}· antecipado fora da fatura:{' '}
                  {formatCurrency(
                    Math.max(
                      0,
                      cardCycleAccounting.spendingThisCycle.spentPersonalTotal -
                        cardCycleAccounting.spendingThisCycle.duePersonalTotal,
                    ),
                  )}
                </>
              )}
              .''',
    'CreditCardManager area footer',
)
path.write_text(text)


# Internal comments should describe the same bucket model as the UI.
path = Path('src/hooks/useFinancas.ts')
text = path.read_text()
text = replace_once(
    text,
    '''  /**
   * Cartão tem dois relógios ao mesmo tempo:
   * - caixa: a fatura que vence no ciclo ativo;
   * - competência: as compras/parcelas atribuídas ao ciclo ativo.
   *
   * A competência fica persistida nos lançamentos e também no snapshot da
   * fatura paga, então pagar antes ou depois do fechamento não altera o mês.
   */''',
    '''  /**
   * O cartão mantém o calendário de vencimento separado do ciclo financeiro.
   * A fatura que vence no mês seguinte é o bucket usado para encerrar o ciclo
   * atual; o snapshot do pagamento preserva total e parte pessoal após o giro.
   */''',
    'useFinancas card comment',
)
text = replace_once(
    text,
    '''        // A reserva do próximo caixa usa a fatura completa, não apenas a parte
        // dos gastos cuja competência é o mês ativo.''',
    '''        // A reserva do próximo caixa usa a parte pessoal da fatura que encerra
        // o ciclo ativo.''',
    'useFinancas reserve comment',
)
path.write_text(text)

path = Path('src/components/CycleAlerts.tsx')
text = path.read_text()
text = replace_once(
    text,
    '''  // Alertas de cartão são competência do mês ativo. `cards.summary` acompanha a
  // fatura marcada como current e pode girar para o mês seguinte ao pagar.''',
    '''  // Alertas de cartão seguem o bucket que encerra o ciclo ativo. `cards.summary`
  // acompanha a fatura marcada como current e pode girar ao pagar.''',
    'CycleAlerts comment',
)
path.write_text(text)

print('final invoice-cycle UI cleanup applied')
