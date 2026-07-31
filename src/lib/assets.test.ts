import { describe, expect, it } from 'vitest'
import {
  advanceAssetMonth,
  calculateAssetsSummary,
  housingComparison,
  normalizeAsset,
  summarizeAsset,
} from './assets'
import { summarizeDebt } from './debts'
import type { Asset, Debt, DebtSummary } from '../types'

function asset(overrides: Partial<Asset> = {}): Asset {
  return normalizeAsset({
    id: 'casa',
    name: 'Apartamento',
    kind: 'imovel',
    value: 480_000,
    annualAppreciationPct: 4,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  })
}

function debtSummary(overrides: Partial<Debt> = {}): DebtSummary {
  return summarizeDebt(
    {
      id: 'fin',
      name: 'Financiamento',
      kind: 'financiamento',
      balance: 262_000,
      monthlyRatePct: 0.6,
      installment: 2_180,
      remainingInstallments: 0,
      linkedAssetId: 'casa',
      transactions: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      ...overrides,
    },
    [],
    [asset()],
  )
}

describe('normalizeAsset', () => {
  it('herda a valorização padrão do tipo quando nada é informado', () => {
    expect(normalizeAsset({ kind: 'imovel' }).annualAppreciationPct).toBe(4)
    expect(normalizeAsset({ kind: 'veiculo' }).annualAppreciationPct).toBe(-10)
  })

  it('aceita desvalorização — um carro não sobe de preço', () => {
    expect(normalizeAsset({ annualAppreciationPct: -15 }).annualAppreciationPct).toBe(-15)
  })

  it('aluguel equivalente zero vira ausente, não um zero que engana', () => {
    expect(normalizeAsset({ rentEquivalent: 0 }).rentEquivalent).toBeUndefined()
  })

  it('valor nunca é negativo', () => {
    expect(normalizeAsset({ value: -100 }).value).toBe(0)
  })
})

describe('summarizeAsset', () => {
  it('equity é o valor menos o que ainda é do banco', () => {
    const summary = summarizeAsset(asset(), [debtSummary()])
    expect(summary.linkedDebt).toBe(262_000)
    expect(summary.equity).toBe(218_000)
    expect(summary.equityPct).toBeCloseTo(45.417, 2)
    expect(summary.hasDebt).toBe(true)
  })

  it('bem quitado é inteiramente seu', () => {
    const summary = summarizeAsset(asset(), [])
    expect(summary.equity).toBe(480_000)
    expect(summary.equityPct).toBe(100)
    expect(summary.hasDebt).toBe(false)
  })

  it('dívida já quitada não conta como saldo do bem', () => {
    const summary = summarizeAsset(asset(), [debtSummary({ balance: 0 })])
    expect(summary.linkedDebt).toBe(0)
  })

  it('dívida apontando para outro bem não entra', () => {
    const summary = summarizeAsset(asset({ id: 'carro' }), [debtSummary()])
    expect(summary.linkedDebt).toBe(0)
  })

  it('juros e parcela vêm das dívidas ligadas', () => {
    const summary = summarizeAsset(asset(), [debtSummary()])
    expect(summary.installment).toBe(2_180)
    expect(summary.monthlyInterest).toBeCloseTo(262_000 * 0.006, 6)
  })
})

describe('calculateAssetsSummary', () => {
  it('soma valor, dívida ligada e o que já é seu', () => {
    const summary = calculateAssetsSummary(
      [asset(), asset({ id: 'carro', name: 'Carro', kind: 'veiculo', value: 60_000 })],
      [debtSummary()],
    )
    expect(summary.totalValue).toBe(540_000)
    expect(summary.totalLinkedDebt).toBe(262_000)
    expect(summary.totalEquity).toBe(278_000)
  })

  it('sem bens, tudo é zero', () => {
    const summary = calculateAssetsSummary([], [])
    expect(summary.totalValue).toBe(0)
    expect(summary.totalEquity).toBe(0)
    expect(summary.assets).toHaveLength(0)
  })
})

describe('housingComparison', () => {
  it('a amortização não entra no custo: só o juro é despesa', () => {
    const summary = summarizeAsset(asset({ rentEquivalent: 2_500 }), [debtSummary()])
    const comparison = housingComparison(summary)!

    expect(comparison.monthlyInterest).toBeCloseTo(1_572, 6)
    expect(comparison.amortization).toBeCloseTo(2_180 - 1_572, 6)
    // A parcela inteira é 2.180, mas o custo de morar é bem menor que isso.
    expect(comparison.ownershipCost).toBeLessThan(comparison.installment)
  })

  it('a valorização abate o custo de ser dono', () => {
    const summary = summarizeAsset(asset({ rentEquivalent: 2_500 }), [debtSummary()])
    const comparison = housingComparison(summary)!
    expect(comparison.monthlyAppreciation).toBeGreaterThan(0)
    expect(comparison.ownershipCost).toBeCloseTo(
      comparison.monthlyInterest - comparison.monthlyAppreciation,
      6,
    )
  })

  it('diferença negativa quer dizer que ser dono sai mais barato', () => {
    const summary = summarizeAsset(asset({ rentEquivalent: 2_500 }), [debtSummary()])
    expect(housingComparison(summary)!.difference).toBeLessThan(0)
  })

  it('sem aluguel equivalente informado, não há comparação a fazer', () => {
    const summary = summarizeAsset(asset(), [debtSummary()])
    expect(housingComparison(summary)).toBeNull()
  })

  it('sem parcela, o bem é quitado e a comparação não se aplica', () => {
    const summary = summarizeAsset(asset({ rentEquivalent: 2_500 }), [])
    expect(housingComparison(summary)).toBeNull()
  })
})

describe('advanceAssetMonth', () => {
  it('doze meses de valorização compõem a taxa anual', () => {
    let value = 100_000
    for (let i = 0; i < 12; i += 1) value = advanceAssetMonth(value, 4)
    expect(value).toBeCloseTo(104_000, 6)
  })

  it('desvalorização reduz o valor sem cruzar o zero', () => {
    expect(advanceAssetMonth(50_000, -10)).toBeLessThan(50_000)
    expect(advanceAssetMonth(0, -10)).toBe(0)
  })
})
