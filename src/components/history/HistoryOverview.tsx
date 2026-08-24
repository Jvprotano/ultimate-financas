import { ChartColumn, Landmark } from 'lucide-react'
import type { HistoryPoint } from '../../types'
import { formatCurrency, formatMonthKey } from '../../lib/format'
import { Panel, PanelHeader } from '../ui'

interface CurrentWealth {
  financialAssets: number
  financialNetWorth: number
  physicalAssets: number
  securedLiabilities: number
  netWorth: number
}

function ContributionRow({
  point,
  scale,
  latest,
}: {
  point: HistoryPoint
  scale: number
  latest: boolean
}) {
  const width = Math.min(100, (Math.abs(point.invested) / scale) * 100)
  const isWithdrawal = point.invested < -0.005

  return (
    <div
      className={`grid grid-cols-[3.25rem_minmax(0,1fr)] gap-3 rounded-lg px-2.5 py-2 ${
        latest ? 'bg-primary-500/[0.045]' : 'bg-dark-input/20'
      }`}
    >
      <span className="pt-0.5 text-[11px] font-medium text-dark-text-muted">
        {formatMonthKey(point.month)}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <strong
            className={`text-sm tabular-nums ${
              isWithdrawal ? 'text-rose-300' : 'text-dark-text'
            }`}
          >
            {formatCurrency(point.invested)}
          </strong>
          <span className="text-[10px] tabular-nums text-dark-text-muted">
            custos {formatCurrency(point.costs)} · {point.savingsRate.toFixed(1)}% da renda
          </span>
        </div>
        <div
          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-dark-border-subtle"
          role="img"
          aria-label={`${formatMonthKey(point.month)}: aporte líquido de ${formatCurrency(point.invested)}`}
        >
          <span
            className={`block h-full rounded-full ${
              isWithdrawal ? 'bg-rose-400/75' : 'bg-primary-400/80'
            }`}
            style={{ width: `${Math.max(point.invested === 0 ? 0 : 3, width)}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function WealthRow({
  label,
  value,
  detail,
  accent = false,
}: {
  label: string
  value: number
  detail: string
  accent?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <span className="block text-[11px] font-medium text-dark-text-secondary">{label}</span>
        <span className="mt-0.5 block text-[10px] leading-relaxed text-dark-text-muted">
          {detail}
        </span>
      </div>
      <strong
        className={`shrink-0 text-sm tabular-nums ${
          accent ? 'text-primary-300' : 'text-dark-text'
        }`}
      >
        {formatCurrency(value)}
      </strong>
    </div>
  )
}

export function HistoryOverview({
  points,
  current,
}: {
  points: HistoryPoint[]
  current: CurrentWealth
}) {
  const visiblePoints = points.slice(-6)
  const contributionScale = Math.max(
    1,
    ...visiblePoints.map((point) => Math.abs(point.invested)),
  )
  const unsecuredLiabilities = Math.max(
    0,
    current.financialAssets - current.financialNetWorth,
  )
  const propertyEquity = current.netWorth - current.financialNetWorth

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.8fr)]">
      <Panel className="min-w-0">
        <PanelHeader
          title="Aportes por ciclo"
          icon={<ChartColumn size={16} />}
          description="Previdência em folha mais aportes e resgates do livro-razão, sempre pela competência atual."
        />
        <div className="mt-3 space-y-1.5">
          {visiblePoints.map((point, index) => (
            <ContributionRow
              key={point.id}
              point={point}
              scale={contributionScale}
              latest={index === visiblePoints.length - 1}
            />
          ))}
        </div>
        <p className="mt-2.5 text-[10px] leading-relaxed text-dark-text-muted">
          Alterar a competência de uma movimentação atualiza estes ciclos imediatamente. Saldos
          iniciais não contam como aporte.
        </p>
      </Panel>

      <Panel>
        <PanelHeader
          title="Patrimônio hoje"
          icon={<Landmark size={16} />}
          description="Composição atual, separada dos fechamentos mensais."
        />
        <div className="mt-2 divide-y divide-dark-border-subtle">
          <WealthRow
            label="Financeiro líquido"
            value={current.financialNetWorth}
            detail={
              unsecuredLiabilities > 0
                ? `${formatCurrency(current.financialAssets)} em dinheiro e investimentos − ${formatCurrency(unsecuredLiabilities)} em dívidas sem bem`
                : 'dinheiro e investimentos; sem dívidas descobertas'
            }
            accent
          />
          <WealthRow
            label="Patrimônio nos bens"
            value={propertyEquity}
            detail={`${formatCurrency(current.physicalAssets)} em bens − ${formatCurrency(current.securedLiabilities)} financiados`}
          />
          <WealthRow
            label="Patrimônio líquido total"
            value={current.netWorth}
            detail="financeiro líquido + parte já sua nos bens"
          />
        </div>
        <p className="mt-2 rounded-lg border border-dark-border-subtle bg-dark-input/20 px-2.5 py-2 text-[10px] leading-relaxed text-dark-text-muted">
          Este bloco usa os valores atuais de Patrimônio. Mudar apenas o ciclo de um aporte não
          altera quanto você possui hoje.
        </p>
      </Panel>
    </div>
  )
}
