import { Fragment, useState } from 'react'
import { CalendarCheck, History, Pencil, Trash2, TrendingUp } from 'lucide-react'
import { ActualsPanel } from './ActualsPanel'
import { CurrencyInput } from './CurrencyInput'
import {
  ConfirmButton,
  EmptyState,
  Panel,
  PanelHeader,
  PrimaryButton,
  SecondaryButton,
  StatTile,
  Tag,
  TrendChart,
  type TrendSeries,
} from './ui'
import {
  formatCurrency,
  formatMonthKey,
  formatMonthLong,
  inputClass,
} from '../lib/format'
import { useFinancasStore } from '../context/financasStore'
import type { HistoryPoint, SnapshotPatch } from '../types'
import { BUDGET_AREA_COLORS, CHART_PALETTE } from '../types/constants'

/**
 * Correção de um mês já fechado. Refechar substituiria tudo pelos números de
 * hoje — inútil quando o erro está três meses atrás.
 */
function SnapshotEditor({ point, onClose }: { point: HistoryPoint; onClose: () => void }) {
  const { history } = useFinancasStore()
  const set = (patch: SnapshotPatch) => history.updateSnapshot(point.id, patch)

  const fields: { label: string; value: number; key: keyof SnapshotPatch }[] = [
    { label: 'Base do orçamento', value: point.availableForBudget, key: 'availableForBudget' },
    { label: 'Salário na conta', value: point.paycheckInAccount, key: 'paycheckInAccount' },
    { label: 'Custos', value: point.costs, key: 'costs' },
    { label: 'Desejos', value: point.wants, key: 'wants' },
    { label: 'Investido', value: point.invested, key: 'invested' },
    { label: 'Ativos', value: point.grossAssets, key: 'grossAssets' },
    { label: 'Dívidas', value: point.liabilities, key: 'liabilities' },
    { label: 'Fatura (sua parte)', value: point.cardPersonalTotal, key: 'cardPersonalTotal' },
  ]

  return (
    <tr className="border-t border-dark-border-subtle bg-dark-surface/40">
      <td colSpan={9} className="px-5 py-4">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {fields.map((field) => (
            <label key={field.key} className="block">
              <span className="mb-1 block text-[11px] text-dark-text-muted">{field.label}</span>
              <CurrencyInput
                value={field.value}
                onChange={(value) => set({ [field.key]: value } as SnapshotPatch)}
                className="!py-1.5"
              />
            </label>
          ))}
          <label className="block sm:col-span-2 xl:col-span-4">
            <span className="mb-1 block text-[11px] text-dark-text-muted">Nota do mês</span>
            <input
              value={point.note ?? ''}
              onChange={(event) => set({ note: event.target.value })}
              placeholder="ex.: 13º salário, mudança de aluguel"
              className={`${inputClass} !py-1.5`}
            />
          </label>
        </div>
        <p className="mt-2.5 text-[11px] leading-relaxed text-dark-text-muted">
          A taxa de poupança e o patrimônio líquido são recalculados a partir do que você editar.
          Patrimônio líquido: {formatCurrency(point.grossAssets - point.liabilities)}.
        </p>
        <div className="mt-2.5 flex gap-2">
          <SecondaryButton onClick={onClose}>Fechar</SecondaryButton>
        </div>
      </td>
    </tr>
  )
}

