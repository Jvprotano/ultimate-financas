import { RotateCcw } from "lucide-react";
import { useFinancas } from "./hooks/useFinancas";
import { SalaryInput } from "./components/SalaryInput";
import { DeductionsManager } from "./components/DeductionsManager";
import { CostManager } from "./components/CostManager";
import { WantsManager } from "./components/WantsManager";
import { BudgetModelSelector } from "./components/BudgetModelSelector";
import { BudgetOverview } from "./components/BudgetOverview";
import { DiversificationSelector } from "./components/DiversificationSelector";
import { Summary } from "./components/Summary";
import { Charts } from "./components/Charts";
import { EmergencyFund } from "./components/EmergencyFund";

function App() {
  const f = useFinancas();

  const handleReset = () => {
    if (window.confirm("Tem certeza que deseja limpar todos os dados?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-dark-bg/80 backdrop-blur-lg border-b border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">UF</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-dark-text leading-tight">
                  Ultimate Financas
                </h1>
                <p className="text-[11px] text-dark-text-muted leading-tight">
                  Planejamento Salarial & Investimentos
                </p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-dark-text-muted
                hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Limpar todos os dados"
            >
              <RotateCcw size={14} />
              <span className="hidden sm:inline">Resetar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Summary Cards */}
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

        {/* Budget Model Selection */}
        <BudgetModelSelector
          selectedModelId={f.selectedModelId}
          setSelectedModelId={f.setSelectedModelId}
          customModel={f.customModel}
          setCustomModel={f.setCustomModel}
        />

        {/* Budget Overview - Hero comparison section */}
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

        {/* Input Section - 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Income & Expenses */}
          <div className="space-y-6">
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

            <CostManager
              costs={f.costs}
              addCost={f.addCost}
              removeCost={f.removeCost}
              totalCosts={f.totalCosts}
            />
          </div>

          {/* Right Column - Wants & Investments */}
          <div className="space-y-6">
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

        {/* Charts - Full Width */}
        <Charts
          budgetAllocation={f.budgetAllocation}
          investmentAllocation={f.investmentAllocation}
          costsByCategory={f.costsByCategory}
          wantAllocations={f.wantAllocations}
          availableForBudget={f.availableForBudget}
          investmentDeductions={f.investmentDeductions}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-border mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-xs text-dark-text-muted">
            Ultimate Finanças — Todos os dados sao salvos apenas no seu
            navegador. Nenhuma informacao e enviada para servidores externos.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
