import { useRef, type ChangeEvent } from 'react'
import { Download, RotateCcw, Upload, WalletCards } from 'lucide-react'
import { useFinancas } from './hooks/useFinancas'
import { CommandCenter } from './components/CommandCenter'
import { SalaryInput } from './components/SalaryInput'
import { DeductionsManager } from './components/DeductionsManager'
import { CostManager } from './components/CostManager'
import { WantsManager } from './components/WantsManager'
import { BudgetModelSelector } from './components/BudgetModelSelector'
import { BudgetOverview } from './components/BudgetOverview'
import { CreditCardManager } from './components/CreditCardManager'
import { DiversificationSelector } from './components/DiversificationSelector'
import { Charts } from './components/Charts'
import { EmergencyFund } from './components/EmergencyFund'
import { ScenarioManager } from './components/ScenarioManager'

const APP_STORAGE_PREFIX = 'uf_'

type BackupPayload = {
  app?: string
  version?: number
  exportedAt?: string
  localStorage?: Record<string, string>
}

function getAppStorageEntries() {
  const entries: Record<string, string> = {}

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (key?.startsWith(APP_STORAGE_PREFIX)) {
      entries[key] = localStorage.getItem(key) ?? ''
    }
  }

  return entries
}

function clearAppStorage() {
  const keysToRemove: string[] = []

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (key?.startsWith(APP_STORAGE_PREFIX)) {
      keysToRemove.push(key)
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key))
}

