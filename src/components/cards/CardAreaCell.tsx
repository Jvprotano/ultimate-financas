import type { BudgetArea } from '../../types'
import { BUDGET_AREAS, BUDGET_AREA_COLORS, BUDGET_AREA_SHORT_LABELS } from '../../types/constants'

export function CardAreaCell({
  value,
  onChange,
}: {
  value?: BudgetArea
  onChange: (area: BudgetArea | undefined) => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: value ? BUDGET_AREA_COLORS[value] : 'transparent' }} />
      <select
        value={value ?? ''}
        onChange={(event) => onChange((event.target.value || undefined) as BudgetArea | undefined)}
        aria-label="Área do orçamento"
        className={`w-full rounded border border-transparent bg-transparent px-1 py-1 text-xs outline-none transition-all focus:border-dark-border focus:bg-dark-input ${value ? 'text-dark-text-secondary' : 'text-dark-text-muted'}`}
      >
        <option value="">— área</option>
        {BUDGET_AREAS.map((area) => <option key={area} value={area}>{BUDGET_AREA_SHORT_LABELS[area]}</option>)}
      </select>
    </div>
  )
}
