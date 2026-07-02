export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  })
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatMonths(months: number): string {
  if (months <= 1) return '1 mês'
  if (months < 12) return `${months} meses`
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  if (remainingMonths === 0) return years === 1 ? '1 ano' : `${years} anos`
  return `${years}a ${remainingMonths}m`
}

export const inputClass =
  'w-full rounded-lg border border-dark-border bg-dark-input px-3 py-2.5 text-sm text-dark-text transition-colors placeholder:text-dark-text-muted focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25'

export const selectClass = inputClass
