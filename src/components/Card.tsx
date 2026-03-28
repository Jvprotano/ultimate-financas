import type { ReactNode } from 'react'

interface CardProps {
  title: string
  icon: ReactNode
  children: ReactNode
  className?: string
  accentColor?: string
}

export function Card({ title, icon, children, className = '', accentColor = 'bg-primary-600' }: CardProps) {
  return (
    <section
      className={`bg-dark-card rounded-2xl shadow-sm border border-dark-border overflow-hidden ${className}`}
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-dark-border-subtle">
        <div className={`flex items-center justify-center w-9 h-9 rounded-xl ${accentColor} text-white`}>
          {icon}
        </div>
        <h2 className="text-lg font-semibold text-dark-text">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}
