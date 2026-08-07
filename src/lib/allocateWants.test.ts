import { describe, expect, it } from 'vitest'
import { allocateWantsToPool, allocationChangesPlan } from './allocateWants'

describe('allocateWantsToPool', () => {
  it('não faz nada sem itens ou pool', () => {
    expect(allocateWantsToPool([], 100)).toEqual([])
    expect(allocateWantsToPool([{ id: 'a', planned: 50 }], 0)).toEqual([])
  })

  it('mantém o plano quando o pool cobre 100%', () => {
    const items = [
      { id: 'a', planned: 400 },
      { id: 'b', planned: 600 },
    ]
    expect(allocateWantsToPool(items, 1_000)).toEqual([
      { id: 'a', plannedAmount: 400 },
      { id: 'b', plannedAmount: 600 },
    ])
    expect(allocationChangesPlan(items, allocateWantsToPool(items, 1_000))).toBe(false)
  })

  it('escala proporcionalmente quando o pool não cobre', () => {
    const items = [
      { id: 'a', planned: 400 },
      { id: 'b', planned: 600 },
    ]
    const result = allocateWantsToPool(items, 500)
    expect(result).toHaveLength(2)
    expect(result[0].plannedAmount + result[1].plannedAmount).toBeCloseTo(500, 1)
    expect(result[0].plannedAmount / result[1].plannedAmount).toBeCloseTo(400 / 600, 1)
    expect(allocationChangesPlan(items, result)).toBe(true)
  })

  it('não infla o plano quando o pool é maior', () => {
    expect(allocateWantsToPool([{ id: 'a', planned: 200 }], 800)).toEqual([
      { id: 'a', plannedAmount: 200 },
    ])
  })
})
