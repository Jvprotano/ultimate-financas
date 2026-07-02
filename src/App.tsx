import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import {
  CreditCard,
  Download,
  LayoutDashboard,
  MoreVertical,
  RotateCcw,
  SlidersHorizontal,
  Upload,
  WalletCards,
} from 'lucide-react'
import { useFinancas } from './hooks/useFinancas'
import { Dashboard } from './components/Dashboard'
import { IncomePanel } from './components/IncomePanel'
import { BudgetModelPicker } from './components/BudgetModelPicker'
import { CostManager } from './components/CostManager'
import { WantsManager } from './components/WantsManager'
import { InvestmentPlan } from './components/InvestmentPlan'
import { EmergencyFund } from './components/EmergencyFund'
import { CreditCardManager } from './components/CreditCardManager'
import { ScenarioSwitcher } from './components/ScenarioSwitcher'

const APP_STORAGE_PREFIX = 'uf_'

type View = 'overview' | 'planning' | 'cards'

const VIEWS: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'planning', label: 'Planejamento', icon: SlidersHorizontal },
  { id: 'cards', label: 'Cartões', icon: CreditCard },
]

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

function TabBar({
  activeView,
  setActiveView,
  className = '',
}: {
  activeView: View
  setActiveView: (view: View) => void
  className?: string
}) {
  return (
    <nav className={`grid grid-cols-3 gap-1 rounded-lg border border-dark-border bg-dark-surface p-1 ${className}`}>
      {VIEWS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => setActiveView(id)}
          className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            activeView === id ? 'bg-dark-hover text-dark-text shadow-sm' : 'text-dark-text-muted hover:text-dark-text'
          }`}
        >
          <Icon size={14} />
          <span className="whitespace-nowrap">{label}</span>
        </button>
      ))}
    </nav>
  )
}

function AppMenu({
  onExport,
  onImport,
  onReset,
}: {
  onExport: () => void
  onImport: () => void
  onReset: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const itemClass =
    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-dark-text-secondary transition-colors hover:bg-dark-hover hover:text-dark-text'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-lg border border-dark-border bg-dark-surface p-2 text-dark-text-muted transition-colors hover:text-dark-text"
        aria-label="Mais opções"
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-dark-border bg-dark-card p-1.5 shadow-xl shadow-black/40">
          <button type="button" className={itemClass} onClick={() => { onExport(); setOpen(false) }}>
            <Download size={14} />
            Exportar backup
          </button>
          <button type="button" className={itemClass} onClick={() => { onImport(); setOpen(false) }}>
            <Upload size={14} />
            Importar backup
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-dark-text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-300"
            onClick={() => { onReset(); setOpen(false) }}
          >
            <RotateCcw size={14} />
            Apagar todos os dados
          </button>
        </div>
      )}
    </div>
  )
}

function App() {
  const f = useFinancas()
  const importInputRef = useRef<HTMLInputElement>(null)
  const [activeView, setActiveView] = useState<View>('overview')
  const m = f.metrics

  const handleExport = () => {
    const payload = {
      app: 'ultimate-financas',
      version: 2,
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
        throw new Error('No Ultimate Finanças keys found')
      }

      const confirmed = window.confirm(
        `Importar backup com ${entries.length} registros locais? Seus dados atuais do Ultimate Finanças serão substituídos.`,
      )
      if (!confirmed) return

      clearAppStorage()
      entries.forEach(([key, value]) => localStorage.setItem(key, value))
      window.location.reload()
    } catch {
      window.alert('Arquivo de backup inválido para o Ultimate Finanças.')
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
      <header className="sticky top-0 z-40 border-b border-dark-border-subtle bg-dark-bg/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white">
              <WalletCards size={16} />
            </div>
            <h1 className="truncate text-[15px] font-semibold tracking-tight text-dark-text">Ultimate Finanças</h1>
          </div>

          <TabBar activeView={activeView} setActiveView={setActiveView} className="hidden md:grid" />

          <div className="flex items-center gap-2">
            <ScenarioSwitcher
              scenarios={f.scenarios}
              activeScenarioId={f.activeScenarioId}
              setActiveScenarioId={f.setActiveScenarioId}
              createScenario={f.createScenario}
              duplicateScenario={f.duplicateScenario}
              renameScenario={f.renameScenario}
              removeScenario={f.removeScenario}
              summaries={f.scenarioSummaries}
            />
            <AppMenu onExport={handleExport} onImport={() => importInputRef.current?.click()} onReset={handleReset} />
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImport}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-5 sm:px-6">
        <TabBar activeView={activeView} setActiveView={setActiveView} className="md:hidden" />

        {activeView === 'overview' && (
          <Dashboard
            metrics={m}
            emergencyFund={f.emergencyFund}
            scenarioSummaries={f.scenarioSummaries}
            activeScenarioId={f.activeScenarioId}
            onGoToPlanning={() => setActiveView('planning')}
          />
        )}

        {activeView === 'planning' && (
          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
            <div className="space-y-4">
              <IncomePanel
                salaryNet={f.salaryNet}
                setSalaryNet={f.setSalaryNet}
                salaryInputMode={f.salaryInputMode}
                setSalaryInputMode={f.setSalaryInputMode}
                deductions={f.deductions}
                addDeduction={f.addDeduction}
                removeDeduction={f.removeDeduction}
                updateDeductionEmployerContribution={f.updateDeductionEmployerContribution}
                paycheckInAccount={m.paycheckInAccount}
                totalDeductions={m.totalDeductions}
                availableForBudget={m.availableForBudget}
              />
              <CostManager
                costs={f.costs}
                addCost={f.addCost}
                removeCost={f.removeCost}
                totalCosts={m.totalCosts}
                necessidadesTarget={m.budgetAllocation.necessidades}
              />
              <EmergencyFund
                emergencyFund={f.emergencyFund}
                setCurrent={f.setEmergencyFundCurrent}
                setTargetMonths={f.setEmergencyFundTargetMonths}
                totalCosts={m.totalCosts}
                target={m.emergencyFundTarget}
                remaining={m.emergencyFundRemaining}
                progress={m.emergencyFundProgress}
                monthsToGoal={m.emergencyFundMonthsToGoal}
                fixedIncomeMonthlyAllocation={m.fixedIncomeMonthlyAllocation}
              />
            </div>

            <div className="space-y-4">
              <BudgetModelPicker
                selectedModelId={f.selectedModelId}
                setSelectedModelId={f.setSelectedModelId}
                customModel={f.customModel}
                setCustomModel={f.setCustomModel}
                availableForBudget={m.availableForBudget}
                budgetAllocation={m.budgetAllocation}
              />
              <WantsManager
                wants={f.wants}
                addWant={f.addWant}
                removeWant={f.removeWant}
                updateWantAmount={f.updateWantAmount}
                totalWantsAmount={m.totalWantsAmount}
                desejosTarget={m.budgetAllocation.desejos}
              />
              <InvestmentPlan
                diversification={f.diversification}
                updateDiversification={f.updateDiversification}
                addDiversificationSlice={f.addDiversificationSlice}
                removeDiversificationSlice={f.removeDiversificationSlice}
                investmentAllocation={m.investmentAllocation}
                investmentTarget={m.budgetAllocation.investimentos}
                investmentDeductions={m.investmentDeductions}
                employerInvestmentContributions={m.employerInvestmentContributions}
                directInvestmentTarget={m.directInvestmentTarget}
              />
            </div>
          </div>
        )}

        {activeView === 'cards' && (
          <CreditCardManager
            entries={f.creditCardEntries}
            settings={f.creditCardSettings}
            summary={f.creditCardSummary}
            availableForBudget={m.availableForBudget}
            addEntry={f.addCreditCardEntry}
            updateEntry={f.updateCreditCardEntry}
            removeEntry={f.removeCreditCardEntry}
            replaceEntries={f.replaceCreditCardEntries}
            appendEntries={f.appendCreditCardEntries}
            anticipateEntry={f.anticipateCreditCardInstallments}
            payInvoice={f.payCreditCardInvoice}
            setSettings={f.setCreditCardSettings}
          />
        )}
      </main>

      <footer className="border-t border-dark-border-subtle">
        <div className="mx-auto max-w-6xl px-4 py-4 text-center text-xs text-dark-text-muted sm:px-6">
          Dados salvos apenas neste navegador. Exporte um backup para guardar uma cópia.
        </div>
      </footer>
    </div>
  )
}

export default App
