import type {
  EmergencyFundState,
  FinancialGoal,
  InvestmentHolding,
  LedgerEntry,
} from '../types'
import { holdingPurpose } from './investments'
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
 * A reserva agora usa o mesmo livro-razão das posições. O bucket antigo só é
 * consultado como fallback durante a migração de backups anteriores.
 */
export function calculateMonthlyInvestmentActuals(input: {
  month: string
  emergencyFund: EmergencyFundState
  holdings: InvestmentHolding[]
  goals: FinancialGoal[]
}): MonthlyInvestmentActuals {
  const reserveHoldings = input.holdings.filter(
    (holding) => holdingPurpose(holding) === 'emergency_fund',
  )
  const portfolioHoldings = input.holdings.filter(
    (holding) => holdingPurpose(holding) === 'portfolio',
  )

  const reserveNet =
    reserveHoldings.length > 0
      ? reserveHoldings.reduce(
          (sum, holding) => sum + monthlyLedgerNet(holding.transactions, input.month),
          0,
        )
      : monthlyLedgerNet(input.emergencyFund.transactions, input.month)

  const holdingsNet = portfolioHoldings.reduce(
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
