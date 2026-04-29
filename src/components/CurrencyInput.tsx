import { useRef, useCallback } from 'react'

interface CurrencyInputProps {
  value: number
  onChange: (value: number) => void
  placeholder?: string
  className?: string
  id?: string
}

export function CurrencyInput({ value, onChange, placeholder = '0,00', className = '', id }: CurrencyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const formatDisplay = (val: number): string => {
    if (val === 0) return ''
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^\d]/g, '')
      const numeric = parseInt(raw, 10)
      if (isNaN(numeric)) {
        onChange(0)
        return
      }
      onChange(numeric / 100)
    },
    [onChange],
  )

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-text-muted font-medium text-sm">
        R$
      </span>
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        value={formatDisplay(value)}
        onChange={handleChange}
        placeholder={placeholder}
        className={`w-full pl-10 pr-4 py-2.5 rounded-lg border border-dark-border bg-dark-input text-dark-text font-medium text-right
          focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500
          transition-all placeholder:text-dark-text-muted ${className}`}
      />
    </div>
  )
}
