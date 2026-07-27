import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface CardProps {
  title: string
  icon: ReactNode
  children: ReactNode
  className?: string
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
      } catch {
        /* quota exceeded */
      }
    }
  }

  const HeaderTag = collapsible ? 'button' : 'div'

  return (
    <section
      className={`overflow-hidden rounded-xl border border-dark-border bg-dark-card ${className}`}
    >
      <HeaderTag
        {...(collapsible
          ? { type: 'button' as const, onClick: toggleCollapse, 'aria-expanded': !collapsed }
          : {})}
        className={`flex w-full items-center gap-2.5 px-5 py-4 text-left ${
          collapsed ? '' : 'border-b border-dark-border-subtle'
        } ${collapsible ? 'select-none transition-colors hover:bg-dark-hover/40' : ''}`}
      >
        <span className="shrink-0 text-dark-text-muted">{icon}</span>
        <h2 className="flex-1 text-[15px] font-semibold tracking-tight text-dark-text">{title}</h2>
        {headerExtra && (
          <span
            onClick={(event) => event.stopPropagation()}
            className="shrink-0"
            role="presentation"
          >
            {headerExtra}
          </span>
        )}
        {collapsible && (
          <ChevronDown
            size={16}
            className={`shrink-0 text-dark-text-muted transition-transform duration-200 ${
              collapsed ? '-rotate-90' : ''
            }`}
          />
        )}
      </HeaderTag>
      {!collapsed && <div className="p-5">{children}</div>}
    </section>
  )
}
