import type { BudgetArea, CreditCardEntry } from '../types'
import { normalizeText } from './shared'

export type ParsedCardEntry = Omit<CreditCardEntry, 'id' | 'cycle'>

const RECURRING_MARKERS = ['sim', 's', 'x', '1', 'true', 'verdadeiro', 'assinatura', 'recorrente']

const AREA_MARKERS: { area: BudgetArea; terms: string[] }[] = [
  { area: 'necessidades', terms: ['necessidade', 'essencial', 'fixo', 'n'] },
  { area: 'desejos', terms: ['desejo', 'lazer', 'supérfluo', 'superfluo', 'd'] },
  { area: 'investimentos', terms: ['investimento', 'invest', 'aporte', 'i'] },
]

export function parseCurrencyLike(value: string) {
  const cleaned = value
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.')
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

export function parseInstallments(description: string) {
  const match = description.match(/(?:^|\s)(\d{1,2})\s*\/\s*(\d{1,2})(?:\s|$)/)
  if (!match) return {}

  const installmentCurrent = Number(match[1])
  const installmentTotal = Number(match[2])
  if (!installmentCurrent || !installmentTotal || installmentCurrent > installmentTotal) return {}

  return { installmentCurrent, installmentTotal }
}

export function buildRemainingAmount(amount: number, current?: number, total?: number) {
  if (!current || !total || current >= total) return 0
  return amount * (total - current)
}

export function stripInstallmentToken(description: string) {
  const cleaned = description
    .replace(/(?:^|\s)(?:parc(?:ela)?\.?\s*)?\(?\d{1,2}\s*\/\s*\d{1,2}\)?(?=\s|$)/i, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*[-–—]\s*$/, '')
    .trim()
  return cleaned || description.trim()
}

function splitSpreadsheetLine(line: string) {
  if (line.includes('\t')) return line.split('\t')
  if (line.includes(';')) return line.split(';')
  return line.split(/\s{2,}/)
}

function detectColumnIndex(headers: string[], candidates: string[]) {
  return headers.findIndex((header) => candidates.some((candidate) => header.includes(candidate)))
}

function parseBudgetArea(raw: string): BudgetArea | undefined {
  const value = normalizeText(raw)
  if (!value) return undefined
  return AREA_MARKERS.find(({ terms }) => terms.some((term) => value === term || value.startsWith(term)))
    ?.area
}

/** Lê linhas coladas do Sheets/Excel e devolve lançamentos prontos. */
export function parseSpreadsheet(text: string): ParsedCardEntry[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (!lines.length) return []

  const firstRow = splitSpreadsheetLine(lines[0]).map(normalizeText)
  const hasHeader = firstRow.some((cell) =>
    ['descricao', 'data', 'cartao', 'fatura', 'e meu'].includes(cell),
  )
  const headers = hasHeader
    ? firstRow
    : ['descricao', 'data', 'cartao', 'fatura', 'e meu', 'restante', 'obs']
  const body = hasHeader ? lines.slice(1) : lines
  const indexes = {
    description: detectColumnIndex(headers, ['descricao', 'nome', 'compra']),
    date: detectColumnIndex(headers, ['data']),
    card: detectColumnIndex(headers, ['cartao', 'banco']),
    amount: detectColumnIndex(headers, ['fatura', 'valor']),
    personal: detectColumnIndex(headers, ['e meu', 'meu']),
    remaining: detectColumnIndex(headers, ['restante', 'antec', 'parcelas']),
    recurring: detectColumnIndex(headers, ['assinatura', 'recorrente']),
    prepaid: detectColumnIndex(headers, ['pago', 'quitado']),
    area: detectColumnIndex(headers, ['area', 'área', 'tipo', 'categoria']),
  }

  const parsedRows: Array<ParsedCardEntry | null> = body.map((line) => {
    const cells = splitSpreadsheetLine(line)
    const description = (cells[indexes.description >= 0 ? indexes.description : 0] ?? '').trim()
    const marker = normalizeText(description)

    if (
      !description ||
      marker.includes('total') ||
      marker.includes('disponivel') ||
      marker.includes('proxima fatura')
    ) {
      return null
    }

    const amount = parseCurrencyLike(cells[indexes.amount >= 0 ? indexes.amount : 3] ?? '')
    const personalRaw = cells[indexes.personal >= 0 ? indexes.personal : 4] ?? ''
    const personalAmount = personalRaw.trim() ? parseCurrencyLike(personalRaw) : amount
    const { installmentCurrent, installmentTotal } = parseInstallments(description)
    const remainingRaw = cells[indexes.remaining >= 0 ? indexes.remaining : 5] ?? ''
    const remainingAmount = remainingRaw.trim()
      ? parseCurrencyLike(remainingRaw)
      : buildRemainingAmount(amount, installmentCurrent, installmentTotal)
    const recurringRaw = indexes.recurring >= 0 ? normalizeText(cells[indexes.recurring] ?? '') : ''
    const isRecurring = RECURRING_MARKERS.includes(recurringRaw)
    const prepaidRaw = indexes.prepaid >= 0 ? normalizeText(cells[indexes.prepaid] ?? '') : ''
    const isPrepaid = RECURRING_MARKERS.includes(prepaidRaw) || prepaidRaw === 'pago'
    const budgetArea = indexes.area >= 0 ? parseBudgetArea(cells[indexes.area] ?? '') : undefined
    const extraText = cells
      .filter(
        (_, cellIndex) =>
          cellIndex >= 6 &&
          cellIndex !== indexes.recurring &&
          cellIndex !== indexes.prepaid &&
          cellIndex !== indexes.area,
      )
      .join(' ')
      .trim()

    if (!amount && !personalAmount) return null

    return {
      description: installmentTotal ? stripInstallmentToken(description) : description,
      purchaseDate: (cells[indexes.date >= 0 ? indexes.date : 1] ?? '').trim(),
      cardName: (cells[indexes.card >= 0 ? indexes.card : 2] ?? 'Cartão').trim() || 'Cartão',
      amount,
      personalAmount,
      remainingAmount,
      budgetArea,
      ownerName: personalAmount < amount ? extraText || 'Outro' : '',
      ownerNote: extraText,
      installmentCurrent,
      installmentTotal,
      isRecurring: isRecurring || undefined,
      isPrepaid: isPrepaid || undefined,
    }
  })

  return parsedRows.filter((entry): entry is ParsedCardEntry => entry !== null)
}
