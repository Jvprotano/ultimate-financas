import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatMonthKey } from '../lib/format'
import { useFinancasStore } from '../context/financasStore'

/**
 * Chip discreto do ciclo ativo no header — mesma altura do seletor de cenário.
 * Ajuste fino mora no hub Ciclo; aqui só um atalho raro.
 */
export function CycleSwitcher() {
  const { activeCycle } = useFinancasStore()
  const { cycle, shiftCycle } = activeCycle

  return (
    <div
      className="flex h-[38px] items-center rounded-lg border border-dark-border/70 bg-transparent px-0.5 text-sm text-dark-text-muted"
      title={`Ciclo ${cycle.month}`}
    >
      <button
        type="button"
        onClick={() => shiftCycle(-1)}
        className="rounded-md p-1.5 transition-colors hover:bg-dark-hover hover:text-dark-text"
        aria-label="Ciclo anterior"
      >
        <ChevronLeft size={14} />
      </button>
      <span className="min-w-[4.5rem] px-0.5 text-center tabular-nums">
        <span className="text-[11px] text-dark-text-muted/70">Ciclo </span>
        <strong className="font-medium text-dark-text-secondary">{formatMonthKey(cycle.month)}</strong>
      </span>
      <button
        type="button"
        onClick={() => shiftCycle(1)}
        className="rounded-md p-1.5 transition-colors hover:bg-dark-hover hover:text-dark-text"
        aria-label="Próximo ciclo"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  )
}