function App() {
  const f = useFinancas()
  const importInputRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    const payload = {
      app: 'ultimate-financas',
      version: 1,
      exportedAt: new Date().toISOString(),
      localStorage: getAppStorageEntries(),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const date = new Date().toISOString().slice(0, 10)

    link.href = url
    link.download = `ultimate-financas-backup-${date}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const payload = JSON.parse(await file.text()) as BackupPayload
      const storage = payload.localStorage
      const entries = storage
        ? Object.entries(storage).filter(
            ([key, value]) => key.startsWith(APP_STORAGE_PREFIX) && typeof value === 'string',
          )
        : []

      if (!entries.length) {
        throw new Error('No Ultimate Financas keys found')
      }

      const confirmed = window.confirm(
        `Importar backup com ${entries.length} registros locais? Seus dados atuais do Ultimate Financas serao substituidos.`,
      )
      if (!confirmed) return

      clearAppStorage()
      entries.forEach(([key, value]) => localStorage.setItem(key, value))
      window.location.reload()
    } catch {
      window.alert('Arquivo de backup invalido para o Ultimate Financas.')
    }
  }

  const handleReset = () => {
    if (window.confirm('Tem certeza que deseja limpar todos os dados?')) {
      clearAppStorage()
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-dark-bg/88 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-500 text-[#06100f] shadow-lg shadow-primary-500/20">
              <WalletCards size={19} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-black leading-tight text-dark-text">Ultimate Financas</h1>
              <p className="truncate text-[11px] leading-tight text-dark-text-muted">
                {f.activeScenario.name} - dados somente no navegador
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-dark-text-secondary transition-colors hover:bg-primary-500/10 hover:text-primary-300"
              title="Exportar backup local"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Backup</span>
            </button>
            <button
              onClick={() => importInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-dark-text-secondary transition-colors hover:bg-amber-500/10 hover:text-amber-300"
              title="Importar backup local"
            >
              <Upload size={14} />
              <span className="hidden sm:inline">Importar</span>
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImport}
            />
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-dark-text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-300"
              title="Limpar todos os dados do app"
            >
              <RotateCcw size={14} />
              <span className="hidden sm:inline">Resetar</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <CommandCenter
          scenarioName={f.activeScenario.name}
          salaryNet={f.salaryNet}
          paycheckInAccount={f.paycheckInAccount}
          availableForBudget={f.availableForBudget}
          totalCosts={f.totalCosts}
          totalWants={f.totalWantsAmount}
          totalDeductions={f.totalDeductions}
          directInvestmentTarget={f.directInvestmentTarget}
          balanceAfterCosts={f.balanceAfterCosts}
          budgetComparison={f.budgetComparison}
          emergencyFundCurrent={f.emergencyFundCurrent}
          fixedIncomeMonthlyAllocation={f.fixedIncomeMonthlyAllocation}
        />

        <ScenarioManager
          scenarios={f.scenarios}
          activeScenarioId={f.activeScenarioId}
          setActiveScenarioId={f.setActiveScenarioId}
          createScenario={f.createScenario}
          duplicateScenario={f.duplicateScenario}
          renameScenario={f.renameScenario}
          removeScenario={f.removeScenario}
          summaries={f.scenarioSummaries}
        />

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
          <div className="space-y-5 xl:sticky xl:top-20 xl:self-start">
            <div>
              <span className="text-xs font-bold uppercase tracking-wide text-primary-300">Base financeira</span>
              <h2 className="mt-1 text-xl font-black text-dark-text">Cadastre e acompanhe</h2>
              <p className="mt-1 text-sm text-dark-text-muted">
                Renda, folha e custos fixos ficam aqui para consulta rapida.
              </p>
            </div>

            <SalaryInput
              salaryNet={f.salaryNet}
              setSalaryNet={f.setSalaryNet}
              salaryInputMode={f.salaryInputMode}
              setSalaryInputMode={f.setSalaryInputMode}
              paycheckInAccount={f.paycheckInAccount}
              totalDeductions={f.totalDeductions}
              benefitDeductions={f.benefitDeductions}
              investmentDeductions={f.investmentDeductions}
              employerInvestmentContributions={f.employerInvestmentContributions}
              availableForBudget={f.availableForBudget}
            />

            <DeductionsManager
              deductions={f.deductions}
              addDeduction={f.addDeduction}
              removeDeduction={f.removeDeduction}
              updateDeductionEmployerContribution={f.updateDeductionEmployerContribution}
              totalDeductions={f.totalDeductions}
              investmentDeductions={f.investmentDeductions}
              employerInvestmentContributions={f.employerInvestmentContributions}
              availableForBudget={f.availableForBudget}
            />

            <CostManager
              costs={f.costs}
              addCost={f.addCost}
              removeCost={f.removeCost}
              totalCosts={f.totalCosts}
              availableForBudget={f.availableForBudget}
            />
          </div>

          <div className="space-y-5">
            <div>
              <span className="text-xs font-bold uppercase tracking-wide text-emerald-300">Plano do mes</span>
              <h2 className="mt-1 text-xl font-black text-dark-text">Ajuste o que muda com frequencia</h2>
              <p className="mt-1 text-sm text-dark-text-muted">
                Metas, desejos, aportes e reserva ficam juntos para comparar sobras e faltas.
              </p>
            </div>

            <BudgetModelSelector
              selectedModelId={f.selectedModelId}
              setSelectedModelId={f.setSelectedModelId}
              customModel={f.customModel}
              setCustomModel={f.setCustomModel}
            />

            <BudgetOverview
              budgetComparison={f.budgetComparison}
              allocationTransfers={f.allocationTransfers}
              addAllocationTransfer={f.addAllocationTransfer}
              removeAllocationTransfer={f.removeAllocationTransfer}
              clearAllocationTransfers={f.clearAllocationTransfers}
              investmentDeductions={f.investmentDeductions}
              employerInvestmentContributions={f.employerInvestmentContributions}
              directInvestmentTarget={f.directInvestmentTarget}
              availableForBudget={f.availableForBudget}
              selectedModel={f.selectedModel}
              baseBudgetAllocation={f.baseBudgetAllocation}
              balanceAfterCosts={f.balanceAfterCosts}
            />

            <CreditCardManager
              entries={f.creditCardEntries}
              settings={f.creditCardSettings}
              summary={f.creditCardSummary}
              availableForBudget={f.availableForBudget}
              addEntry={f.addCreditCardEntry}
              updateEntry={f.updateCreditCardEntry}
              removeEntry={f.removeCreditCardEntry}
              replaceEntries={f.replaceCreditCardEntries}
              appendEntries={f.appendCreditCardEntries}
              setSettings={f.setCreditCardSettings}
            />

            <WantsManager
              wants={f.wants}
              addWant={f.addWant}
              removeWant={f.removeWant}
              updateWantPercentage={f.updateWantPercentage}
              updateWantFixedAmount={f.updateWantFixedAmount}
              updateWantMode={f.updateWantMode}
              wantAllocations={f.wantAllocations}
              totalWantsPercentage={f.totalWantsPercentage}
              fixedWantsAmount={f.fixedWantsAmount}
              variableWantsBase={f.variableWantsBase}
              totalWantsAmount={f.totalWantsAmount}
              desejosAmount={f.budgetAllocation.desejos}
              availableForBudget={f.availableForBudget}
            />

            <DiversificationSelector
              diversification={f.diversification}
              updateDiversification={f.updateDiversification}
              addDiversificationSlice={f.addDiversificationSlice}
              removeDiversificationSlice={f.removeDiversificationSlice}
              investmentAllocation={f.investmentAllocation}
              totalInvestment={f.budgetAllocation.investimentos}
              investmentDeductions={f.investmentDeductions}
              employerInvestmentContributions={f.employerInvestmentContributions}
              directInvestmentTarget={f.directInvestmentTarget}
              availableForBudget={f.availableForBudget}
            />

            <EmergencyFund
              totalCosts={f.totalCosts}
              currentReserve={f.emergencyFundCurrent}
              setCurrentReserve={f.setEmergencyFundCurrent}
              fixedIncomeMonthlyAllocation={f.fixedIncomeMonthlyAllocation}
              availableForBudget={f.availableForBudget}
            />

            <Charts
              budgetAllocation={f.budgetAllocation}
              investmentAllocation={f.investmentAllocation}
              costsByCategory={f.costsByCategory}
              wantAllocations={f.wantAllocations}
              availableForBudget={f.availableForBudget}
              investmentDeductions={f.investmentDeductions}
              employerInvestmentContributions={f.employerInvestmentContributions}
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-5 text-center text-xs text-dark-text-muted sm:px-6 lg:px-8">
          Dados salvos apenas no navegador. Use Backup para guardar uma copia fora do localStorage.
        </div>
      </footer>
    </div>
  )
}

export default App
