import { ClipboardCheck, RotateCcw, Wand2 } from 'lucide-react'
import { CurrencyInput } from './CurrencyInput'
import { EmptyState, Panel, PanelHeader, SecondaryButton, Tag } from './ui'
import { formatCurrency, formatMonthLong } from '../lib/format'
import { useFinancasStore } from '../context/financasStore'
import { COST_CATEGORY_COLORS, COST_CATEGORY_LABELS } from '../types/constants'

// ---------------------------------------------------------------------------
// Realizado do mês.
//
// O cartão já entrega o realizado — a fatura é a lista do que aconteceu. Débito
// e boleto não: a luz orçada em R$ 200 vem R$ 260 e o plano nunca soube. Sem
// isto, o "custo médio" do histórico é a média dos planos, e a meta da reserva
// de emergência herda o mesmo otimismo.
//
// Campo vazio significa "não sei ainda, use o planejado" — nunca zero.
// ---------------------------------------------------------------------------

export function ActualsPanel() {
  const { actuals } = useFinancasStore()
  const { summary } = actuals
  const { rows, effectiveCosts, plannedCosts, variance, informedCount } = summary

  return (
    <Panel>
      <PanelHeader
        title={`Realizado de ${formatMonthLong(summary.month)}`}
        icon={<ClipboardCheck size={16} />}
        description="O que de fato saiu em débito e boleto. Deixe vazio para o fechamento usar o valor planejado."
        actions={
          <>
            <span className="text-right">
              <span className="block text-[11px] uppercase tracking-wider text-dark-text-muted">
                Custos do mês
              </span>
              <strong className="block text-lg font-semibold tabular-nums text-dark-text">
                {formatCurrency(effectiveCosts)}
              </strong>
            </span>
            {rows.length > 0 && (
              <SecondaryButton onClick={() => actuals.fillFromPlan()}>
                <Wand2 size={14} />
                Copiar do plano
              </SecondaryButton>
            )}
            {informedCount > 0 && (
              <SecondaryButton onClick={() => actuals.clearMonth()} tone="danger">
                <RotateCcw size={14} />
                Limpar
              </SecondaryButton>
            )}
          </>
        }
      />

      {rows.length === 0 ? (
        <div className="mt-4">
          <EmptyState icon={<ClipboardCheck size={24} />} title="Nenhum custo fixo cadastrado">
            Cadastre seus custos no planejamento para poder informar aqui quanto cada um veio de
            fato neste mês.
          </EmptyState>
        </div>
      ) : (
        <>
          <ul className="mt-4 space-y-1.5">
            {rows.map((row) => {
              const off = row.actual !== null && Math.abs(row.variance) > 0.005
              return (
                <li
                  key={row.cost.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg bg-dark-surface px-3 py-2"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: COST_CATEGORY_COLORS[row.cost.category] }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-dark-text">{row.cost.name}</p>
                    <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-dark-text-muted">
                      {COST_CATEGORY_LABELS[row.cost.category]}
                      <span>plano {formatCurrency(row.planned)}</span>
                      {row.cost.paidWith === 'card' && <Tag>no cartão</Tag>}
                    </p>
                  </div>
                  {off && (
                    <span
                      className={`shrink-0 text-xs font-medium tabular-nums ${
                        row.variance > 0 ? 'text-rose-400' : 'text-primary-400'
                      }`}
                    >
                      {row.variance > 0 ? '+' : '−'} {formatCurrency(Math.abs(row.variance))}
                    </span>
                  )}
                  <div className="w-32 shrink-0">
                    <CurrencyInput
                      value={row.actual ?? 0}
                      onChange={(value) => actuals.setActual(row.cost.id, value)}
                      placeholder={row.planned.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      className="!py-1.5"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => actuals.setActual(row.cost.id, null)}
                    disabled={row.actual === null}
                    className="shrink-0 rounded-md p-1.5 text-dark-text-muted transition-colors hover:text-dark-text disabled:opacity-0"
                    title="Voltar a usar o valor planejado"
                    aria-label={`Limpar o realizado de ${row.cost.name}`}
                  >
                    <RotateCcw size={13} />
                  </button>
                </li>
              )
            })}
          </ul>

          <p className="mt-3 border-t border-dark-border-subtle pt-3 text-xs leading-relaxed text-dark-text-muted">
            {informedCount === 0 ? (
              <>
                Nenhum valor informado ainda — o fechamento vai usar os{' '}
                {formatCurrency(plannedCosts)} do plano.
              </>
            ) : (
              <>
                {informedCount} de {rows.length}{' '}
                {rows.length === 1 ? 'item informado' : 'itens informados'}. Contra o plano de{' '}
                {formatCurrency(plannedCosts)}, o mês está{' '}
                <strong className={variance > 0 ? 'text-rose-400' : 'text-primary-400'}>
                  {variance > 0 ? 'acima' : 'abaixo'} em {formatCurrency(Math.abs(variance))}
                </strong>
                .
              </>
            )}
          </p>
        </>
      )}
    </Panel>
  )
}
