/** Desejo elegível ao rateio do pool discricionário (já filtrado pela UI). */
export interface AllocatableWant {
  id: string
  planned: number
}

export interface WantAllocation {
  id: string
  plannedAmount: number
}

/**
 * Rateia o pool entre desejos em conta na proporção do plano atual.
 * Nunca infla o plano: se o pool cobre 100%+, devolve os valores planejados.
 * Se o pool não cobre, cada item vira `planned * (pool / total)`.
 */
export function allocateWantsToPool(
  items: AllocatableWant[],
  pool: number,
): WantAllocation[] {
  const eligible = items.filter((item) => item.planned > 0.005)
  if (eligible.length === 0 || pool <= 0.005) return []

  const plannedTotal = eligible.reduce((sum, item) => sum + item.planned, 0)
  if (plannedTotal <= 0.005) return []

  const scale = Math.min(1, pool / plannedTotal)
  if (scale >= 0.999) {
    return eligible.map((item) => ({ id: item.id, plannedAmount: item.planned }))
  }

  const allocations = eligible.map((item) => ({
    id: item.id,
    plannedAmount: Math.round(item.planned * scale * 100) / 100,
  }))

  // Ajuste de centavos: a soma deve bater com o pool arredondado.
  const target = Math.round(pool * 100) / 100
  const allocated = allocations.reduce((sum, item) => sum + item.plannedAmount, 0)
  const drift = Math.round((target - allocated) * 100) / 100
  if (Math.abs(drift) >= 0.01 && allocations.length > 0) {
    allocations[0] = {
      ...allocations[0],
      plannedAmount: Math.max(0, Math.round((allocations[0].plannedAmount + drift) * 100) / 100),
    }
  }

  return allocations
}

/** True se aplicar o rateio mudaria algum valor. */
export function allocationChangesPlan(
  items: AllocatableWant[],
  allocations: WantAllocation[],
): boolean {
  const byId = new Map(items.map((item) => [item.id, item.planned]))
  return allocations.some((item) => Math.abs((byId.get(item.id) ?? 0) - item.plannedAmount) > 0.005)
}
