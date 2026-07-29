import { describe, expect, it } from 'vitest'
import { EMPTY_GOAL_CONTEXT, normalizeGoal, summarizeGoals, type GoalContext } from './goals'
import type { FinancialGoal, GoalInclusion } from '../types'

function goal(overrides: Partial<FinancialGoal> = {}): FinancialGoal {
  return normalizeGoal({
    id: 'g1',
    name: 'Meta',
    targetAmount: 9_000,
    color: '#fff',
    transactions: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  })
}

const context: GoalContext = {
  reserveBalance: 4_200,
  investmentsBalance: 1_800,
  classBalances: [{ id: 'renda-fixa', name: 'Renda Fixa', marketValue: 1_800 }],
  goalOwnBalances: { g1: 0, outra: 900 },
  debtBalance: 30_000,
}

describe('summarizeGoals — meta de poupança', () => {
  it('conta só o próprio livro-razão', () => {
    const [summary] = summarizeGoals(
      [goal({ transactions: [{ id: 't', amount: 900, date: '2026-06-01T00:00:00.000Z' }] })],
      context,
    )
    expect(summary.ownBalance).toBe(900)
    expect(summary.includedBalance).toBe(0)
    expect(summary.current).toBe(900)
    expect(summary.includedLabels).toEqual([])
  })

  it('um saldo negativo de livro-razão não vira dívida da meta', () => {
    const [summary] = summarizeGoals(
      [
        goal({
          transactions: [
            { id: 'a', amount: 100, date: '2026-06-01T00:00:00.000Z' },
            { id: 'b', amount: -400, date: '2026-07-01T00:00:00.000Z' },
          ],
        }),
      ],
      context,
    )
    expect(summary.ownBalance).toBe(0)
  })
})

describe('summarizeGoals — meta de patrimônio', () => {
  const includes: GoalInclusion[] = [
    { type: 'reserve' },
    { type: 'investments' },
    { type: 'goals' },
  ]

  it('engloba os saldos que já existem sem guardar nada', () => {
    const [summary] = summarizeGoals([goal({ includes })], context)
    expect(summary.ownBalance).toBe(0)
    // 4.200 de reserva + 1.800 investidos + 900 da outra meta.
    expect(summary.includedBalance).toBe(6_900)
    expect(summary.current).toBe(6_900)
  })

  it('nunca conta a si mesma via "outras metas"', () => {
    const [summary] = summarizeGoals(
      [
        goal({
          includes: [{ type: 'goals' }],
          transactions: [{ id: 't', amount: 500, date: '2026-06-01T00:00:00.000Z' }],
        }),
      ],
      { ...context, goalOwnBalances: { g1: 500, outra: 900 } },
    )
    expect(summary.includedBalance).toBe(900)
    expect(summary.current).toBe(1_400)
  })

  it('a inclusão de dívidas subtrai', () => {
    const [summary] = summarizeGoals(
      [goal({ includes: [...includes, { type: 'debts' }] })],
      context,
    )
    expect(summary.includedBalance).toBe(6_900 - 30_000)
    expect(summary.current).toBe(-23_100)
  })

  it('progresso nunca fica negativo, mesmo com patrimônio líquido negativo', () => {
    const [summary] = summarizeGoals([goal({ includes: [{ type: 'debts' }] })], context)
    expect(summary.current).toBeLessThan(0)
    expect(summary.progress).toBe(0)
  })

  it('progresso satura em 100%', () => {
    const [summary] = summarizeGoals([goal({ targetAmount: 1_000, includes })], context)
    expect(summary.progress).toBe(100)
    expect(summary.isComplete).toBe(true)
  })

  it('"investimentos" absorve as classes: nunca soma as duas', () => {
    const [summary] = summarizeGoals(
      [goal({ includes: [{ type: 'investments' }, { type: 'class', id: 'renda-fixa' }] })],
      context,
    )
    expect(summary.includedBalance).toBe(1_800)
  })

  it('uma classe isolada conta só o saldo dela', () => {
    const [summary] = summarizeGoals(
      [goal({ includes: [{ type: 'class', id: 'renda-fixa' }] })],
      context,
    )
    expect(summary.includedBalance).toBe(1_800)
    expect(summary.includedLabels).toEqual(['Renda Fixa'])
  })

  it('classe inexistente é ignorada em vez de virar NaN', () => {
    const [summary] = summarizeGoals(
      [goal({ includes: [{ type: 'class', id: 'nao-existe' }] })],
      context,
    )
    expect(summary.includedBalance).toBe(0)
  })
})

describe('normalizeGoal', () => {
  it('descarta inclusões duplicadas e desconhecidas', () => {
    const normalized = normalizeGoal({
      includes: [
        { type: 'reserve' },
        { type: 'reserve' },
        { type: 'nope' as never },
        { type: 'class' },
      ],
    })
    expect(normalized.includes).toEqual([{ type: 'reserve' }])
  })

  it('sem inclusões, o campo não existe (em vez de um array vazio)', () => {
    expect(normalizeGoal({ includes: [] }).includes).toBeUndefined()
  })

  it('aceita mês-alvo só no formato AAAA-MM', () => {
    expect(normalizeGoal({ targetMonth: '2026-12' }).targetMonth).toBe('2026-12')
    expect(normalizeGoal({ targetMonth: '12/2026' }).targetMonth).toBeUndefined()
  })
})

describe('suggestedMonthly', () => {
  it('divide o que falta pelos meses restantes, contando o mês corrente', () => {
    // Sem contexto o saldo é zero, então falta o alvo inteiro.
    const target = new Date()
    const month = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`
    const [summary] = summarizeGoals(
      [goal({ targetAmount: 1_200, targetMonth: month })],
      EMPTY_GOAL_CONTEXT,
    )
    // Mês-alvo é o mês corrente: resta uma única chance de aportar.
    expect(summary.monthsLeft).toBe(0)
    expect(summary.suggestedMonthly).toBe(1_200)
  })

  it('sem prazo, não sugere valor mensal', () => {
    const [summary] = summarizeGoals([goal({ targetMonth: undefined })], EMPTY_GOAL_CONTEXT)
    expect(summary.monthsLeft).toBeNull()
    expect(summary.suggestedMonthly).toBe(0)
  })
})
