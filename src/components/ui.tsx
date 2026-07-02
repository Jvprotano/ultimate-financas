import type { ReactNode } from 'react'
import { formatCurrency } from '../utils'

// ---------------------------------------------------------------------------
// Peças visuais compartilhadas do dashboard e dos módulos de planejamento.
// Marcações finas, extremidades arredondadas, separação de 2px entre
// segmentos e rótulos diretos — texto sempre em tokens de texto, nunca na
// cor da série.
// ---------------------------------------------------------------------------

export interface Segment {
  id: string
  label: string
  value: number
  color: string
}

/** Barra empilhada horizontal (parte-de-um-todo) com legenda de rótulos diretos. */
export function SegmentedBar({
  segments,
  total,
  height = 10,
}: {
  segments: Segment[]
  /** Base da barra; segmentos além dela são truncados, abaixo dela sobra trilho. */
  total?: number
  height?: number
}) {
  const visible = segments.filter((s) => s.value > 0)
  const sum = visible.reduce((acc, s) => acc + s.value, 0)
  const base = total && total > 0 ? Math.max(total, sum) : sum

  if (base <= 0) return null

  return (
    <div>
      <div
        className="flex w-full gap-[2px] overflow-hidden rounded-full bg-white/[0.06]"
        style={{ height }}
        role="img"
        aria-label={visible.map((s) => `${s.label}: ${formatCurrency(s.value)}`).join(', ')}
      >
        {visible.map((s) => (
          <div
            key={s.id}
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${(s.value / base) * 100}%`, backgroundColor: s.color }}
            title={`${s.label}: ${formatCurrency(s.value)}`}
          />
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
        {visible.map((s) => (
          <span key={s.id} className="flex items-center gap-1.5 text-xs">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-dark-text-secondary">{s.label}</span>
            <span className="font-medium tabular-nums text-dark-text">{formatCurrency(s.value)}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/** Medidor simples: valor sobre um trilho, com estouro sinalizado. */
export function Meter({
  value,
  max,
  color,
  height = 6,
}: {
  value: number
  max: number
  color: string
  height?: number
}) {
  const pct = max > 0 ? (value / max) * 100 : 0
  const over = pct > 100

  return (
    <div className="w-full overflow-hidden rounded-full bg-white/[0.06]" style={{ height }}>
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{
          width: `${Math.min(100, pct)}%`,
          backgroundColor: over ? 'var(--color-rose-500, #f43f5e)' : color,
        }}
      />
    </div>
  )
}

/** Linha de barra horizontal com rótulo direto — para rankings de magnitude. */
export function BarRow({
  label,
  value,
  max,
  color,
  sublabel,
}: {
  label: string
  value: number
  max: number
  color: string
  sublabel?: string
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
        <span className="min-w-0 truncate text-dark-text-secondary">
          {label}
          {sublabel && <span className="ml-1.5 text-dark-text-muted">{sublabel}</span>}
        </span>
        <span className="shrink-0 font-medium tabular-nums text-dark-text">{formatCurrency(value)}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

/** Tile de estatística: rótulo, valor e detalhe — sem moldura colorida. */
export function StatTile({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string
  value: string
  detail?: ReactNode
  tone?: 'neutral' | 'positive' | 'negative' | 'accent'
}) {
  const valueClass = {
    neutral: 'text-dark-text',
    positive: 'text-primary-400',
    negative: 'text-rose-400',
    accent: 'text-primary-400',
  }[tone]

  return (
    <div className="rounded-xl border border-dark-border bg-dark-card px-4 py-3.5">
      <span className="block text-[11px] font-medium uppercase tracking-wider text-dark-text-muted">{label}</span>
      <strong className={`mt-1 block text-lg font-semibold leading-tight tracking-tight tabular-nums ${valueClass}`}>
        {value}
      </strong>
      {detail && <span className="mt-0.5 block text-xs text-dark-text-muted">{detail}</span>}
    </div>
  )
}

/** Botão de ação primário compacto. */
export function PrimaryButton({
  children,
  onClick,
  disabled,
  className = '',
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  )
}

/** Chip de sugestão. */
export function SuggestionChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-dark-border bg-dark-surface px-3 py-1 text-xs text-dark-text-secondary transition-colors hover:border-primary-500/50 hover:text-primary-300"
    >
      + {label}
    </button>
  )
}

