import { describe, expect, it } from 'vitest'
import {
  advanceCycleMonth,
  cycleSalaryMonth,
  cycleSpendingMonth,
  defaultActiveCycle,
  normalizeActiveCycle,
  shiftCycleMonth,
} from './activeCycle'

describe('activeCycle', () => {
  it('na primeira carga o ciclo é o mês civil atual', () => {
    const cycle = defaultActiveCycle(new Date(2026, 7, 7)) // 7 ago
    expect(cycle.month).toBe('2026-08')
    expect(cycle.salaryHintDay).toBe(30)
    expect(cycle.cardDueHintDay).toBe(5)
  })

  it('persiste o mês informado e ignora lixo', () => {
    expect(normalizeActiveCycle({ month: '2026-09' }).month).toBe('2026-09')
    expect(normalizeActiveCycle({ month: 'nope' }, new Date(2026, 0, 1)).month).toBe('2026-01')
  })

  it('o cartão acertado e o salário vêm do mês anterior ao ciclo', () => {
    expect(cycleSpendingMonth('2026-08')).toBe('2026-07')
    expect(cycleSalaryMonth('2026-08')).toBe('2026-07')
  })

  it('avança e recua o ciclo sem olhar o calendário', () => {
    expect(advanceCycleMonth('2026-12')).toBe('2027-01')
    expect(shiftCycleMonth('2026-08', -1)).toBe('2026-07')
  })
})
