import { ChevronLeft, ChevronRight, CalendarRange } from 'lucide-react'
import { formatMonthLong } from '../lib/format'
import { useFinancasStore } from '../context/financasStore'
import { cycleSalaryMonth, cycleSpendingMonth } from '../lib/activeCycle'

/** Seletor discreto do ciclo ativo — fica no header perto do cenário. */
export function CycleSwitcher() {
  const { activeCycle } = useFinancasStore()
  const { cycle, shiftCycle } = activeCycle
  const salaryMonth = cycleSalaryMonth(cycle.month)
  const spendingMonth = cycleSpendingMonth(cycle.month)

  return (
    <div className="flex items-center gap-1 rounded-lg border border-dark-border bg-dark-surface px-1 py-1">
      <button
        type="button"
        onClick={() => shiftCycle(-1)}
        className="rounded-md p-1.5 text-dark-text-muted transition-colors hover:bg-dark-hover hover:text-dark-text"
        aria-label="Ciclo anterior"
        title="Ciclo anterior"
      >
        <ChevronLeft size={14} />
      </button>
      <div className="min-w-0 px-1 text-center">
        <span className="flex items-center justify-center gap-1 text-[11px] font-medium uppercase tracking-wider text-dark-text-muted">
          <CalendarRange size={11} />
          Ciclo
        </span>
        <strong className="block truncate text-sm font-semibold text-dark-text">
          {formatMonthLong(cycle.month)}
        </strong>
        <span className="hidden text-[10px] text-dark-text-muted sm:block">
          salário {formatMonthLong(salaryMonth).split(' de ')[0]} · cartão{' '}
          {formatMonthLong(spendingMonth).split(' de ')[0]}
        </span>
      </div>
      <button
        type="button"
        onClick={() => shiftCycle(1)}
        className="rounded-md p-1.5 text-dark-text-muted transition-colors hover:bg-dark-hover hover:text-dark-text"
        aria-label="Próximo ciclo"
        title="Próximo ciclo"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  )
}
