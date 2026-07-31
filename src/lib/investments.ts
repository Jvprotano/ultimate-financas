import type {
  AssetClassSummary,
  EmergencyFundState,
  HoldingSummary,
  InvestmentAssetClass,
  InvestmentHolding,
  InvestmentsSummary,
  LedgerEntry,
} from '../types'
import { DEFAULT_INVESTMENT_CLASSES } from '../types/constants'
import { finiteNumber, ledgerBalance, normalizeLedger, nowIso, uid } from './shared'

const DAY_MS = 24 * 60 * 60 * 1000
/** Abaixo disso, anualizar transforma ruído de dias em "retorno" de três dígitos. */
const MIN_DAYS_FOR_ANNUALIZED = 60

// ---------------------------------------------------------------------------
// Rentabilidade anualizada (TIR sobre fluxos de caixa irregulares)
// ---------------------------------------------------------------------------

interface CashFlow {
  /** Negativo = dinheiro que saiu do bolso (aporte). */
  amount: number
  time: number
}

function netPresentValue(flows: CashFlow[], rate: number, start: number): number {
  return flows.reduce((sum, flow) => {
    const years = (flow.time - start) / (365 * DAY_MS)
    return sum + flow.amount / Math.pow(1 + rate, years)
  }, 0)
}

/**
 * Retorno anualizado de uma posição a partir das datas dos aportes e do valor de
 * mercado de hoje. Resolve a TIR por bisseção — sem sinal trocado (ou com
 * histórico curto demais) devolve null em vez de um número sem sentido.
 */
export function annualizedReturn(transactions: LedgerEntry[], marketValue: number): number | null {
  if (transactions.length === 0 || marketValue <= 0) return null

  const now = Date.now()
  const flows: CashFlow[] = []
  for (const tx of transactions) {
    const time = new Date(tx.date).getTime()
    if (Number.isNaN(time)) return null
    flows.push({ amount: -tx.amount, time })
  }

  const start = Math.min(...flows.map((flow) => flow.time))
  if (now - start < MIN_DAYS_FOR_ANNUALIZED * DAY_MS) return null
  flows.push({ amount: marketValue, time: now })

  let low = -0.9999
  let high = 10
  let npvLow = netPresentValue(flows, low, start)
  let npvHigh = netPresentValue(flows, high, start)
  if (npvLow * npvHigh > 0) return null

  for (let i = 0; i < 80; i += 1) {
    const mid = (low + high) / 2
    const npvMid = netPresentValue(flows, mid, start)
    if (Math.abs(npvMid) < 0.01) return mid * 100
    if (npvLow * npvMid < 0) {
      high = mid
      npvHigh = npvMid
    } else {
      low = mid
      npvLow = npvMid
    }
  }
  void npvHigh

  return ((low + high) / 2) * 100
}

// ---------------------------------------------------------------------------
// Normalização
// ---------------------------------------------------------------------------

/**
 * A reserva é um livro-razão: o saldo é sempre a soma das transações. Saldos
 * antigos (que só tinham `current`) são migrados de forma não destrutiva para
 * uma única transação "Saldo inicial" — com id/data determinísticos para a
 * normalização ser estável entre renders.
 */
export function normalizeEmergencyFund(
  raw: Partial<EmergencyFundState> | undefined,
  seedId = 'ef-initial',
  seedDate = nowIso(),
): EmergencyFundState {
  const targetMonths = Math.max(1, Math.round(finiteNumber(raw?.targetMonths, 6)))
  let transactions = normalizeLedger(raw?.transactions, seedDate)

  const legacyCurrent = Math.max(0, finiteNumber(raw?.current))
  if (transactions.length === 0 && legacyCurrent > 0) {
    transactions = [{ id: seedId, amount: legacyCurrent, date: seedDate, note: 'Saldo inicial' }]
  }

  return { current: Math.max(0, ledgerBalance(transactions)), targetMonths, transactions }
}

export function normalizeHolding(raw: Partial<InvestmentHolding> | undefined): InvestmentHolding {
  return {
    id: raw?.id || uid(),
    name: raw?.name?.trim() || 'Posição',
    assetClassId: raw?.assetClassId || 'outros',
    institution: raw?.institution?.trim() || undefined,
    marketValue: Math.max(0, finiteNumber(raw?.marketValue)),
    transactions: normalizeLedger(raw?.transactions),
  }
}

