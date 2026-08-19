import { describe, expect, it } from 'vitest'
import { evaluateBudgetCeiling, evaluateGoalProgress } from './planStatus'

describe('evaluateGoalProgress', () => {
  it('trata uma meta quase atingida como atenção leve', () => {
    expect(evaluateGoalProgress(1_587.8, 1_540)).toEqual({
      tone: 'warning',
      label: 'Quase lá',
    })
  })

  it('reserva o vermelho para uma distância relevante da meta', () => {
    expect(evaluateGoalProgress(1_000, 950).tone).toBe('warning')
    expect(evaluateGoalProgress(1_000, 850).tone).toBe('caution')
    expect(evaluateGoalProgress(1_000, 700).tone).toBe('negative')
    expect(evaluateGoalProgress(1_000, 1_000).tone).toBe('positive')
  })
})

describe('evaluateBudgetCeiling', () => {
  it('escala um estouro pelo tamanho do próprio plano', () => {
    expect(evaluateBudgetCeiling(2_000, 2_080).tone).toBe('warning')
    expect(evaluateBudgetCeiling(2_000, 2_300).tone).toBe('caution')
    expect(evaluateBudgetCeiling(2_000, 2_500).tone).toBe('negative')
  })

  it('mantém verde quando o valor fica dentro do planejado', () => {
    expect(evaluateBudgetCeiling(2_000, 1_900)).toEqual({
      tone: 'positive',
      label: 'Dentro do plano',
    })
  })
})
