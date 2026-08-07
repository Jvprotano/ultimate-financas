import { useState } from 'react'
import { CreditCard, Heart, Landmark, Plus, Trash2 } from 'lucide-react'
import { Card } from './Card'
import { CurrencyInput } from './CurrencyInput'
import { HeaderMetric } from './HeaderMetric'
import { MeterWithMarker, PrimaryButton, SuggestionChip } from './ui'
import { formatCurrency, inputClass } from '../lib/format'
import { isCardEnvelopeWant, isWantIncludedInCardPlan } from '../lib/scenario'
import { useCardsStore, useMetrics, useScenarioStore } from '../context/financasStore'
import { BUDGET_AREA_COLORS } from '../types/constants'

const SUGGESTIONS = [
  'Streaming',
  'Comer fora',
  'Delivery',
  'Viagens',
  'Roupas',
  'Jogos / Hobbies',
  'Cinema / Shows',
  'Presentes',
]

export function WantsManager() {
  const {
    wants,
    addWant,
    removeWant,
    updateWantAmount,
    setWantPaidWith,
    setWantIncludedInCardPlan,
  } = useScenarioStore()
  const {
    totalWantsAmount,
    budgetAllocation,
    availableForBudget,
    selectedModel,
    wantsOnCard,
    wantsOnAccount,
    cardIncludedWantsAmount,
  } = useMetrics()
  const { summary } = useCardsStore()

  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState(0)

  const desejosTarget = budgetAllocation.desejos
  const remaining = desejosTarget - totalWantsAmount
  const realized = summary.personalByArea.desejos
  const cardEnvelopeAmount = wants
    .filter(isCardEnvelopeWant)
    .reduce((sum, want) => sum + want.plannedAmount, 0)

  const handleAdd = () => {
    if (!newName.trim()) return
    addWant(newName.trim(), newAmount)
    setNewName('')
    setNewAmount(0)
  }

  return (
    <Card
      title="Desejos"
      icon={<Heart size={17} />}
      collapsible
      storageKey="wants"
      headerExtra={
        totalWantsAmount > 0 ? (
          <HeaderMetric
            amount={totalWantsAmount}
            baseAmount={availableForBudget}
            targetShare={selectedModel.desejos}
            label="Planejado"
            tone="slate"
          />
        ) : undefined
      }
    >
      <div className="space-y-4">
        {desejosTarget > 0 && (
          <div>
            <div className="mb-1.5 flex items-baseline justify-between text-xs">
              <span className="text-dark-text-muted">
                Meta de desejos: {formatCurrency(desejosTarget)}
              </span>
              <span
                className={`font-medium tabular-nums ${
                  remaining >= 0 ? 'text-primary-400' : 'text-rose-400'
                }`}
              >
                {remaining >= 0
                  ? `${formatCurrency(remaining)} livres`
                  : `${formatCurrency(-remaining)} acima`}
              </span>
            </div>
            {/* A barra é o planejado; o traço marca o que já saiu no cartão. */}
            <MeterWithMarker
              value={totalWantsAmount}
              marker={realized}
              max={desejosTarget}
              color={BUDGET_AREA_COLORS.desejos}
              markerLabel={`Já gasto no cartão: ${formatCurrency(realized)}`}
            />
            {realized > 0 ? (
              <p className="mt-1.5 text-[11px] leading-relaxed text-dark-text-muted">
                <span className="mr-1 inline-block h-2 w-[2px] translate-y-[1px] bg-dark-text/70" />
                {formatCurrency(realized)} já gastos no cartão neste ciclo
                {totalWantsAmount > 0 &&
                  ` — ${((realized / totalWantsAmount) * 100).toFixed(0)}% do planejado`}
                . É o mesmo orçamento sendo consumido, não um gasto extra.
              </p>
            ) : (
              wantsOnCard > 0 && (
                <p className="mt-1.5 text-[11px] leading-relaxed text-dark-text-muted">
                  {formatCurrency(wantsOnCard)} deste plano é para gastar no cartão. Marque a área
                  “Desejo” nos lançamentos da fatura para acompanhar o realizado aqui.
                </p>
              )
            )}
            {cardEnvelopeAmount > 0 && (
              <div className="mt-3 grid gap-1.5 rounded-lg border border-dark-border-subtle bg-dark-surface/50 p-3 text-[11px] text-dark-text-muted sm:grid-cols-3">
                <span>
                  Fatura planejada:{' '}
                  <strong className="text-dark-text">{formatCurrency(cardEnvelopeAmount)}</strong>
                </span>
                <span>
                  Dentro do cartão:{' '}
                  <strong className="text-dark-text">
                    {formatCurrency(cardIncludedWantsAmount)}
                  </strong>
                </span>
                <span>
                  Fora do cartão:{' '}
                  <strong className="text-dark-text">{formatCurrency(wantsOnAccount)}</strong>
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.filter((s) => !wants.some((w) => w.name === s)).map((s) => (
            <SuggestionChip key={s} label={s} onClick={() => addWant(s, 0)} />
          ))}
        </div>

        <div className="rounded-lg border border-dark-border bg-dark-surface/60 p-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Novo desejo (ex: Netflix, viagem...)"
              className={`${inputClass} flex-1`}
            />
            <div className="w-full sm:w-40">
              <CurrencyInput value={newAmount} onChange={setNewAmount} />
            </div>
            <PrimaryButton onClick={handleAdd} disabled={!newName.trim()}>
              <Plus size={15} />
              Adicionar
            </PrimaryButton>
          </div>
        </div>

        {wants.length > 0 && (
          <ul className="space-y-1.5">
            {wants.map((want) => {
              const isEnvelope = isCardEnvelopeWant(want)
              const isIncluded = isWantIncludedInCardPlan(want, wants)

              return (
                <li
                  key={want.id}
                  className={`group flex items-center justify-between gap-3 rounded-lg px-3 py-2 ${
                    isIncluded
                      ? 'ml-4 border-l-2 border-primary-500/40 bg-dark-surface/60'
                      : 'bg-dark-surface'
                  }`}
                >
                  <span className="min-w-0 flex-1 text-sm font-medium text-dark-text">
                    <span className="block truncate">{want.name}</span>
                    {isIncluded && (
                      <span className="mt-0.5 block text-[11px] font-normal text-primary-300/80">
                        incluído no Cartão — não soma de novo
                      </span>
                    )}
                    {isEnvelope && cardIncludedWantsAmount > 0 && (
                      <span className="mt-0.5 block text-[11px] font-normal text-dark-text-muted">
                        inclui {formatCurrency(cardIncludedWantsAmount)} em assinaturas/detalhes
                      </span>
                    )}
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setWantPaidWith(want.id, want.paidWith === 'account' ? 'card' : 'account')
                      }
                      className="rounded-md p-1.5 text-dark-text-muted transition-colors hover:text-dark-text"
                      title={
                        want.paidWith === 'account'
                          ? 'Sai direto da conta — clique para marcar como cartão'
                          : 'Passa no cartão — clique para marcar como débito em conta'
                      }
                      aria-label={`Forma de pagamento de ${want.name}`}
                    >
                      {want.paidWith === 'account' ? (
                        <Landmark size={14} />
                      ) : (
                        <CreditCard size={14} className="text-dark-text-secondary" />
                      )}
                    </button>
                    {want.paidWith !== 'account' && !isEnvelope && cardEnvelopeAmount > 0 && (
                      <button
                        type="button"
                        onClick={() => setWantIncludedInCardPlan(want.id, !isIncluded)}
                        className={`rounded-md px-2 py-1 text-[11px] transition-colors ${
                          isIncluded
                            ? 'bg-primary-500/10 text-primary-300 hover:bg-primary-500/15'
                            : 'bg-dark-card text-dark-text-muted hover:text-dark-text'
                        }`}
                        title={
                          isIncluded
                            ? 'Clique para somar este item além do envelope Cartão'
                            : 'Clique para tratar como detalhe já incluído no envelope Cartão'
                        }
                      >
                        {isIncluded ? 'dentro' : 'fora'}
                      </button>
                    )}
                    <div className="w-32">
                      <CurrencyInput
                        value={want.plannedAmount}
                        onChange={(next) => updateWantAmount(want.id, next)}
                        className="!py-1.5"
                      />
                    </div>
                    <button
                      onClick={() => removeWant(want.id)}
                      className="rounded-md p-1.5 text-dark-text-muted opacity-0 transition-all hover:bg-rose-500/10 hover:text-rose-400 focus-visible:opacity-100 group-hover:opacity-100"
                      aria-label={`Remover ${want.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {wants.length > 0 && desejosTarget > 0 && remaining < 0 && (
          <p className="text-xs font-medium text-rose-400">
            Os desejos passam da meta em {formatCurrency(-remaining)}. Corte algo aqui ou escolha um
            modelo com mais espaço para desejos.
          </p>
        )}
      </div>
    </Card>
  )
}
