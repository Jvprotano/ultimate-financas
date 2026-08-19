import { createContext, useContext, type Context } from 'react'
import type { FinancasStore } from '../hooks/useFinancas'

// O contexto e os atalhos de leitura vivem fora do arquivo do Provider para o
// fast refresh continuar funcionando (um módulo, ou só componentes, ou só valores).
export const FinancasContext = createContext<FinancasStore | null>(null)

type DomainContextMap = {
  scenarios: FinancasStore['scenarios']
  cards: FinancasStore['cards']
  investments: FinancasStore['investments']
  history: FinancasStore['history']
  forecast: FinancasStore['forecast']
  debts: FinancasStore['debts']
  assets: FinancasStore['assets']
  actuals: FinancasStore['actuals']
  metrics: FinancasStore['metrics']
  cashFlow: FinancasStore['cashFlow']
}

export const ScenarioContext = createContext<DomainContextMap['scenarios'] | null>(null)
export const CardsContext = createContext<DomainContextMap['cards'] | null>(null)
export const InvestmentsContext = createContext<DomainContextMap['investments'] | null>(null)
export const HistoryContext = createContext<DomainContextMap['history'] | null>(null)
export const ForecastContext = createContext<DomainContextMap['forecast'] | null>(null)
export const DebtsContext = createContext<DomainContextMap['debts'] | null>(null)
export const AssetsContext = createContext<DomainContextMap['assets'] | null>(null)
export const ActualsContext = createContext<DomainContextMap['actuals'] | null>(null)
export const MetricsContext = createContext<DomainContextMap['metrics'] | null>(null)
export const CashFlowContext = createContext<DomainContextMap['cashFlow'] | null>(null)

function useDomain<T>(context: Context<T | null>, name: string): T {
  const value = useContext(context)
  if (!value) throw new Error(`${name} precisa estar dentro de <FinancasProvider>`)
  return value
}

/** Acesso à loja inteira. Os módulos costumam usar os atalhos abaixo. */
export function useFinancasStore(): FinancasStore {
  const store = useContext(FinancasContext)
  if (!store) throw new Error('useFinancasStore precisa estar dentro de <FinancasProvider>')
  return store
}

export const useScenarioStore = () => useDomain(ScenarioContext, 'useScenarioStore')
export const useCardsStore = () => useDomain(CardsContext, 'useCardsStore')
export const useInvestmentsStore = () => useDomain(InvestmentsContext, 'useInvestmentsStore')
export const useHistoryStore = () => useDomain(HistoryContext, 'useHistoryStore')
export const useForecastStore = () => useDomain(ForecastContext, 'useForecastStore')
export const useDebtsStore = () => useDomain(DebtsContext, 'useDebtsStore')
export const useAssetsStore = () => useDomain(AssetsContext, 'useAssetsStore')
export const useActualsStore = () => useDomain(ActualsContext, 'useActualsStore')
export const useMetrics = () => useDomain(MetricsContext, 'useMetrics')
export const useCashFlow = () => useDomain(CashFlowContext, 'useCashFlow')
