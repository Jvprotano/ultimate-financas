import type { ReactNode } from 'react'
import { useFinancas } from '../hooks/useFinancas'
import {
  ActualsContext,
  AssetsContext,
  CardsContext,
  CashFlowContext,
  DebtsContext,
  FinancasContext,
  ForecastContext,
  HistoryContext,
  InvestmentsContext,
  MetricsContext,
  ScenarioContext,
} from './financasStore'

// Os hooks de leitura ficam em `financasStore.ts`: este arquivo exporta apenas
// o componente, para o fast refresh continuar funcionando.
export function FinancasProvider({ children }: { children: ReactNode }) {
  const store = useFinancas()
  return (
    <FinancasContext.Provider value={store}>
      <ScenarioContext.Provider value={store.scenarios}>
        <CardsContext.Provider value={store.cards}>
          <InvestmentsContext.Provider value={store.investments}>
            <HistoryContext.Provider value={store.history}>
              <ForecastContext.Provider value={store.forecast}>
                <DebtsContext.Provider value={store.debts}>
                  <AssetsContext.Provider value={store.assets}>
                    <ActualsContext.Provider value={store.actuals}>
                      <MetricsContext.Provider value={store.metrics}>
                        <CashFlowContext.Provider value={store.cashFlow}>
                          {children}
                        </CashFlowContext.Provider>
                      </MetricsContext.Provider>
                    </ActualsContext.Provider>
                  </AssetsContext.Provider>
                </DebtsContext.Provider>
              </ForecastContext.Provider>
            </HistoryContext.Provider>
          </InvestmentsContext.Provider>
        </CardsContext.Provider>
      </ScenarioContext.Provider>
    </FinancasContext.Provider>
  )
}
