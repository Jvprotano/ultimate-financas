import { describe, expect, it } from 'vitest'
import { annualizedReturn, calculateInvestmentsSummary, normalizeEmergencyFund } from './investments'
import type { InvestmentAssetClass, InvestmentHolding, LedgerEntry } from '../types'

const classes: InvestmentAssetClass[] = [
  { id: 'renda-fixa', name: 'Renda Fixa', color: '#1' },
  { id: 'acoes', name: 'Ações', color: '#2' },
]

function holding(overrides: Partial<InvestmentHolding> = {}): InvestmentHolding {
  return {
    id: 'h1',
    name: 'CDB',
    assetClassId: 'renda-fixa',
    marketValue: 1_100,
    transactions: [{ id: 't', amount: 1_000, date: '2026-01-01T00:00:00.000Z' }],
    ...overrides,
  }
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

describe('calculateInvestmentsSummary — ativos e patrimônio líquido', () => {
  it('ativos somam investimentos, reserva e o guardado nas metas', () => {
    const summary = calculateInvestmentsSummary([holding()], classes, 4_200, 900)
    expect(summary.grossAssets).toBe(6_200)
    expect(summary.netWorth).toBe(6_200)
    expect(summary.liabilities).toBe(0)
  })

  it('o líquido desconta as dívidas', () => {
    const summary = calculateInvestmentsSummary([holding()], classes, 4_200, 900, 30_000)
    expect(summary.grossAssets).toBe(6_200)
    expect(summary.netWorth).toBe(-23_800)
  })

  it('a alocação é medida sobre os ativos, não sobre o líquido', () => {
    // Com dívida maior que os ativos, dividir pelo líquido daria fatia negativa.
    const summary = calculateInvestmentsSummary(
      [holding({ marketValue: 2_000 })],
      classes,
      2_000,
      0,
      10_000,
    )
    const [rendaFixa] = summary.classes
    expect(rendaFixa.allocationPct).toBe(50)
  })

  it('a soma das alocações fecha 100% quando não há reserva nem metas', () => {
    const summary = calculateInvestmentsSummary(
      [holding({ marketValue: 600 }), holding({ id: 'h2', assetClassId: 'acoes', marketValue: 400 })],
      classes,
    )
    const total = summary.classes.reduce((sum, item) => sum + item.allocationPct, 0)
    expect(total).toBeCloseTo(100, 10)
  })

  it('rendimento é valor de mercado menos aportado', () => {
    const summary = calculateInvestmentsSummary([holding({ marketValue: 1_250 })], classes)
    expect(summary.totalInvested).toBe(1_000)
    expect(summary.totalGain).toBe(250)
    expect(summary.totalGainPct).toBe(25)
  })

  it('classes sem posição não aparecem', () => {
    const summary = calculateInvestmentsSummary([holding()], classes)
    expect(summary.classes.map((item) => item.id)).toEqual(['renda-fixa'])
  })

  it('posição órfã ganha uma classe "Sem classe" em vez de desaparecer', () => {
    const summary = calculateInvestmentsSummary([holding({ assetClassId: 'apagada' })], classes)
    expect(summary.classes).toHaveLength(1)
    expect(summary.classes[0].name).toBe('Sem classe')
    expect(summary.grossAssets).toBe(1_100)
  })

  it('carteira vazia não divide por zero', () => {
    const summary = calculateInvestmentsSummary([], classes)
    expect(summary.grossAssets).toBe(0)
    expect(summary.totalGainPct).toBe(0)
    expect(summary.classes).toEqual([])
  })
})

describe('calculateInvestmentsSummary — bens e dívida garantida', () => {
  // O caso real: casa financiada, pouco dinheiro em conta.
  const balanceSheet = { securedLiabilities: 262_000, physicalAssets: 480_000 }

  it('o financeiro ignora bens e a dívida que os garante', () => {
    const summary = calculateInvestmentsSummary(
      [holding({ marketValue: 34_200 })],
      classes,
      4_200,
      0,
      262_000,
      balanceSheet,
    )
    expect(summary.financialAssets).toBe(38_400)
    expect(summary.unsecuredLiabilities).toBe(0)
    expect(summary.financialNetWorth).toBe(38_400)
  })

  it('o líquido total soma o bem — sem ele, ficava negativo à toa', () => {
    const comBem = calculateInvestmentsSummary(
      [holding({ marketValue: 34_200 })],
      classes,
      4_200,
      0,
      262_000,
      balanceSheet,
    )
    const semBem = calculateInvestmentsSummary(
      [holding({ marketValue: 34_200 })],
      classes,
      4_200,
      0,
      262_000,
    )
    expect(semBem.netWorth).toBe(-223_600)
    expect(comBem.netWorth).toBe(256_400)
  })

  it('dívida sem garantia continua saindo do financeiro', () => {
    const summary = calculateInvestmentsSummary(
      [holding({ marketValue: 34_200 })],
      classes,
      4_200,
      0,
      267_000,
      balanceSheet,
    )
    expect(summary.unsecuredLiabilities).toBe(5_000)
    expect(summary.financialNetWorth).toBe(33_400)
  })

  it('a garantida nunca passa do total devido', () => {
    const summary = calculateInvestmentsSummary([], classes, 0, 0, 1_000, {
      securedLiabilities: 9_999,
    })
    expect(summary.securedLiabilities).toBe(1_000)
    expect(summary.unsecuredLiabilities).toBe(0)
  })

  it('a alocação é medida só sobre o financeiro: imóvel não se rebalanceia', () => {
    const summary = calculateInvestmentsSummary(
      [holding({ marketValue: 1_000 })],
      classes,
      0,
      0,
      0,
      { physicalAssets: 480_000 },
    )
    expect(summary.classes[0].allocationPct).toBe(100)
  })
})

describe('annualizedReturn', () => {
  it('devolve null com histórico curto demais para anualizar', () => {
    const recent: LedgerEntry[] = [{ id: 't', amount: 1_000, date: daysAgo(10) }]
    expect(annualizedReturn(recent, 1_100)).toBeNull()
  })

  it('um ano de 10% dá aproximadamente 10% ao ano', () => {
    const flows: LedgerEntry[] = [{ id: 't', amount: 1_000, date: daysAgo(365) }]
    const result = annualizedReturn(flows, 1_100)
    expect(result).not.toBeNull()
    expect(result!).toBeCloseTo(10, 1)
  })

  it('o mesmo ganho em metade do tempo anualiza para mais', () => {
    const oneYear = annualizedReturn([{ id: 't', amount: 1_000, date: daysAgo(365) }], 1_100)
    const halfYear = annualizedReturn([{ id: 't', amount: 1_000, date: daysAgo(182) }], 1_100)
    expect(halfYear!).toBeGreaterThan(oneYear!)
  })

  it('prejuízo devolve taxa negativa', () => {
    const result = annualizedReturn([{ id: 't', amount: 1_000, date: daysAgo(365) }], 900)
    expect(result!).toBeLessThan(0)
  })

  it('sem aportes ou sem valor de mercado, não há taxa', () => {
    expect(annualizedReturn([], 1_000)).toBeNull()
    expect(annualizedReturn([{ id: 't', amount: 1_000, date: daysAgo(400) }], 0)).toBeNull()
  })

  it('data inválida não vira NaN', () => {
    expect(annualizedReturn([{ id: 't', amount: 1_000, date: 'ontem' }], 1_100)).toBeNull()
  })
})

describe('normalizeEmergencyFund', () => {
  it('o saldo é sempre a soma das transações', () => {
    const fund = normalizeEmergencyFund({
      current: 999,
      targetMonths: 6,
      transactions: [
        { id: 'a', amount: 1_000, date: '2026-01-01T00:00:00.000Z' },
        { id: 'b', amount: -300, date: '2026-02-01T00:00:00.000Z' },
      ],
    })
    expect(fund.current).toBe(700)
  })

  it('saldo antigo sem transações migra para "Saldo inicial"', () => {
    const fund = normalizeEmergencyFund({ current: 4_200, targetMonths: 6, transactions: [] })
    expect(fund.transactions).toHaveLength(1)
    expect(fund.transactions[0].note).toBe('Saldo inicial')
    expect(fund.current).toBe(4_200)
  })

  it('a migração é estável entre chamadas (id e data determinísticos)', () => {
    const first = normalizeEmergencyFund({ current: 100 }, 'seed', '2026-01-01T00:00:00.000Z')
    const second = normalizeEmergencyFund(first, 'seed', '2026-01-01T00:00:00.000Z')
    expect(second.transactions).toEqual(first.transactions)
  })

  it('a meta em meses tem piso de 1', () => {
    expect(normalizeEmergencyFund({ targetMonths: 0 }).targetMonths).toBe(1)
    expect(normalizeEmergencyFund({}).targetMonths).toBe(6)
  })
})
