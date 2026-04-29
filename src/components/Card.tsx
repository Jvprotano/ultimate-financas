import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface CardProps {
  title: string
  icon: ReactNode
  children: ReactNode
  className?: string
  accentColor?: string
  collapsible?: boolean
  storageKey?: string
  defaultCollapsed?: boolean
  headerExtra?: ReactNode
}

export function Card({
  title,
  icon,
  children,
  className = '',
  accentColor = 'bg-primary-600',
  collapsible = false,
  storageKey,
  defaultCollapsed = false,
  headerExtra,
}: CardProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (!collapsible || !storageKey) return defaultCollapsed
    try {
      const stored = localStorage.getItem(`uf_collapsed_${storageKey}`)
      return stored !== null ? stored === 'true' : defaultCollapsed
    } catch {
      return defaultCollapsed
    }
  })

  const toggleCollapse = () => {
    const next = !collapsed
    setCollapsed(next)
    if (storageKey) {
      try {
        localStorage.setItem(`uf_collapsed_${storageKey}`, String(next))
      } catch { /* quota exceeded */ }
    }
  }

  return (
    <section
      className={`bg-dark-card rounded-lg shadow-sm border border-dark-border overflow-hidden ${className}`}
    >
      <div
        className={`flex items-center gap-3 px-5 py-4 ${collapsed ? '' : 'border-b border-dark-border-subtle'} ${collapsible ? 'cursor-pointer select-none hover:bg-dark-hover/50 transition-colors' : ''}`}
        onClick={collapsible ? toggleCollapse : undefined}
      >
        <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${accentColor} text-white shrink-0`}>
          {icon}
        </div>
        <h2 className="text-lg font-semibold text-dark-text flex-1">{title}</h2>
        {headerExtra && (
          <div onClick={(e) => e.stopPropagation()}>
            {headerExtra}
          </div>
        )}
        {collapsible && (
          <ChevronDown
            size={18}
            className={`text-dark-text-muted transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`}
          />
        )}
      </div>
      {!collapsed && <div className="p-5">{children}</div>}
    </section>
  )
}
