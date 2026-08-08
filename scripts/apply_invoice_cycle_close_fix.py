from pathlib import Path
import re


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 match, got {count}")
    return text.replace(old, new, 1)


def regex_once(text: str, pattern: str, replacement: str, label: str) -> str:
    result, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 regex match, got {count}")
    return result


# useCreditCards: repair any spendingMonth persisted by the previous date-based migration
# and preserve the full invoice total in the paid snapshot.
path = Path('src/hooks/useCreditCards.ts')
text = path.read_text()
text = replace_once(
    text,
    "import { readJson, uid } from '../lib/shared'",
    "import { addMonths, readJson, uid } from '../lib/shared'",
    'useCreditCards shared import',
)
text = replace_once(
    text,
    "function hasStoredSpendingMonth(entry: CreditCardEntry) {\n  return /^\\d{4}-\\d{2}$/.test((entry as EntryWithSpendingMonth).spendingMonth ?? '')\n}",
    "function expectedSpendingMonth(entry: CreditCardEntry, currentDueMonth: string) {\n  return entry.cycle === 'current' ? addMonths(currentDueMonth, -1) : currentDueMonth\n}\n\nfunction hasExpectedSpendingMonth(entry: CreditCardEntry, currentDueMonth: string) {\n  return (entry as EntryWithSpendingMonth).spendingMonth === expectedSpendingMonth(entry, currentDueMonth)\n}",
    'useCreditCards migration helper',
)
text = replace_once(
    text,
    "  // Backups anteriores não tinham competência explícita em cada lançamento.\n  // Persiste a inferência uma única vez para que `current`/`next` possam girar\n  // sem alterar a qual mês aquele gasto pertence.\n  useEffect(() => {\n    if (!Array.isArray(storedEntries) || storedEntries.every(hasStoredSpendingMonth)) return\n    setEntries((prev) => normalizeEntriesForDueMonth(prev, currentDueMonth))\n  }, [currentDueMonth, setEntries, storedEntries])",
    "  // Repara backups antigos e também a migração anterior que tentou inferir o mês\n  // pela data da compra. A fronteira correta é o bucket da fatura: current = ciclo\n  // anterior ao vencimento; next = ciclo do vencimento atual.\n  useEffect(() => {\n    if (\n      !Array.isArray(storedEntries) ||\n      storedEntries.every((entry) => hasExpectedSpendingMonth(entry, currentDueMonth))\n    ) {\n      return\n    }\n    setEntries((prev) => normalizeEntriesForDueMonth(prev, currentDueMonth))\n  }, [currentDueMonth, setEntries, storedEntries])",
    'useCreditCards migration effect',
)
text = replace_once(
    text,
    "    const snapshot = createPaidInvoiceSnapshot({\n      entries,\n      currentDueMonth,\n      personalTotal: paidSummary.currentPersonalTotal,\n    })",
    "    const snapshot = createPaidInvoiceSnapshot({\n      entries,\n      currentDueMonth,\n      total: paidSummary.currentTotal,\n      personalTotal: paidSummary.currentPersonalTotal,\n    })",
    'useCreditCards paid snapshot total',
)
path.write_text(text)


# useFinancas: the historical card number is the personal amount of the invoice that
# closes the cycle, not a date-derived purchase subtotal.
path = Path('src/hooks/useFinancas.ts')
text = path.read_text()
text = replace_once(
    text,
    "        currentPersonalTotal: cards.summary.currentPersonalTotal,\n        nextPersonalTotal: cards.summary.nextPersonalTotal,",
    "        currentTotal: cards.summary.currentTotal,\n        currentPersonalTotal: cards.summary.currentPersonalTotal,\n        nextTotal: cards.summary.nextTotal,\n        nextPersonalTotal: cards.summary.nextPersonalTotal,",
    'useFinancas accounting totals',
)
text = replace_once(
    text,
    "      cards.summary.currentPersonalTotal,\n      cards.summary.nextPersonalTotal,",
    "      cards.summary.currentPersonalTotal,\n      cards.summary.currentTotal,\n      cards.summary.nextPersonalTotal,\n      cards.summary.nextTotal,",
    'useFinancas accounting deps',
)
text = replace_once(
    text,
    "        // Histórico é competência: inclui antecipados porque eles consumiram o\n        // orçamento do mês. O valor efetivamente devido aparece no fechamento.\n        cardPersonalTotal: cardCycleAccounting.spendingThisCycle.spentPersonalTotal,",
    "        // Para o ciclo operacional, Cartão = a minha parte da fatura usada para\n        // encerrar o mês. Antecipados já removidos da fatura não são somados de novo.\n        cardPersonalTotal: cardCycleAccounting.invoiceFormedByCycle.personalTotal,",
    'useFinancas history card semantics',
)
text = replace_once(
    text,
    "      cardCycleAccounting.spendingThisCycle.personalByArea,\n      cardCycleAccounting.spendingThisCycle.spentPersonalTotal,",
    "      cardCycleAccounting.invoiceFormedByCycle.personalTotal,\n      cardCycleAccounting.spendingThisCycle.personalByArea,",
    'useFinancas close deps',
)
path.write_text(text)


