import { useState } from 'react'
import { BanknoteArrowUp, ClipboardCheck, Plus, RotateCcw, Trash2, Wand2 } from 'lucide-react'
import { CurrencyInput } from './CurrencyInput'
import { EmptyState, Panel, PanelHeader, PrimaryButton, SecondaryButton, Tag } from './ui'
import { formatCurrency, formatMonthLong, inputClass } from '../lib/format'
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
  const { actuals, forecast } = useFinancasStore()
  const { summary } = actuals
  const {
    rows,
    effectiveCosts,
    plannedCosts,
    variance,
    informedCount,
    extraIncome,
    extraIncomeTotal,
  } = summary
  const [incomeName, setIncomeName] = useState('')
  const [incomeAmount, setIncomeAmount] = useState(0)
  const expectedIncome = forecast.monthOccurrences.filter(
    (occurrence) =>
      occurrence.event.kind === 'income' &&
      !extraIncome.some((entry) => entry.sourceEventId === occurrence.event.id),
  )

  const handleAddIncome = () => {
    if (!incomeName.trim() || incomeAmount <= 0) return
    actuals.addExtraIncome(incomeName, incomeAmount)
    setIncomeName('')
    setIncomeAmount(0)
  }

  return (
    <Panel>
      <PanelHeader
        title={`Realizado de ${formatMonthLong(summary.month)}`}
        icon={<ClipboardCheck size={16} />}
        description="Registre o que realmente entrou e ajuste o que saiu em débito ou boleto."
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
              <SecondaryButton onClick={() => actuals.clearCosts()} tone="danger">
                <RotateCcw size={14} />
                Limpar custos
              </SecondaryButton>
            )}
          </>
        }
      />

      <section className="mt-4 rounded-xl border border-primary-500/20 bg-primary-500/[0.04] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-dark-text">
              <BanknoteArrowUp size={15} className="text-primary-300" />
              Entradas extras recebidas
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-dark-text-muted">
              Banco de horas, bônus, venda ou qualquer dinheiro fora do salário recorrente.
            </p>
          </div>
          <strong className="text-lg font-semibold tabular-nums text-primary-300">
            {formatCurrency(extraIncomeTotal)}
          </strong>
        </div>

        {extraIncome.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {extraIncome.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center gap-3 rounded-lg bg-dark-card px-3 py-2"
              >
                <span className="w-full min-w-0 text-sm font-medium text-dark-text sm:flex-1">
                  <span className="block truncate">{entry.name}</span>
                  {entry.sourceEventId && (
                    <span className="mt-0.5 block text-[11px] font-normal text-dark-text-muted">
                      previsto em Futuro
                    </span>
                  )}
                </span>
                <div className="ml-auto w-32 shrink-0">
                  <CurrencyInput
                    value={entry.amount}
                    onChange={(amount) => actuals.updateExtraIncome(entry.id, { amount })}
                    className="!py-1.5"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => actuals.removeExtraIncome(entry.id)}
                  className="shrink-0 rounded-md p-1.5 text-dark-text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                  aria-label={`Remover entrada ${entry.name}`}
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {expectedIncome.length > 0 && (
          <div className="mt-3 rounded-lg border border-dark-border-subtle bg-dark-surface/50 p-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-dark-text-muted">
              Previsto em Futuro
            </span>
            <ul className="mt-2 space-y-1.5">
              {expectedIncome.map((occurrence) => (
                <li
                  key={occurrence.event.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <span className="min-w-0 text-dark-text-secondary">
                    {occurrence.event.name}{' '}
                    <strong className="font-medium tabular-nums text-dark-text">
                      {formatCurrency(occurrence.event.amount)}
                    </strong>
                  </span>
                  <SecondaryButton
                    onClick={() =>
                      actuals.addExtraIncome(
                        occurrence.event.name,
                        occurrence.event.amount,
                        occurrence.event.id,
                      )
                    }
                  >
                    Marcar como recebida
                  </SecondaryButton>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_auto]">
          <input
            value={incomeName}
            onChange={(event) => setIncomeName(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleAddIncome()}
            placeholder="Descrição (ex.: banco de horas)"
            className={inputClass}
          />
          <CurrencyInput
            value={incomeAmount}
            onChange={setIncomeAmount}
            placeholder="Valor recebido"
          />
          <PrimaryButton
            onClick={handleAddIncome}
            disabled={!incomeName.trim() || incomeAmount <= 0}
          >
            <Plus size={14} />
            Adicionar
          </PrimaryButton>
        </div>
      </section>

      <div className="mt-5 border-t border-dark-border-subtle pt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-dark-text">Custos em conta</h3>
          <span className="text-xs text-dark-text-muted">
            Débito e boleto; cartão já vem da fatura.
          </span>
        </div>

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
      </div>
    </Panel>
  )
}