export function HistoryView() {
  const { history, metrics, investments, cards, cashFlow, actuals, closeCurrentMonth } =
    useFinancasStore()
  const { points, stats, currentMonth, isCurrentMonthClosed } = history
  const [note, setNote] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const labels = points.map((point) => formatMonthKey(point.month))
  const hasLiabilities = points.some((point) => point.liabilities > 0)
  const netWorthSeries: TrendSeries[] = [
    {
      id: 'net-worth',
      label: hasLiabilities ? 'Patrimônio líquido' : 'Patrimônio',
      color: CHART_PALETTE.aqua,
      values: points.map((point) => point.netWorth),
    },
    // Só vale mostrar as duas curvas quando elas de fato divergem.
    ...(hasLiabilities
      ? [
          {
            id: 'assets',
            label: 'Ativos',
            color: CHART_PALETTE.blue,
            values: points.map((point) => point.grossAssets),
          },
        ]
      : []),
  ]
  const flowSeries: TrendSeries[] = [
    {
      id: 'costs',
      label: 'Custos',
      color: BUDGET_AREA_COLORS.necessidades,
      values: points.map((point) => point.costs),
    },
    {
      id: 'wants',
      label: 'Desejos',
      color: BUDGET_AREA_COLORS.desejos,
      values: points.map((point) => point.wants),
    },
    {
      id: 'invested',
      label: 'Investido',
      color: BUDGET_AREA_COLORS.investimentos,
      values: points.map((point) => point.invested),
    },
  ]

  const handleClose = () => {
    closeCurrentMonth(currentMonth, note)
    setNote('')
  }

  const reversed = [...points].reverse()

  return (
    <div className="space-y-4">
      <ActualsPanel />

      <Panel>
        <PanelHeader
          title={`Fechar ${formatMonthLong(currentMonth)}`}
          icon={<CalendarCheck size={16} />}
          description="Congela os números de hoje como o resultado do mês: o plano, o realizado na fatura e a sobra em caixa. É o que alimenta os gráficos e as médias."
          actions={
            isCurrentMonthClosed ? (
              <ConfirmButton onConfirm={handleClose} confirmLabel="Substituir" tone="primary">
                Refechar o mês
              </ConfirmButton>
            ) : (
              <PrimaryButton onClick={handleClose}>
                <CalendarCheck size={15} />
                Fechar o mês
              </PrimaryButton>
            )
          }
        />

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
          <StatTile label="Base do mês" value={formatCurrency(metrics.availableForBudget)} />
          <StatTile
            label="Custos"
            value={formatCurrency(actuals.summary.effectiveCosts)}
            detail={
              actuals.summary.informedCount > 0
                ? `realizado · plano era ${formatCurrency(actuals.summary.plannedCosts)}`
                : 'do plano — informe o realizado acima'
            }
          />
          <StatTile label="Investido" value={formatCurrency(metrics.totalPlannedInvestment)} />
          <StatTile
            label="Fatura (sua parte)"
            value={formatCurrency(cards.summary.currentPersonalTotal)}
            detail="o realizado do ciclo"
          />
          <StatTile
            label="Patrimônio líquido"
            value={formatCurrency(investments.summary.netWorth)}
            detail={
              investments.summary.liabilities > 0
                ? `${formatCurrency(investments.summary.grossAssets)} em ativos − ${formatCurrency(investments.summary.liabilities)}`
                : `sobra em caixa: ${formatCurrency(cashFlow.leftover)}`
            }
            tone="accent"
          />
        </div>

        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Nota do mês (opcional) — ex.: 13º salário, mudança de aluguel"
          className={`${inputClass} mt-2.5`}
          aria-label="Nota do mês"
        />

        {isCurrentMonthClosed && (
          <p className="mt-2 text-xs text-dark-text-muted">
            {formatMonthLong(currentMonth)} já está fechado. Refechar substitui o registro pelos
            números atuais.
          </p>
        )}
      </Panel>

      {points.length === 0 ? (
        <EmptyState icon={<History size={26} />} title="Nenhum mês fechado ainda">
          O app hoje só conhece o seu plano. Fechando o mês ele passa a guardar o que de fato
          aconteceu — e a partir do segundo fechamento aparecem a evolução do patrimônio, o custo
          médio real e a comparação entre meses.
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Meses fechados"
              value={String(stats.months)}
              detail={`desde ${formatMonthKey(points[0].month)}`}
            />
            <StatTile
              label="Custo médio"
              value={formatCurrency(stats.averageCosts)}
              detail={
                stats.averageCardPersonal > 0
                  ? `+ ${formatCurrency(stats.averageCardPersonal)}/mês de fatura`
                  : 'média dos meses fechados'
              }
            />
            <StatTile
              label="Poupança média"
              value={`${stats.averageSavingsRate.toFixed(0)}%`}
              detail={`${formatCurrency(stats.averageInvested)}/mês investidos`}
              tone="accent"
            />
            <StatTile
              label="Patrimônio"
              value={`${stats.netWorthGrowth >= 0 ? '+' : '−'} ${formatCurrency(Math.abs(stats.netWorthGrowth))}`}
              detail={
                stats.months > 1
                  ? `${stats.netWorthGrowthPct >= 0 ? '+' : ''}${stats.netWorthGrowthPct.toFixed(1)}% no período`
                  : 'feche mais um mês para comparar'
              }
              tone={stats.netWorthGrowth >= 0 ? 'positive' : 'negative'}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel>
              <PanelHeader title="Evolução do patrimônio" icon={<TrendingUp size={16} />} />
              <div className="mt-4">
                <TrendChart labels={labels} series={netWorthSeries} height={220} />
              </div>
            </Panel>

            <Panel>
              <PanelHeader title="Para onde foi a renda" />
              <div className="mt-4">
                <TrendChart labels={labels} series={flowSeries} height={220} />
              </div>
            </Panel>
          </div>

          <Panel padded={false}>
            <h3 className="border-b border-dark-border-subtle px-5 py-4 text-sm font-semibold tracking-tight text-dark-text">
              Meses fechados
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-dark-text-muted">
                    <th className="px-5 py-2.5 font-medium">Mês</th>
                    <th className="px-4 py-2.5 text-right font-medium">Base</th>
                    <th className="px-4 py-2.5 text-right font-medium">Custos</th>
                    <th className="px-4 py-2.5 text-right font-medium">Desejos</th>
                    <th className="px-4 py-2.5 text-right font-medium">Investido</th>
                    <th className="px-4 py-2.5 text-right font-medium">Cartão</th>
                    <th className="px-4 py-2.5 text-right font-medium">Poupança</th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      {hasLiabilities ? 'Líquido' : 'Patrimônio'}
                    </th>
                    <th className="px-5 py-2.5 text-right font-medium sr-only">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {reversed.map((point) => (
                    <Fragment key={point.id}>
                    <tr className="group border-t border-dark-border-subtle">
                      <td className="px-5 py-2.5">
                        <span className="font-medium text-dark-text">
                          {formatMonthKey(point.month)}
                        </span>
                        {point.note && (
                          <span className="ml-2 text-xs text-dark-text-muted">{point.note}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-dark-text-secondary">
                        {formatCurrency(point.availableForBudget)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-dark-text-secondary">
                        {formatCurrency(point.costs)}
                        {point.costsDelta !== null && Math.abs(point.costsDelta) > 0.005 && (
                          <span
                            className={`ml-1.5 text-[11px] ${
                              point.costsDelta > 0 ? 'text-rose-400' : 'text-primary-400'
                            }`}
                          >
                            {point.costsDelta > 0 ? '↑' : '↓'}
                          </span>
                        )}
                        {Math.abs(point.costs - point.costsPlanned) > 0.005 && (
                          <span
                            className="ml-1 text-[11px] text-dark-text-muted"
                            title={`Plano era ${formatCurrency(point.costsPlanned)}`}
                          >
                            *
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-dark-text-secondary">
                        {formatCurrency(point.wants)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-dark-text-secondary">
                        {formatCurrency(point.invested)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-dark-text-secondary">
                        {point.cardPersonalTotal > 0 ? formatCurrency(point.cardPersonalTotal) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-dark-text-secondary">
                        {point.savingsRate.toFixed(0)}%
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-dark-text">
                        {formatCurrency(point.netWorth)}
                        {point.netWorthDelta !== null && (
                          <span
                            className={`ml-1.5 text-[11px] ${
                              point.netWorthDelta >= 0 ? 'text-primary-400' : 'text-rose-400'
                            }`}
                          >
                            {point.netWorthDelta >= 0 ? '+' : '−'}
                            {formatCurrency(Math.abs(point.netWorthDelta)).replace('R$', '').trim()}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingId((prev) => (prev === point.id ? null : point.id))
                          }
                          className={`rounded-md p-1.5 transition-all focus-visible:opacity-100 group-hover:opacity-100 ${
                            editingId === point.id
                              ? 'bg-dark-hover text-dark-text opacity-100'
                              : 'text-dark-text-muted opacity-0 hover:text-dark-text'
                          }`}
                          aria-label={`Corrigir ${formatMonthKey(point.month)}`}
                          aria-expanded={editingId === point.id}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => history.removeSnapshot(point.id)}
                          className="rounded-md p-1.5 text-dark-text-muted opacity-0 transition-all hover:bg-rose-500/10 hover:text-rose-400 focus-visible:opacity-100 group-hover:opacity-100"
                          aria-label={`Apagar ${formatMonthKey(point.month)}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                    {editingId === point.id && (
                      <SnapshotEditor point={point} onClose={() => setEditingId(null)} />
                    )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            {stats.bestSavingsMonth && stats.months > 1 && (
              <p className="border-t border-dark-border-subtle px-5 py-3 text-xs text-dark-text-muted">
                Melhor mês de poupança:{' '}
                <Tag>{formatMonthKey(stats.bestSavingsMonth.month)}</Tag>{' '}
                com {stats.bestSavingsMonth.savingsRate.toFixed(0)}%.
              </p>
            )}
          </Panel>
        </>
      )}
    </div>
  )
}
