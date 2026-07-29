import { createContext, useContext } from 'react'
import type { FinancasStore } from '../hooks/useFinancas'

// O contexto e os atalhos de leitura vivem fora do arquivo do Provider para o
// fast refresh continuar funcionando (um módulo, ou só componentes, ou só valores).
export const FinancasContext = createContext<FinancasStore | null>(null)

/** Acesso à loja inteira. Os módulos costumam usar os atalhos abaixo. */
export function useFinancasStore(): FinancasStore {
  const store = useContext(FinancasContext)
  if (!store) throw new Error('useFinancasStore precisa estar dentro de <FinancasProvider>')
  return store
}

export const useScenarioStore = () => useFinancasStore().scenarios
export const useCardsStore = () => useFinancasStore().cards
export const useInvestmentsStore = () => useFinancasStore().investments
export const useHistoryStore = () => useFinancasStore().history
export const useForecastStore = () => useFinancasStore().forecast
export const useMetrics = () => useFinancasStore().metrics
export const useCashFlow = () => useFinancasStore().cashFlow