# History: label the stored number for what it really is in this workflow.
path = Path('src/components/HistoryView.tsx')
text = path.read_text()
text = text.replace('Gasto no cartão (competência)', 'Fatura do ciclo (minha parte)')
text = text.replace(
    '“Gasto no cartão” é competência do mês e pode diferir do valor da fatura paga quando há\n          antecipações.',
    '“Fatura do ciclo” é a sua parte efetivamente paga na fatura usada para encerrar o mês.\n          Valores antecipados já retirados da fatura não são somados novamente.',
)
text = text.replace('/mês de gasto no cartão', '/mês de fatura pessoal')
text = text.replace(
    'title="Gasto pessoal atribuído por competência ao mês; pode diferir da fatura paga"',
    'title="Sua parte da fatura usada para encerrar o ciclo"',
)
text = text.replace('                  Gasto cartão', '                  Fatura')
text = text.replace(
    'title="Competência do mês; inclui valores antecipados e pode diferir da fatura ainda devida"',
    'title="Sua parte efetivamente devida na fatura que encerrou o ciclo"',
)
path.write_text(text)


# ClosingView: make the closing invoice the primary card number and remove the unrelated
# legacy warning about the invoice that happened to be due in the civil month.
path = Path('src/components/ClosingView.tsx')
text = path.read_text()
text = replace_once(
    text,
    "  const cardSpendingActual = cardCycleAccounting.spendingThisCycle.spentPersonalTotal\n  const competenceStillDue = cardCycleAccounting.spendingThisCycle.duePersonalTotal\n  const closingInvoiceDue = cardCycleAccounting.invoiceFormedByCycle.personalTotal",
    "  const listedPersonalOnCard = cardCycleAccounting.spendingThisCycle.spentPersonalTotal\n  const competenceStillDue = cardCycleAccounting.spendingThisCycle.duePersonalTotal\n  const closingInvoiceDue = cardCycleAccounting.invoiceFormedByCycle.personalTotal\n  const closingInvoiceTotal = cardCycleAccounting.invoiceFormedByCycle.total\n  const cardSpendingActual = closingInvoiceDue",
    'ClosingView primary card values',
)
text = replace_once(
    text,
    "  const prepaidInCycle = Math.max(0, cardSpendingActual - competenceStillDue)",
    "  const prepaidInCycle = Math.max(0, listedPersonalOnCard - competenceStillDue)",
    'ClosingView prepaid value',
)
text = regex_once(
    text,
    r"\n      \{!cardCycleAccounting\.invoiceThisCycle\.amountKnown && \([\s\S]*?\n      \)\}\n",
    "\n",
    'ClosingView old invoice warning',
)
text = replace_once(
    text,
    "              {formatMonthLong(activeCycle.month)}. O gasto no cartão é apurado por competência;\n              a fatura completa formada no fechamento vence em{' '}\n              {formatMonthLong(cardCycleAccounting.invoiceFormedByCycle.dueMonth)}. No fechamento\n              você pode encerrar apenas o ciclo ou encerrar e pagar essa fatura junto.",
    "              {formatMonthLong(activeCycle.month)}. Para o cartão, o ciclo termina com a fatura\n              que está sendo formada agora e vence em{' '}\n              {formatMonthLong(cardCycleAccounting.invoiceFormedByCycle.dueMonth)}. A data original\n              de uma compra não muda o bucket do ciclo. No fechamento você pode encerrar apenas o\n              ciclo ou encerrar e pagar essa fatura junto.",
    'ClosingView header description',
)
text = replace_once(
    text,
    "            vence em {formatMonthLong(cardCycleAccounting.invoiceFormedByCycle.dueMonth)} · total{' '}\n            {cardCycleAccounting.invoiceFormedByCycle.amountKnown\n              ? formatCurrency(closingInvoiceDue)\n              : 'não recuperado'}",
    "            vence em {formatMonthLong(cardCycleAccounting.invoiceFormedByCycle.dueMonth)} · sua parte{' '}\n            {cardCycleAccounting.invoiceFormedByCycle.amountKnown\n              ? formatCurrency(closingInvoiceDue)\n              : 'não recuperada'}",
    'ClosingView header closing invoice tile',
)
text = replace_once(
    text,
    "                ? `${formatCurrency(cardSpendingActual)} de gasto por competência em ${formatMonthLong(activeCycle.month)}. Desses gastos, ${formatCurrency(competenceStillDue)} ainda estão devidos e ${formatCurrency(prepaidInCycle)} já foram antecipados. A fatura completa de ${formatMonthLong(cardCycleAccounting.invoiceFormedByCycle.dueMonth)} está em ${cardCycleAccounting.invoiceFormedByCycle.amountKnown ? formatCurrency(closingInvoiceDue) : 'valor não recuperado'}.`\n                : 'Não foi possível reconstruir com segurança o detalhe desta competência; confira Cartões antes de fechar.'",
    "                ? `Sua parte da fatura que encerra ${formatMonthLong(activeCycle.month)} é ${formatCurrency(closingInvoiceDue)}. A fatura vence em ${formatMonthLong(cardCycleAccounting.invoiceFormedByCycle.dueMonth)}${closingInvoiceTotal !== null ? ` e o total cheio é ${formatCurrency(closingInvoiceTotal)}` : ''}. ${prepaidInCycle > 0.005 ? `${formatCurrency(prepaidInCycle)} já foram antecipados e estão fora do valor a pagar.` : 'Não há valores pessoais antecipados fora da fatura.'}`\n                : 'Não foi possível reconstruir com segurança a fatura deste ciclo; confira Cartões antes de fechar.'",
    'ClosingView workflow card detail',
)
text = replace_once(
    text,
    "                  Este é o snapshot que ficará no Histórico. “Gasto no cartão” é apenas a\n                  competência de {formatMonthLong(activeCycle.month)}; “fatura a pagar” é a fatura\n                  completa com vencimento em{' '}\n                  {formatMonthLong(cardCycleAccounting.invoiceFormedByCycle.dueMonth)} e pode conter\n                  lançamentos de outra competência. São leituras diferentes do mesmo cartão.",
    "                  Este é o snapshot que ficará no Histórico. Para o seu fluxo, “Cartão” é a sua\n                  parte efetivamente devida na fatura que encerra {formatMonthLong(activeCycle.month)}.\n                  Compras com datas anteriores que ficaram nesse bucket continuam nessa fatura;\n                  valores antecipados já retirados dela não são somados novamente.",
    'ClosingView review explanation',
)
text = replace_once(
    text,
    "              <StatTile\n                label=\"Gasto no cartão\"\n                value={formatCurrency(cardSpendingActual)}\n                detail={`competência de ${formatMonthLong(activeCycle.month)}${prepaidInCycle > 0.005 ? ` · inclui ${formatCurrency(prepaidInCycle)} antecipados` : ''}`}\n                tone=\"accent\"\n              />",
    "              <StatTile\n                label=\"Minha parte da fatura\"\n                value={formatCurrency(closingInvoiceDue)}\n                detail={`encerra ${formatMonthLong(activeCycle.month)} · vence em ${formatMonthLong(cardCycleAccounting.invoiceFormedByCycle.dueMonth)}`}\n                tone=\"accent\"\n              />",
    'ClosingView review personal tile',
)
text = replace_once(
    text,
    "              <StatTile\n                label={`Fatura a pagar em ${formatMonthLong(cardCycleAccounting.invoiceFormedByCycle.dueMonth)}`}\n                value={\n                  cardCycleAccounting.invoiceFormedByCycle.amountKnown\n                    ? formatCurrency(closingInvoiceDue)\n                    : '—'\n                }\n                detail={closingInvoiceAlreadyPaid ? 'já marcada como paga' : 'valor ainda devido'}\n              />",
    "              <StatTile\n                label=\"Total da fatura\"\n                value={closingInvoiceTotal !== null ? formatCurrency(closingInvoiceTotal) : '—'}\n                detail={\n                  closingInvoiceAlreadyPaid\n                    ? 'já marcada como paga'\n                    : closingInvoiceTotal !== null\n                      ? `terceiros: ${formatCurrency(Math.max(0, closingInvoiceTotal - closingInvoiceDue))}`\n                      : 'total cheio não preservado'\n                }\n              />",
    'ClosingView review total tile',
)
text = replace_once(
    text,
    "            label={`Gasto no cartão em ${formatMonthLong(activeCycle.month)}`}\n            planned={plannedOnCard}\n            actual={cardSpendingActual}\n            hint={`dos gastos desta competência, ${formatCurrency(competenceStillDue)} ainda estão devidos e ${formatCurrency(prepaidInCycle)} foram antecipados; fatura completa de ${formatMonthLong(cardCycleAccounting.invoiceFormedByCycle.dueMonth)}: ${cardCycleAccounting.invoiceFormedByCycle.amountKnown ? formatCurrency(closingInvoiceDue) : '—'}`}",
    "            label={`Fatura pessoal de ${formatMonthLong(activeCycle.month)}`}\n            planned={plannedOnCard}\n            actual={cardSpendingActual}\n            hint={`vence em ${formatMonthLong(cardCycleAccounting.invoiceFormedByCycle.dueMonth)}${closingInvoiceTotal !== null ? ` · total cheio ${formatCurrency(closingInvoiceTotal)}` : ''}${prepaidInCycle > 0.005 ? ` · ${formatCurrency(prepaidInCycle)} antecipados fora da fatura` : ''}`}",
    'ClosingView plan comparison',
)
path.write_text(text)

print('invoice cycle patch applied')
