import { describe, expect, it } from 'vitest'
import { calculateInvestmentsSummary, normalizeHolding, type FinancialHolding } from './investments'
import { calculateMonthlyInvestmentActuals } from './investmentActuals'
import type { EmergencyFundState, InvestmentAssetClass } from '../types'

const classes: InvestmentAssetClass[] = [
  { id: 'renda-fixa', name: 'Renda Fixa', color: '#1' },
  { id: 'acoes', name: 'Ações', color: '#2' },
]

function position(overrides: Partial<FinancialHolding> = {}): FinancialHolding {
  return normalizeHolding({
    id: 'position',
    name: 'Posição',
    assetClassId: 'renda-fixa',
    marketValue: 1_000,
    transactions: [{ id: 'open', amount: 1_000, date: '2026-07-01T12:00:00.000Z', note: 'Saldo inicial' }],
    ...overrides,
  })
}

const emptyLegacyFund: EmergencyFundState = {
  current: 0,
  targetMonths: 6,
  transactions: [],
}

describe('posições da reserva', () => {
  it('reserva é ativo financeiro, mas não entra na carteira de longo prazo', () => {
    const reserve = position({
      id: 'reserve',
      purpose: 'emergency_fund',
      name: 'CDB liquidez diária',
      marketValue: 2_100,
    })
    const portfolio = position({
      id: 'portfolio',
      purpose: 'portfolio',
      assetClassId: 'acoes',
      marketValue: 3_000,
    })

    const summary = calculateInvestmentsSummary([reserve, portfolio], classes)

    expect(summary.reserveBalance).toBe(2_100)
    expect(summary.totalMarketValue).toBe(3_000)
    expect(summary.financialAssets).toBe(5_100)
    expect(summary.reserveHoldings.map((holding) => holding.id)).toEqual(['reserve'])
    expect(summary.classes).toHaveLength(1)
    expect(summary.classes[0].id).toBe('acoes')
  })

  it('saldo legado não é somado de novo quando já existe posição de reserva', () => {
    const reserve = position({ purpose: 'emergency_fund', marketValue: 2_000 })
    const summary = calculateInvestmentsSummary([reserve], classes, 9_999)

    expect(summary.reserveBalance).toBe(2_000)
    expect(summary.financialAssets).toBe(2_000)
  })

  it('preserva classe, instituição, referência e liquidez da reserva', () => {
    const reserve = normalizeHolding({
      id: 'reserve',
      name: 'CDB Inter',
      assetClassId: 'renda-fixa',
      institution: 'Inter',
      purpose: 'emergency_fund',
      benchmark: '100% CDI',
      liquidity: 'D+0',
      marketValue: 2_000,
      transactions: [],
    })

    expect(reserve).toMatchObject({
      purpose: 'emergency_fund',
      institution: 'Inter',
      benchmark: '100% CDI',
      liquidity: 'D+0',
    })
  })

  it('aporte em posição de reserva entra como reserva realizada, não carteira', () => {
    const reserve = position({
      purpose: 'emergency_fund',
      transactions: [{ id: 'r1', amount: 500, date: '2026-08-05T12:00:00.000Z' }],
      marketValue: 500,
    })
    const portfolio = position({
      id: 'portfolio',
      purpose: 'portfolio',
      transactions: [{ id: 'p1', amount: 300, date: '2026-08-06T12:00:00.000Z' }],
      marketValue: 300,
    })

    const result = calculateMonthlyInvestmentActuals({
      month: '2026-08',
      emergencyFund: emptyLegacyFund,
      holdings: [reserve, portfolio],
      goals: [],
    })

    expect(result.reserveNet).toBe(500)
    expect(result.holdingsNet).toBe(300)
    expect(result.directNet).toBe(800)
  })
})
