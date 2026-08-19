export type PlanStatusTone = 'neutral' | 'positive' | 'warning' | 'caution' | 'negative'

export interface PlanStatus {
  tone: PlanStatusTone
  label: string
}

const EPSILON = 0.005

/** Meta de crescimento: chegar ou passar é bom; o déficit é proporcional ao plano. */
export function evaluateGoalProgress(planned: number, actual: number): PlanStatus {
  if (planned <= EPSILON) return { tone: 'neutral', label: 'Sem meta definida' }
  if (actual + EPSILON >= planned) return { tone: 'positive', label: 'Meta atingida' }

  const gapShare = (planned - actual) / planned
  if (gapShare <= 0.05) return { tone: 'warning', label: 'Quase lá' }
  if (gapShare <= 0.2) return { tone: 'caution', label: 'Atenção' }
  return { tone: 'negative', label: 'Bem abaixo' }
}

/** Limite de gasto: ficar dentro é bom; excessos pequenos não viram desastre. */
export function evaluateBudgetCeiling(planned: number, actual: number): PlanStatus {
  if (planned <= EPSILON) {
    return actual <= EPSILON
      ? { tone: 'neutral', label: 'Sem valor planejado' }
      : { tone: 'negative', label: 'Fora do plano' }
  }
  if (actual <= planned + EPSILON) return { tone: 'positive', label: 'Dentro do plano' }

  const excessShare = (actual - planned) / planned
  if (excessShare <= 0.05) return { tone: 'warning', label: 'Pouco acima' }
  if (excessShare <= 0.2) return { tone: 'caution', label: 'Atenção' }
  return { tone: 'negative', label: 'Muito acima' }
}
