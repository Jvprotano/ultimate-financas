import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react'
import {
  AlertTriangle,
  Archive,
  CalendarCheck,
  CalendarClock,
  CreditCard,
  Download,
  History,
  Keyboard,
  Landmark,
  MoreVertical,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { FinancasProvider } from './context/FinancasContext'
import { useScenarioStore } from './context/financasStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { usePersistenceStatus } from './hooks/usePersistenceStatus'
import { IncomePanel } from './components/IncomePanel'
import { BudgetModelPicker } from './components/BudgetModelPicker'
import { CostManager } from './components/CostManager'
import { WantsManager } from './components/WantsManager'
import { InvestmentPlan } from './components/InvestmentPlan'
import { ClosingView } from './components/ClosingView'
import { CreditCardManager } from './components/CreditCardManager'
import { InvestmentsManager } from './components/InvestmentsManager'
import { ForecastView } from './components/ForecastView'
import { HistoryView } from './components/HistoryView'
import { ScenarioSwitcher } from './components/ScenarioSwitcher'
import { CycleSwitcher } from './components/CycleSwitcher'
import { ConfirmationDialog } from './components/ui'
import { formatDate } from './lib/format'
import {
  clearAppStorage,
  clearAllFinTanoStorage,
  downloadBackup,
  listAutoBackups,
  readBackupEntries,
  restoreAutoBackup,
  restoreEntries,
  type BackupPayload,
} from './lib/backup'

type View = 'closing' | 'planning' | 'cards' | 'investments' | 'history' | 'forecast'

interface AppDialogState {
  title: string
  description: ReactNode
  confirmLabel: string
  tone?: 'danger' | 'primary'
  hideCancel?: boolean
  onConfirm: () => void
}

const SECONDARY_VIEWS = new Set<View>(['forecast'])

const VIEWS: { id: View; label: string; icon: typeof CalendarCheck }[] = [
  { id: 'closing', label: 'Ciclo', icon: CalendarCheck },
  { id: 'planning', label: 'Planejar', icon: SlidersHorizontal },
  { id: 'cards', label: 'Cartões', icon: CreditCard },
  { id: 'investments', label: 'Patrimônio', icon: Landmark },
  { id: 'history', label: 'Histórico', icon: History },
  { id: 'forecast', label: 'Futuro', icon: CalendarClock },
]

const SHORTCUTS: { keys: string; description: string }[] = [
  ...VIEWS.map((view, index) => ({ keys: String(index + 1), description: `Ir para ${view.label}` })),
  { keys: '/', description: 'Buscar na fatura (aba Cartões)' },
  { keys: '?', description: 'Mostrar estes atalhos' },
  { keys: 'Esc', description: 'Fechar o que estiver aberto' },
]

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
    <nav
      className={`grid grid-cols-3 gap-1 rounded-lg border border-dark-border bg-dark-surface p-1 sm:grid-cols-6 ${className}`}
    >
      {VIEWS.map(({ id, label, icon: Icon }) => {
        const secondary = SECONDARY_VIEWS.has(id)
        const active = activeView === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => setActiveView(id)}
            aria-current={active ? 'page' : undefined}
            className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-dark-hover text-dark-text shadow-sm'
                : secondary
                  ? 'text-dark-text-muted/70 hover:text-dark-text-muted'
                  : 'text-dark-text-muted hover:text-dark-text'
            }`}
          >
            <Icon size={14} className={secondary && !active ? 'opacity-70' : undefined} />
            <span className="hidden whitespace-nowrap lg:inline">{label}</span>
            <span className="whitespace-nowrap lg:hidden">{label.split(' ')[0]}</span>
          </button>
        )
      })}
    </nav>
  )
}

function AppMenu({
  onExport,
  onImport,
  onResetCurrent,
  onResetAll,
  onShortcuts,
  onRestoreAuto,
}: {
  onExport: () => void
  onImport: () => void
  onResetCurrent: () => void
  onResetAll: () => void
  onShortcuts: () => void
  onRestoreAuto: (createdAt: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const autoBackups = useMemo(() => (open ? listAutoBackups() : []), [open])

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

  const run = (action: () => void) => () => {
    action()
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-lg border border-dark-border bg-dark-surface p-2 text-dark-text-muted transition-colors hover:text-dark-text"
        aria-label="Mais opções"
        aria-expanded={open}
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-dark-border bg-dark-card p-1.5 shadow-xl shadow-black/40">
          <button type="button" className={itemClass} onClick={run(onExport)}>
            <Download size={14} />
            Exportar backup
          </button>
          <button type="button" className={itemClass} onClick={run(onImport)}>
            <Upload size={14} />
            Importar backup
          </button>
          <button type="button" className={itemClass} onClick={run(onShortcuts)}>
            <Keyboard size={14} />
            Atalhos de teclado
          </button>

          {autoBackups.length > 0 && (
            <div className="mt-1.5 border-t border-dark-border-subtle pt-1.5">
              <span className="flex items-center gap-2 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-dark-text-muted">
                <Archive size={12} />
                Cópias automáticas
              </span>
              {autoBackups.map((backup) => (
                <button
                  key={backup.createdAt}
                  type="button"
                  className={itemClass}
                  onClick={run(() => onRestoreAuto(backup.createdAt))}
                >
                  <RotateCcw size={14} />
                  Restaurar de {formatDate(backup.createdAt)}
                </button>
              ))}
            </div>
          )}

          <div className="mt-1.5 border-t border-dark-border-subtle pt-1.5">
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-dark-text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-300"
              onClick={run(onResetCurrent)}
            >
              <RotateCcw size={14} />
              Limpar dados atuais
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-rose-300 transition-colors hover:bg-rose-500/10"
              onClick={run(onResetAll)}
            >
              <Trash2 size={14} />
              Apagar dados e cópias
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ShortcutsOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-xl border border-dark-border bg-dark-card p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label="Atalhos de teclado"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-dark-text">
            <Keyboard size={16} className="text-dark-text-muted" />
            Atalhos de teclado
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-dark-text-muted transition-colors hover:text-dark-text"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>
        <dl className="mt-4 space-y-2">
          {SHORTCUTS.map((shortcut) => (
            <div key={shortcut.keys} className="flex items-center justify-between gap-4 text-sm">
              <dt className="text-dark-text-secondary">{shortcut.description}</dt>
              <dd>
                <kbd className="rounded-md border border-dark-border bg-dark-surface px-2 py-0.5 font-mono text-xs text-dark-text">
                  {shortcut.keys}
                </kbd>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}

function MasonryColumns({ children }: { children: ReactNode }) {
  return (
    <div className="columns-1 gap-4 xl:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
      {children}
    </div>
  )
}

function AppShell() {
  const importInputRef = useRef<HTMLInputElement>(null)
  const [activeView, setActiveView] = useState<View>('closing')
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [dialog, setDialog] = useState<AppDialogState | null>(null)
  const scenarios = useScenarioStore()
  const persistence = usePersistenceStatus()
  const closeDialog = useCallback(() => setDialog(null), [])

  const showNotice = useCallback((title: string, description: string) => {
    setDialog({
      title,
      description,
      confirmLabel: 'Entendi',
      hideCancel: true,
      onConfirm: () => undefined,
    })
  }, [])

  const shortcutHandlers = useMemo(
    () => ({
      ...Object.fromEntries(
        VIEWS.map((view, index) => [String(index + 1), () => setActiveView(view.id)]),
      ),
      '?': () => setShowShortcuts(true),
      Escape: () => setShowShortcuts(false),
      '/': () => {
        setActiveView('cards')
        requestAnimationFrame(() => {
          document.querySelector<HTMLInputElement>('[data-card-search]')?.focus()
        })
      },
    }),
    [],
  )
  useKeyboardShortcuts(shortcutHandlers)

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const payload = JSON.parse(await file.text()) as BackupPayload
      const entries = readBackupEntries(payload)
      if (!entries.length) throw new Error('No FinTano keys found')

      setDialog({
        title: 'Importar este backup?',
        description: `O arquivo contém ${entries.length} registros do FinTano. Os dados atuais serão substituídos, mas uma cópia de segurança será criada antes.`,
        confirmLabel: 'Importar backup',
        onConfirm: () => {
          const result = restoreEntries(entries)
          if (result.ok) window.location.reload()
          else showNotice('Não foi possível importar', result.error ?? 'O backup não foi restaurado.')
        },
      })
    } catch (error) {
      showNotice(
        'Backup inválido',
        error instanceof Error && error.message
          ? error.message
          : 'O arquivo não parece ser um backup válido do FinTano.',
      )
    }
  }

  const handleResetCurrent = () => {
    setDialog({
      title: 'Limpar os dados atuais?',
      description: 'Planejamento, lançamentos e histórico serão removidos. As cópias automáticas serão mantidas para recuperação.',
      confirmLabel: 'Limpar dados atuais',
      tone: 'danger',
      onConfirm: () => {
        clearAppStorage()
        window.location.reload()
      },
    })
  }

  const handleResetAll = () => {
    setDialog({
      title: 'Apagar tudo deste navegador?',
      description: 'Dados atuais e todas as cópias automáticas serão removidos. Esta ação não pode ser desfeita sem um arquivo de backup exportado.',
      confirmLabel: 'Apagar dados e cópias',
      tone: 'danger',
      onConfirm: () => {
        clearAllFinTanoStorage()
        window.location.reload()
      },
    })
  }

  const handleRestoreAuto = (createdAt: string) => {
    setDialog({
      title: `Restaurar cópia de ${formatDate(createdAt)}?`,
      description: 'Os dados atuais serão substituídos. Uma nova cópia de segurança será criada antes da restauração.',
      confirmLabel: 'Restaurar cópia',
      onConfirm: () => {
        const result = restoreAutoBackup(createdAt)
        if (result.ok) window.location.reload()
        else showNotice('Não foi possível restaurar', result.error ?? 'A cópia não foi restaurada.')
      },
    })
  }

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text">
      <header className="sticky top-0 z-40 border-b border-dark-border-subtle bg-dark-bg/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <h1 className="hidden shrink-0 truncate text-[15px] font-semibold tracking-tight text-dark-text sm:block">
            FinTano
          </h1>

          <TabBar activeView={activeView} setActiveView={setActiveView} className="hidden md:grid" />

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <CycleSwitcher />
            </div>
            <ScenarioSwitcher />
            <AppMenu
              onExport={downloadBackup}
              onImport={() => importInputRef.current?.click()}
              onResetCurrent={handleResetCurrent}
              onResetAll={handleResetAll}
              onShortcuts={() => setShowShortcuts(true)}
              onRestoreAuto={handleRestoreAuto}
            />
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
        {persistence.hasError && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-rose-500/35 bg-rose-500/[0.08] px-4 py-3 text-sm text-rose-100 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-300" />
              <span>
                <strong className="block text-rose-200">A última alteração não foi salva</strong>
                <span className="mt-0.5 block text-xs leading-relaxed text-rose-100/80">
                  {persistence.message} Libere espaço ou verifique as permissões e tente novamente.
                </span>
              </span>
            </span>
            <button
              type="button"
              onClick={persistence.retry}
              className="shrink-0 rounded-lg border border-rose-400/30 px-3 py-2 text-xs font-semibold text-rose-100 transition-colors hover:bg-rose-500/10"
            >
              Testar novamente
            </button>
          </div>
        )}
        <div className="flex items-center justify-between gap-3 md:hidden">
          <TabBar activeView={activeView} setActiveView={setActiveView} className="flex-1" />
        </div>
        <div className="sm:hidden">
          <CycleSwitcher />
        </div>

        {activeView === 'closing' && (
          <ClosingView
            onGoToCards={() => setActiveView('cards')}
            onGoToPlanning={() => setActiveView('planning')}
          />
        )}

        {activeView === 'planning' && (
          <MasonryColumns>
            <IncomePanel />
            <CostManager />
            <BudgetModelPicker />
            <WantsManager />
            <InvestmentPlan />
          </MasonryColumns>
        )}

        {activeView === 'cards' && <CreditCardManager />}
        {activeView === 'investments' && <InvestmentsManager />}
        {activeView === 'history' && <HistoryView />}
        {activeView === 'forecast' && <ForecastView />}
      </main>

      <footer className="border-t border-dark-border-subtle">
        <div className="mx-auto max-w-6xl px-4 py-4 text-center text-xs text-dark-text-muted sm:px-6">
          Dados salvos apenas neste navegador ({scenarios.scenarios.length}{' '}
          {scenarios.scenarios.length === 1 ? 'cenário' : 'cenários'}). Exporte um backup para
          guardar uma cópia. Aperte <kbd className="font-mono">?</kbd> para ver os atalhos.
        </div>
      </footer>

      {showShortcuts && <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />}
      <ConfirmationDialog
        open={dialog !== null}
        title={dialog?.title ?? ''}
        description={dialog?.description}
        confirmLabel={dialog?.confirmLabel}
        tone={dialog?.tone}
        hideCancel={dialog?.hideCancel}
        onConfirm={dialog?.onConfirm ?? (() => undefined)}
        onClose={closeDialog}
      />
    </div>
  )
}

export default function App() {
  return (
    <FinancasProvider>
      <AppShell />
    </FinancasProvider>
  )
}
