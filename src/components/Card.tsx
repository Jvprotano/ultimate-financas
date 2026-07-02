import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface CardProps {
  title: string
  icon: ReactNode
  children: ReactNode
  className?: string
  /** Mantido por compatibilidade; o estilo atual usa ícones neutros. */
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
    <section className={`overflow-hidden rounded-xl border border-dark-border bg-dark-card ${className}`}>
      <div
        className={`flex items-center gap-2.5 px-5 py-4 ${collapsed ? '' : 'border-b border-dark-border-subtle'} ${
          collapsible ? 'cursor-pointer select-none transition-colors hover:bg-dark-hover/40' : ''
        }`}
        onClick={collapsible ? toggleCollapse : undefined}
      >
        <span className="shrink-0 text-dark-text-muted">{icon}</span>
        <h2 className="flex-1 text-[15px] font-semibold tracking-tight text-dark-text">{title}</h2>
        {headerExtra && <div onClick={(e) => e.stopPropagation()}>{headerExtra}</div>}
        {collapsible && (
          <ChevronDown
            size={16}
            className={`shrink-0 text-dark-text-muted transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`}
          />
        )}
      </div>
      {!collapsed && <div className="p-5">{children}</div>}
    </section>
  )
}
