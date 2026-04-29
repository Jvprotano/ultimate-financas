import { RotateCcw, WalletCards } from 'lucide-react'
import { useFinancas } from './hooks/useFinancas'
import { SalaryInput } from './components/SalaryInput'
import { DeductionsManager } from './components/DeductionsManager'
import { CostManager } from './components/CostManager'
import { WantsManager } from './components/WantsManager'
import { BudgetModelSelector } from './components/BudgetModelSelector'
import { BudgetOverview } from './components/BudgetOverview'
import { DiversificationSelector } from './components/DiversificationSelector'
import { Summary } from './components/Summary'
import { Charts } from './components/Charts'
import { EmergencyFund } from './components/EmergencyFund'
import { ScenarioManager } from './components/ScenarioManager'

function App() {
  const f = useFinancas()

  const handleReset = () => {
    if (window.confirm('Tem certeza que deseja limpar todos os dados?')) {
      localStorage.clear()
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      <header className="sticky top-0 z-50 border-b border-dark-border bg-dark-bg/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white">
              <WalletCards size={19} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold leading-tight text-dark-text">Ultimate Financas</h1>
              <p className="truncate text-[11px] leading-tight text-dark-text-muted">
                {f.activeScenario.name}
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-dark-text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-400"
            title="Limpar todos os dados"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Resetar</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 lg:px-8">
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

        <Summary
          salaryNet={f.salaryNet}
          salaryInputMode={f.salaryInputMode}
          paycheckInAccount={f.paycheckInAccount}
          totalDeductions={f.totalDeductions}
          benefitDeductions={f.benefitDeductions}
          investmentDeductions={f.investmentDeductions}
          availableForBudget={f.availableForBudget}
          totalCosts={f.totalCosts}
          totalWants={f.totalWantsAmount}
          balanceAfterCosts={f.balanceAfterCosts}
        />

        <BudgetOverview
          budgetComparison={f.budgetComparison}
          investmentDeductions={f.investmentDeductions}
          directInvestmentTarget={f.directInvestmentTarget}
          unallocatedMoney={f.unallocatedMoney}
          availableForBudget={f.availableForBudget}
          selectedModel={f.selectedModel}
          baseBudgetAllocation={f.baseBudgetAllocation}
          budgetAllocation={f.budgetAllocation}
          necessidadesSurplus={f.necessidadesSurplus}
          surplusToDesejos={f.surplusToDesejos}
          setSurplusToDesejos={f.setSurplusToDesejos}
        />

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="space-y-5">
            <SalaryInput
              salaryNet={f.salaryNet}
              setSalaryNet={f.setSalaryNet}
              salaryInputMode={f.salaryInputMode}
              setSalaryInputMode={f.setSalaryInputMode}
              paycheckInAccount={f.paycheckInAccount}
              totalDeductions={f.totalDeductions}
              benefitDeductions={f.benefitDeductions}
              investmentDeductions={f.investmentDeductions}
              availableForBudget={f.availableForBudget}
            />

            <DeductionsManager
              deductions={f.deductions}
              addDeduction={f.addDeduction}
              removeDeduction={f.removeDeduction}
              totalDeductions={f.totalDeductions}
              investmentDeductions={f.investmentDeductions}
            />

            <CostManager costs={f.costs} addCost={f.addCost} removeCost={f.removeCost} totalCosts={f.totalCosts} />
          </div>

          <div className="space-y-5">
            <BudgetModelSelector
              selectedModelId={f.selectedModelId}
              setSelectedModelId={f.setSelectedModelId}
              customModel={f.customModel}
              setCustomModel={f.setCustomModel}
            />

            <WantsManager
              wants={f.wants}
              addWant={f.addWant}
              removeWant={f.removeWant}
              updateWantPercentage={f.updateWantPercentage}
              wantAllocations={f.wantAllocations}
              totalWantsPercentage={f.totalWantsPercentage}
              desejosAmount={f.budgetAllocation.desejos}
            />

            <DiversificationSelector
              diversification={f.diversification}
              updateDiversification={f.updateDiversification}
              addDiversificationSlice={f.addDiversificationSlice}
              removeDiversificationSlice={f.removeDiversificationSlice}
              investmentAllocation={f.investmentAllocation}
              totalInvestment={f.budgetAllocation.investimentos}
              investmentDeductions={f.investmentDeductions}
              directInvestmentTarget={f.directInvestmentTarget}
            />

            <EmergencyFund totalCosts={f.totalCosts} />
          </div>
        </div>

        <Charts
          budgetAllocation={f.budgetAllocation}
          investmentAllocation={f.investmentAllocation}
          costsByCategory={f.costsByCategory}
          wantAllocations={f.wantAllocations}
          availableForBudget={f.availableForBudget}
          investmentDeductions={f.investmentDeductions}
        />
      </main>

      <footer className="border-t border-dark-border">
        <div className="mx-auto max-w-7xl px-4 py-5 text-center text-xs text-dark-text-muted sm:px-6 lg:px-8">
          Dados salvos apenas no navegador.
        </div>
      </footer>
    </div>
  )
}

export default App
