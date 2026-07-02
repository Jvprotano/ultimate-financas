import { formatCurrency } from '../utils'

interface HeaderMetricProps {
  amount: number
  baseAmount: number
  label?: string
  tone?: 'primary' | 'emerald' | 'amber' | 'rose' | 'violet' | 'slate'
}

const toneClass = {
  primary: 'text-primary-400',
  emerald: 'text-primary-400',
  amber: 'text-amber-400',
  rose: 'text-rose-400',
  violet: 'text-violet-400',
  slate: 'text-dark-text-secondary',
}

export function HeaderMetric({ amount, baseAmount, label, tone = 'primary' }: HeaderMetricProps) {
  const percentage = baseAmount > 0 ? (amount / baseAmount) * 100 : 0
  const showShare = baseAmount > 0 && Math.abs(amount - baseAmount) > 0.005

  return (
    <div className="text-right leading-tight">
      {label && (
        <span className="block text-[10px] font-medium uppercase tracking-wider text-dark-text-muted">{label}</span>
      )}
      <span className={`block text-sm font-semibold tabular-nums ${toneClass[tone]}`}>
        {formatCurrency(amount)}
      </span>
      {showShare && (
        <span className="block text-[11px] tabular-nums text-dark-text-muted">{percentage.toFixed(0)}% da base</span>
      )}
    </div>
  )
}
