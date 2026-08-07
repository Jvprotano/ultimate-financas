import type {
  EmergencyFundState,
  FinancialGoal,
  InvestmentHolding,
  LedgerEntry,
} from '../types'
import { normalizeText } from './shared'

export interface MonthlyInvestmentActuals {
  month: string
  reserveNet: number
  holdingsNet: number
  goalsNet: number
  /** Movimentação líquida feita pela conta: aportes − retiradas. */
  directNet: number
}

/**
 * Entradas criadas ao cadastrar um saldo que já existia não são poupança do mês.
 * Elas servem apenas para abrir o livro-razão no saldo correto.
 */
function isOpeningBalance(entry: LedgerEntry) {
  const note = normalizeText(entry.note ?? '')
  return note === 'saldo inicial' || note === 'aporte inicial'
}

function monthlyLedgerNet(entries: LedgerEntry[], month: string) {
  return entries.reduce((sum, entry) => {
    if (!entry.date.startsWith(month) || isOpeningBalance(entry)) return sum
    return sum + entry.amount
  }, 0)
}

/**
 * Quanto realmente foi colocado em patrimônio financeiro no mês, pelo caixa.
 *
 * - soma aportes e subtrai retiradas;
 * - transferências entre reserva/posição/meta tendem a se anular naturalmente;
 * - ignora saldo inicial e marcação a mercado;
 * - previdência descontada em folha é adicionada separadamente pelo cenário,
 *   porque não passa por estes livros-razão.
 */
export function calculateMonthlyInvestmentActuals(input: {
  month: string
  emergencyFund: EmergencyFundState
  holdings: InvestmentHolding[]
  goals: FinancialGoal[]
}): MonthlyInvestmentActuals {
  const reserveNet = monthlyLedgerNet(input.emergencyFund.transactions, input.month)
  const holdingsNet = input.holdings.reduce(
    (sum, holding) => sum + monthlyLedgerNet(holding.transactions, input.month),
    0,
  )
  const goalsNet = input.goals.reduce(
    (sum, goal) => sum + monthlyLedgerNet(goal.transactions, input.month),
    0,
  )

  return {
    month: input.month,
    reserveNet,
    holdingsNet,
    goalsNet,
    directNet: reserveNet + holdingsNet + goalsNet,
  }
}
