import { Fragment, useState } from 'react'
import { History, Pencil, Trash2, TrendingUp } from 'lucide-react'
import { CurrencyInput } from './CurrencyInput'
import {
  EmptyState,
  ConfirmButton,
  Panel,
  PanelHeader,
  SecondaryButton,
  StatTile,
  Tag,
  TrendChart,
  type TrendSeries,
} from './ui'
import {
  formatCurrency,
  formatMonthKey,
  inputClass,
} from '../lib/format'
import { useHistoryStore } from '../context/financasStore'
import type { HistoryPoint, SnapshotPatch } from '../types'
import { BUDGET_AREA_COLORS, CHART_PALETTE } from '../types/constants'

/**
 * Correção de um mês já fechado. Refechar substituiria tudo pelos números de
 * hoje — inútil quando o erro está três meses atrás.
 */
function SnapshotEditorContent({ point, onClose }: { point: HistoryPoint; onClose: () => void }) {
  const history = useHistoryStore()
  const set = (patch: SnapshotPatch) => history.updateSnapshot(point.id, patch)

  const fields: { label: string; value: number; key: keyof SnapshotPatch }[] = [
    { label: 'Base do orçamento', value: point.availableForBudget, key: 'availableForBudget' },
    { label: 'Salário na conta', value: point.paycheckInAccount, key: 'paycheckInAccount' },
    { label: 'Entradas extras', value: point.extraIncome, key: 'extraIncome' },
    { label: 'Saídas extraordinárias', value: point.extraExpense, key: 'extraExpense' },
    { label: 'Custos', value: point.costs, key: 'costs' },
    { label: 'Desejos', value: point.wants, key: 'wants' },
    { label: 'Investido', value: point.invested, key: 'invested' },
    { label: 'Ativos financeiros', value: point.grossAssets, key: 'grossAssets' },
    { label: 'Bens', value: point.physicalAssets, key: 'physicalAssets' },
    { label: 'Dívidas', value: point.liabilities, key: 'liabilities' },
    {
      label: 'Dívida com bem',
      value: point.securedLiabilities,
      key: 'securedLiabilities',
    },
    {
      label: 'Fatura do ciclo (minha parte)',
      value: point.cardPersonalTotal,
      key: 'cardPersonalTotal',
    },
  ]

  return (
    <div>
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
          “Fatura do ciclo” é a sua parte efetivamente paga na fatura usada para encerrar o mês.
          Valores antecipados já retirados da fatura não são somados novamente. Financeiro: {formatCurrency(point.financialNetWorth)} · líquido total:{' '}
          {formatCurrency(point.grossAssets + point.physicalAssets - point.liabilities)}.
        </p>
        <div className="mt-2.5 flex gap-2">
          <SecondaryButton onClick={onClose}>Fechar</SecondaryButton>
        </div>
    </div>
  )
}

function SnapshotEditor({ point, onClose }: { point: HistoryPoint; onClose: () => void }) {
  return (
    <tr className="border-t border-dark-border-subtle bg-dark-surface/40">
      <td colSpan={9} className="px-5 py-4">
        <SnapshotEditorContent point={point} onClose={onClose} />
      </td>
    </tr>
  )
}

function HistoryActions({
  point,
  editing,
  onToggleEdit,
  onRemove,
  desktop = false,
}: {
  point: HistoryPoint
  editing: boolean
  onToggleEdit: () => void
  onRemove: () => void
  desktop?: boolean
}) {
  const visibility = desktop
    ? 'opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100'
    : ''
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={onToggleEdit}
        className={`rounded-md p-1.5 transition-all focus-visible:opacity-100 ${visibility} ${
          editing
            ? 'bg-dark-hover text-dark-text opacity-100'
            : 'text-dark-text-muted hover:bg-dark-hover hover:text-dark-text'
        }`}
        aria-label={`Corrigir ${formatMonthKey(point.month)}`}
        aria-expanded={editing}
      >
        <Pencil size={14} />
      </button>
      <ConfirmButton
        onConfirm={onRemove}
        confirmLabel="Apagar mês"
        className={`!p-1.5 ${visibility}`}
      >
        <Trash2 size={14} />
        <span className="sr-only">Apagar {formatMonthKey(point.month)}</span>
      </ConfirmButton>
    </div>
  )
}

