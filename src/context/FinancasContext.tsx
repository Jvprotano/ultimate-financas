import type { ReactNode } from 'react'
import { useFinancas } from '../hooks/useFinancas'
import { FinancasContext } from './financasStore'

// Os hooks de leitura ficam em `financasStore.ts`: este arquivo exporta apenas
// o componente, para o fast refresh continuar funcionando.
export function FinancasProvider({ children }: { children: ReactNode }) {
  const store = useFinancas()
  return <FinancasContext.Provider value={store}>{children}</FinancasContext.Provider>
}