export function normalizeAssetClass(
  raw: Partial<InvestmentAssetClass> | undefined,
  index = 0,
): InvestmentAssetClass {
  return {
    id: raw?.id || uid(),
    name: raw?.name?.trim() || `Classe ${index + 1}`,
    color:
      raw?.color || DEFAULT_INVESTMENT_CLASSES[index % DEFAULT_INVESTMENT_CLASSES.length].color,
  }
}

// ---------------------------------------------------------------------------
// Agregação
// ---------------------------------------------------------------------------

/** O que vem de fora do módulo de investimentos e muda a leitura do patrimônio. */
export interface BalanceSheetInput {
  /** Saldo devedor com bem cadastrado do outro lado (financiamento). */
  securedLiabilities?: number
  /** Valor de mercado dos bens. */
  physicalAssets?: number
}

export function calculateInvestmentsSummary(
  holdings: InvestmentHolding[],
  classes: InvestmentAssetClass[],
  reserveBalance = 0,
  goalsBalance = 0,
  liabilities = 0,
  balanceSheet: BalanceSheetInput = {},
): InvestmentsSummary {
  const holdingSummaries: HoldingSummary[] = holdings.map((holding) => {
    const invested = ledgerBalance(holding.transactions)
    const gain = holding.marketValue - invested
    return {
      ...holding,
      invested,
      gain,
      gainPct: invested > 0 ? (gain / invested) * 100 : 0,
      annualizedPct: annualizedReturn(holding.transactions, holding.marketValue),
    }
  })

  const totalMarketValue = holdingSummaries.reduce((sum, h) => sum + h.marketValue, 0)
  const totalInvested = holdingSummaries.reduce((sum, h) => sum + h.invested, 0)
  const totalGain = totalMarketValue - totalInvested
  // Reserva e metas são dinheiro seu. Em `goalsBalance` entra só o livro-razão
  // das metas — o que uma meta de patrimônio engloba já está em
  // `totalMarketValue`/`reserveBalance`.
  const financialAssets = totalMarketValue + reserveBalance + goalsBalance

  const physicalAssets = Math.max(0, balanceSheet.physicalAssets ?? 0)
  // Garantida nunca passa do total: o saldo do financiamento é o mesmo saldo.
  const securedLiabilities = Math.min(liabilities, Math.max(0, balanceSheet.securedLiabilities ?? 0))
  const unsecuredLiabilities = liabilities - securedLiabilities

  const grossAssets = financialAssets + physicalAssets
  const netWorth = grossAssets - liabilities
  // O número que responde "quanto dinheiro eu terei": a casa não paga a conta
  // do mês e o financiamento dela já é custo fixo — os dois saem daqui.
  const financialNetWorth = financialAssets - unsecuredLiabilities

  // Classes com posições (na ordem cadastrada) seguidas de eventuais órfãs.
  const orphanClassIds = holdingSummaries
    .map((h) => h.assetClassId)
    .filter((id) => !classes.some((c) => c.id === id))
  const orderedClasses: InvestmentAssetClass[] = [
    ...classes,
    ...Array.from(new Set(orphanClassIds)).map((id, index) => ({
      id,
      name: 'Sem classe',
      color: DEFAULT_INVESTMENT_CLASSES[index % DEFAULT_INVESTMENT_CLASSES.length].color,
    })),
  ]

  const classSummaries: AssetClassSummary[] = orderedClasses
    .map((assetClass) => {
      const classHoldings = holdingSummaries.filter((h) => h.assetClassId === assetClass.id)
      const marketValue = classHoldings.reduce((sum, h) => sum + h.marketValue, 0)
      const invested = classHoldings.reduce((sum, h) => sum + h.invested, 0)
      const gain = marketValue - invested
      return {
        id: assetClass.id,
        name: assetClass.name,
        color: assetClass.color,
        marketValue,
        invested,
        gain,
        gainPct: invested > 0 ? (gain / invested) * 100 : 0,
        // A alocação é medida sobre o patrimônio *financeiro*: um imóvel não se
        // rebalanceia, e dividir pelo líquido (que pode ser pequeno ou
        // negativo) daria fatias sem sentido.
        allocationPct: financialAssets > 0 ? (marketValue / financialAssets) * 100 : 0,
        holdings: classHoldings,
      }
    })
    .filter((summary) => summary.holdings.length > 0)

  return {
    totalMarketValue,
    totalInvested,
    totalGain,
    totalGainPct: totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0,
    financialAssets,
    physicalAssets,
    grossAssets,
    liabilities,
    securedLiabilities,
    unsecuredLiabilities,
    financialNetWorth,
    netWorth,
    reserveBalance,
    goalsBalance,
    classes: classSummaries,
  }
}
