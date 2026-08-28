import { useCallback } from 'react'

interface CurrencyInputProps {
  value: number
  onChange: (value: number) => void
  placeholder?: string
  className?: string
  id?: string
  onBlur?: () => void
  autoFocus?: boolean
  ariaLabel?: string
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = '0,00',
  className = '',
  id,
  onBlur,
  autoFocus = false,
  ariaLabel,
}: CurrencyInputProps) {
  const formatDisplay = (val: number): string => {
    if (val === 0) return ''
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^\d]/g, '')
      const numeric = parseInt(raw, 10)
      onChange(isNaN(numeric) ? 0 : numeric / 100)
    },
    [onChange],
  )

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-dark-text-muted">
        R$
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={formatDisplay(value)}
        onChange={handleChange}
        onBlur={onBlur}
        autoFocus={autoFocus}
        aria-label={ariaLabel}
        placeholder={placeholder}
        className={`app-field w-full py-2.5 pl-10 pr-3 text-right text-sm font-medium tabular-nums placeholder:text-dark-text-muted ${className}`}
      />
    </div>
  )
}
