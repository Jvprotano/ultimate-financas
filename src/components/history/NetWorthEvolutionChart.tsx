import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { HistoryPoint } from '../../types'
import { CHART_PALETTE } from '../../types/constants'
import {
  formatCurrency,
  formatCurrencyShort,
  formatMonthKey,
  formatSignedCurrency,
} from '../../lib/format'
import { SegmentedControl } from '../ui'

type View = 'change' | 'balance'

function paddedDomain(values: number[], includeZero = false): [number, number] {
  if (values.length === 0) return [0, 1]
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (includeZero) {
    min = Math.min(0, min)
    max = Math.max(0, max)
  }
  const span = max - min
  const reference = Math.max(Math.abs(min), Math.abs(max), 1)
  const padding = span > 0 ? span * 0.16 : Math.max(reference * 0.04, 100)
  return [min - padding, max + padding]
}

export function NetWorthEvolutionChart({ points }: { points: HistoryPoint[] }) {
  const visiblePoints = useMemo(() => points.slice(-12), [points])
  const [view, setView] = useState<View>(visiblePoints.length > 1 ? 'change' : 'balance')
  const data = useMemo(() => {
    const first = visiblePoints[0]
    return visiblePoints.map((point) => ({
      month: formatMonthKey(point.month),
      financialBalance: point.financialNetWorth,
      totalBalance: point.netWorth,
      financialChange: point.financialNetWorth - (first?.financialNetWorth ?? 0),
      totalChange: point.netWorth - (first?.netWorth ?? 0),
    }))
  }, [visiblePoints])

  const financialDomain = paddedDomain(data.map((point) => point.financialBalance))
  const totalDomain = paddedDomain(data.map((point) => point.totalBalance))
  const changeDomain = paddedDomain(
    data.flatMap((point) => [point.financialChange, point.totalChange]),
    true,
  )
  const previous = visiblePoints.at(-2)
  const latest = visiblePoints.at(-1)
  const latestFinancialChange = previous && latest
    ? latest.financialNetWorth - previous.financialNetWorth
    : null
  const latestTotalChange = previous && latest ? latest.netWorth - previous.netWorth : null

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <SegmentedControl
            options={[
              { value: 'change', label: 'Variação' },
              { value: 'balance', label: 'Saldo' },
            ]}
            value={view}
            onChange={setView}
            className="w-[210px]"
          />
          <p className="mt-1.5 max-w-xl text-[10px] leading-relaxed text-dark-text-muted">
            {view === 'change'
              ? 'Quanto cada patrimônio mudou desde o primeiro mês visível.'
              : 'Saldos reais com escalas independentes: financeiro à esquerda e total à direita.'}
          </p>
        </div>
        {latestFinancialChange !== null && latestTotalChange !== null && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-right text-[10px]">
            <span className="text-dark-text-muted">Financeiro no último mês</span>
            <strong className={latestFinancialChange >= 0 ? 'text-primary-400' : 'text-rose-400'}>
              {formatSignedCurrency(latestFinancialChange)}
            </strong>
            <span className="text-dark-text-muted">Líquido total no último mês</span>
            <strong className={latestTotalChange >= 0 ? 'text-blue-300' : 'text-rose-400'}>
              {formatSignedCurrency(latestTotalChange)}
            </strong>
          </div>
        )}
      </div>

      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-dark-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: CHART_PALETTE.aqua }} />
          Patrimônio financeiro{view === 'balance' ? ' · eixo esquerdo' : ''}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: CHART_PALETTE.blue }} />
          Patrimônio líquido total{view === 'balance' ? ' · eixo direito' : ''}
        </span>
      </div>

      <div
        className="h-64 min-w-0"
        role="img"
        aria-label={
          view === 'change'
            ? 'Variação mensal do patrimônio financeiro e do patrimônio líquido total'
            : 'Saldos mensais do patrimônio financeiro e do patrimônio líquido total em escalas separadas'
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: view === 'balance' ? 8 : 2, left: 2, bottom: 0 }} accessibilityLayer>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.055)" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--color-dark-text-muted)', fontSize: 10 }}
            />
            {view === 'change' ? (
              <YAxis
                width={64}
                domain={changeDomain}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--color-dark-text-muted)', fontSize: 10 }}
                tickFormatter={formatCurrencyShort}
              />
            ) : (
              <>
                <YAxis
                  yAxisId="financial"
                  width={62}
                  domain={financialDomain}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: CHART_PALETTE.aqua, fontSize: 10 }}
                  tickFormatter={formatCurrencyShort}
                />
                <YAxis
                  yAxisId="total"
                  orientation="right"
                  width={62}
                  domain={totalDomain}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: CHART_PALETTE.blue, fontSize: 10 }}
                  tickFormatter={formatCurrencyShort}
                />
              </>
            )}
            <Tooltip
              contentStyle={{
                background: 'var(--color-dark-surface)',
                border: '1px solid var(--color-dark-border)',
                borderRadius: 10,
                boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
              }}
              itemStyle={{ color: 'var(--color-dark-text-secondary)', fontSize: 12 }}
              labelStyle={{ color: 'var(--color-dark-text)', fontSize: 11, marginBottom: 6 }}
              formatter={(value, name) => {
                const numericValue = Number(value ?? 0)
                const label = String(name).startsWith('financial')
                  ? 'Patrimônio financeiro'
                  : 'Patrimônio líquido total'
                return [
                  view === 'change' ? formatSignedCurrency(numericValue) : formatCurrency(numericValue),
                  label,
                ]
              }}
            />
            {view === 'change' && <ReferenceLine y={0} stroke="rgba(255,255,255,0.22)" />}
            <Line
              yAxisId={view === 'balance' ? 'financial' : undefined}
              type="monotone"
              dataKey={view === 'change' ? 'financialChange' : 'financialBalance'}
              stroke={CHART_PALETTE.aqua}
              strokeWidth={2.25}
              dot={{ r: 3, fill: CHART_PALETTE.aqua, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
            <Line
              yAxisId={view === 'balance' ? 'total' : undefined}
              type="monotone"
              dataKey={view === 'change' ? 'totalChange' : 'totalBalance'}
              stroke={CHART_PALETTE.blue}
              strokeDasharray={view === 'change' ? '5 4' : undefined}
              strokeWidth={2.25}
              dot={{ r: 3, fill: CHART_PALETTE.blue, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