/** Só leitura do passado — o fechamento do mês corrente vive na aba Ciclo. */
export function HistoryView() {
  const history = useHistoryStore()
  const { points, stats } = history
  const [editingId, setEditingId] = useState<string | null>(null)

  const labels = points.map((point) => formatMonthKey(point.month))
  const hasLiabilities = points.some((point) => point.liabilities > 0)
  const hasPhysicalAssets = points.some((point) => point.physicalAssets > 0)
  const netWorthSeries: TrendSeries[] = [
    {
      id: 'financial',
      label: hasLiabilities || hasPhysicalAssets ? 'Patrimônio financeiro' : 'Patrimônio',
      color: CHART_PALETTE.aqua,
      values: points.map((point) => point.financialNetWorth),
    },
    ...(hasLiabilities || hasPhysicalAssets
      ? [
          {
            id: 'net-worth',
            label: 'Patrimônio líquido total',
            color: CHART_PALETTE.blue,
            values: points.map((point) => point.netWorth),
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

  const reversed = [...points].reverse()

  if (points.length === 0) {
    return (
      <EmptyState icon={<History size={26} />} title="Nenhum mês fechado ainda">
        O histórico só mostra o que você já fechou. Vá em Ciclo para registrar o mês
        corrente — a partir do segundo fechamento aparecem a evolução do patrimônio e o custo
        médio real.
      </EmptyState>
    )
  }

  return (
    <div className="space-y-4">
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
              ? `+ ${formatCurrency(stats.averageCardPersonal)}/mês de fatura pessoal`
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
        <div className="space-y-2 p-3 sm:hidden">
          {reversed.map((point) => {
            const editing = editingId === point.id
            return (
              <article
                key={point.id}
                className="rounded-lg border border-dark-border-subtle bg-dark-surface/45 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-dark-text">{formatMonthKey(point.month)}</h4>
                    {point.note && <p className="mt-0.5 text-xs text-dark-text-muted">{point.note}</p>}
                  </div>
                  <HistoryActions
                    point={point}
                    editing={editing}
                    onToggleEdit={() => setEditingId(editing ? null : point.id)}
                    onRemove={() => history.removeSnapshot(point.id)}
                  />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <dt className="text-dark-text-muted">Renda</dt>
                    <dd className="mt-0.5 tabular-nums text-dark-text">
                      {formatCurrency(point.availableForBudget + point.extraIncome)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-dark-text-muted">Custos + desejos</dt>
                    <dd className="mt-0.5 tabular-nums text-dark-text">
                      {formatCurrency(point.costs + point.wants)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-dark-text-muted">Investido</dt>
                    <dd className="mt-0.5 tabular-nums text-dark-text">{formatCurrency(point.invested)}</dd>
                  </div>
                  <div>
                    <dt className="text-dark-text-muted">Poupança</dt>
                    <dd className="mt-0.5 tabular-nums text-dark-text">{point.savingsRate.toFixed(0)}%</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-dark-text-muted">
                      {hasLiabilities || hasPhysicalAssets ? 'Patrimônio líquido' : 'Patrimônio'}
                    </dt>
                    <dd className="mt-0.5 tabular-nums text-dark-text">{formatCurrency(point.netWorth)}</dd>
                  </div>
                </dl>
                {(point.extraIncome > 0.005 || point.extraExpense > 0.005) && (
                  <div className="mt-3 border-t border-dark-border-subtle pt-2 text-[11px] leading-relaxed">
                    {point.extraIncome > 0.005 && (
                      <p className="text-primary-300">+ {formatCurrency(point.extraIncome)} em entradas extras</p>
                    )}
                    {point.extraExpense > 0.005 && (
                      <p className="text-amber-300">− {formatCurrency(point.extraExpense)} em saídas extraordinárias</p>
                    )}
                  </div>
                )}
                {editing && (
                  <div className="mt-3 border-t border-dark-border-subtle pt-3">
                    <SnapshotEditorContent point={point} onClose={() => setEditingId(null)} />
                  </div>
                )}
              </article>
            )
          })}
        </div>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-dark-text-muted">
                <th className="px-5 py-2.5 font-medium">Mês</th>
                <th
                  className="px-4 py-2.5 text-right font-medium"
                  title="Base recorrente do orçamento mais entradas extras recebidas"
                >
                  Renda
                </th>
                <th className="px-4 py-2.5 text-right font-medium">Custos</th>
                <th className="px-4 py-2.5 text-right font-medium">Desejos</th>
                <th className="px-4 py-2.5 text-right font-medium">Investido</th>
                <th
                  className="px-4 py-2.5 text-right font-medium"
                  title="Sua parte da fatura usada para encerrar o ciclo"
                >
                  Fatura
                </th>
                <th className="px-4 py-2.5 text-right font-medium">Poupança</th>
                <th className="px-4 py-2.5 text-right font-medium">
                  {hasLiabilities || hasPhysicalAssets ? 'Líquido' : 'Patrimônio'}
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
                      {point.extraIncome > 0.005 && (
                        <span
                          className="mt-0.5 block max-w-64 truncate text-[11px] text-primary-300"
                          title={point.extraIncomeEntries
                            .map((entry) => `${entry.name}: ${formatCurrency(entry.amount)}`)
                            .join(' · ')}
                        >
                          + {formatCurrency(point.extraIncome)} extra
                          {point.extraIncomeEntries.length > 0
                            ? ` · ${point.extraIncomeEntries.map((entry) => entry.name).join(', ')}`
                            : ''}
                        </span>
                      )}
                      {point.extraExpense > 0.005 && (
                        <span
                          className="mt-0.5 block max-w-64 truncate text-[11px] text-amber-300"
                          title={point.extraExpenseEntries
                            .map((entry) => `${entry.name}: ${formatCurrency(entry.amount)}`)
                            .join(' · ')}
                        >
                          − {formatCurrency(point.extraExpense)} extraordinário
                          {point.extraExpenseEntries.length > 0
                            ? ` · ${point.extraExpenseEntries.map((entry) => entry.name).join(', ')}`
                            : ''}
                        </span>
                      )}
                    </td>
                    <td
                      className="px-4 py-2.5 text-right tabular-nums text-dark-text-secondary"
                      title={
                        point.extraIncome > 0.005
                          ? `Base ${formatCurrency(point.availableForBudget)} + extras ${formatCurrency(point.extraIncome)}`
                          : 'Base recorrente do orçamento'
                      }
                    >
                      {formatCurrency(point.availableForBudget + point.extraIncome)}
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
                    <td
                      className="px-4 py-2.5 text-right tabular-nums text-dark-text-secondary"
                      title="Sua parte efetivamente devida na fatura que encerrou o ciclo"
                    >
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
                      <HistoryActions
                        point={point}
                        editing={editingId === point.id}
                        onToggleEdit={() =>
                          setEditingId((prev) => (prev === point.id ? null : point.id))
                        }
                        onRemove={() => history.removeSnapshot(point.id)}
                        desktop
                      />
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
            <Tag>{formatMonthKey(stats.bestSavingsMonth.month)}</Tag> com{' '}
            {stats.bestSavingsMonth.savingsRate.toFixed(0)}%.
          </p>
        )}
      </Panel>
    </div>
  )
}
