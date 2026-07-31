import { useState } from 'react'
import { Building2, ChevronDown, Landmark, Plus, Trash2, X } from 'lucide-react'
import { CurrencyInput } from './CurrencyInput'
import { LedgerList, LedgerMoveForm } from './Ledger'
import { ReserveSection } from './ReserveSection'
import { GoalsSection } from './GoalsSection'
import { AssetsManager } from './AssetsManager'
import { DebtsManager } from './DebtsManager'
import {
  EmptyState,
  GainLabel,
  Panel,
  PanelHeader,
  PrimaryButton,
  SecondaryButton,
  SegmentedBar,
  StatTile,
  Tag,
} from './ui'
import { formatCurrency, inputClass } from '../lib/format'
import { useFinancasStore, useInvestmentsStore } from '../context/financasStore'
import type { HoldingSummary } from '../types'
import { CHART_PALETTE, INVESTMENT_CLASS_PRESET_COLORS } from '../types/constants'

const RESERVE_COLOR = CHART_PALETTE.muted
const GOALS_COLOR = CHART_PALETTE.violet

function HoldingRow({ holding }: { holding: HoldingSummary }) {
  const {
    investmentClasses,
    updateHolding,
    removeHolding,
    addHoldingTransaction,
    removeHoldingTransaction,
    setMarketValue,
  } = useInvestmentsStore()
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-dark-border/60 bg-dark-surface/40">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-dark-text">{holding.name}</p>
          {holding.institution && (
            <p className="flex items-center gap-1 text-[11px] text-dark-text-muted">
              <Building2 size={10} />
              {holding.institution}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums text-dark-text">
            {formatCurrency(holding.marketValue)}
          </p>
          <p className="text-[11px]">
            <GainLabel gain={holding.gain} pct={holding.invested > 0 ? holding.gainPct : null} />
            {holding.annualizedPct !== null && (
              <span className="ml-1.5 text-dark-text-muted">
                {holding.annualizedPct >= 0 ? '+' : ''}
                {holding.annualizedPct.toFixed(1)}% a.a.
              </span>
            )}
          </p>
        </div>
        <ChevronDown
          size={15}
          className={`shrink-0 text-dark-text-muted transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-dark-border/60 px-3 py-3">
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            <div className="rounded-md bg-dark-input/60 px-2.5 py-1.5">
              <span className="block text-dark-text-muted">Aportado</span>
              <strong className="tabular-nums text-dark-text">
                {formatCurrency(holding.invested)}
              </strong>
            </div>
            <div className="rounded-md bg-dark-input/60 px-2.5 py-1.5">
              <span className="block text-dark-text-muted">Rendimento</span>
              <strong>
                <GainLabel
                  gain={holding.gain}
                  pct={holding.invested > 0 ? holding.gainPct : null}
                />
              </strong>
            </div>
            <div className="rounded-md bg-dark-input/60 px-2.5 py-1.5">
              <span className="block text-dark-text-muted">Ao ano</span>
              <strong className="tabular-nums text-dark-text">
                {holding.annualizedPct === null
                  ? '—'
                  : `${holding.annualizedPct >= 0 ? '+' : ''}${holding.annualizedPct.toFixed(1)}%`}
              </strong>
            </div>
          </div>

          <LedgerMoveForm
            onMove={(amount, note) => addHoldingTransaction(holding.id, amount, note)}
            inLabel="Aportar"
            outLabel="Resgatar"
            disableOut={holding.marketValue <= 0}
          />

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dark-text-muted">
                Saldo atual (marcar a mercado)
              </span>
              <CurrencyInput
                value={holding.marketValue}
                onChange={(value) => setMarketValue(holding.id, value)}
                className="!py-2"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dark-text-muted">
                Classe
              </span>
              <select
                value={holding.assetClassId}
                onChange={(event) =>
                  updateHolding(holding.id, { assetClassId: event.target.value })
                }
                className={`${inputClass} h-[42px]`}
              >
                {investmentClasses.map((assetClass) => (
                  <option key={assetClass.id} value={assetClass.id}>
                    {assetClass.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={holding.name}
              onChange={(event) => updateHolding(holding.id, { name: event.target.value })}
              className={`${inputClass} !py-1.5`}
              placeholder="Nome da posição"
              aria-label="Nome da posição"
            />
            <input
              value={holding.institution ?? ''}
              onChange={(event) => updateHolding(holding.id, { institution: event.target.value })}
              className={`${inputClass} !py-1.5`}
              placeholder="Instituição (opcional) — ex.: Itaú, XP"
              aria-label="Instituição"
            />
          </div>

          <LedgerList
            transactions={holding.transactions}
            onRemove={(id) => removeHoldingTransaction(holding.id, id)}
            inLabel="Aporte"
            outLabel="Resgate"
          />

          <button
            type="button"
            onClick={() => removeHolding(holding.id)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-dark-text-muted transition-colors hover:text-rose-400"
          >
            <Trash2 size={13} />
            Excluir posição
          </button>
        </div>
      )}
    </div>
  )
}

function NewHoldingForm({ onClose }: { onClose: () => void }) {
  const { investmentClasses, addHolding, addClass, removeClass, holdings } = useInvestmentsStore()
  const [name, setName] = useState('')
  const [institution, setInstitution] = useState('')
  const [assetClassId, setAssetClassId] = useState(investmentClasses[0]?.id ?? '')
  const [initialAmount, setInitialAmount] = useState(0)
  const [newClassName, setNewClassName] = useState('')
  const [showNewClass, setShowNewClass] = useState(false)

  const selectedClassId = investmentClasses.some((item) => item.id === assetClassId)
    ? assetClassId
    : (investmentClasses[0]?.id ?? '')

  const handleAdd = () => {
    if (!name.trim() || !selectedClassId) return
    addHolding({ name, assetClassId: selectedClassId, institution, initialAmount })
    setName('')
    setInstitution('')
    setInitialAmount(0)
    onClose()
  }

  const handleAddClass = () => {
    const trimmed = newClassName.trim()
    if (!trimmed) return
    addClass(
      trimmed,
      INVESTMENT_CLASS_PRESET_COLORS[investmentClasses.length % INVESTMENT_CLASS_PRESET_COLORS.length],
    )
    setNewClassName('')
    setShowNewClass(false)
  }

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-dark-border bg-dark-surface/60 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && handleAdd()}
          placeholder="Nome — ex.: CDB Itaú 110% CDI"
          className={inputClass}
          aria-label="Nome da posição"
        />
        <input
          value={institution}
          onChange={(event) => setInstitution(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && handleAdd()}
          placeholder="Instituição (opcional)"
          className={inputClass}
          aria-label="Instituição"
        />
      </div>

      <div>
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-dark-text-muted">
          Classe de ativo
        </span>
        <div className="flex flex-wrap gap-1.5">
          {investmentClasses.map((assetClass) => {
            const isSelected = selectedClassId === assetClass.id
            const isEmpty = !holdings.some((holding) => holding.assetClassId === assetClass.id)
            return (
              <span
                key={assetClass.id}
                className={`group inline-flex items-center rounded-lg border transition-all ${
                  isSelected
                    ? 'border-primary-500/60 bg-primary-500/10'
                    : 'border-transparent bg-dark-input hover:bg-white/[0.06]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setAssetClassId(assetClass.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold ${
                    isSelected ? 'text-primary-200' : 'text-dark-text-muted hover:text-dark-text'
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: assetClass.color }}
                  />
                  {assetClass.name}
                </button>
                {isEmpty && (
                  <button
                    type="button"
                    onClick={() => removeClass(assetClass.id)}
                    className="pr-2 text-dark-text-muted opacity-0 transition-opacity hover:text-rose-400 focus-visible:opacity-100 group-hover:opacity-100"
                    title={`Remover a classe ${assetClass.name}`}
                    aria-label={`Remover a classe ${assetClass.name}`}
                  >
                    <X size={12} />
                  </button>
                )}
              </span>
            )
          })}

          {showNewClass ? (
            <span className="inline-flex items-center gap-1 rounded-lg border border-primary-500/40 bg-dark-input px-2 py-1">
              <input
                autoFocus
                value={newClassName}
                onChange={(event) => setNewClassName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleAddClass()
                  if (event.key === 'Escape') setShowNewClass(false)
                }}
                placeholder="Nova classe"
                className="w-28 bg-transparent text-xs text-dark-text outline-none placeholder:text-dark-text-muted"
                aria-label="Nome da nova classe"
              />
              <button
                type="button"
                onClick={handleAddClass}
                className="text-primary-300 hover:text-primary-200"
                title="Criar classe"
              >
                <Plus size={13} />
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setShowNewClass(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-dashed border-dark-border px-3 py-1.5 text-xs font-medium text-dark-text-muted transition-colors hover:border-primary-500/50 hover:text-primary-300"
            >
              <Plus size={12} />
              Nova classe
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="block sm:flex-1">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-dark-text-muted">
            Valor aplicado hoje
          </span>
          <CurrencyInput value={initialAmount} onChange={setInitialAmount} />
        </label>
        <div className="flex gap-2">
          <PrimaryButton onClick={handleAdd} disabled={!name.trim() || !selectedClassId}>
            <Plus size={16} />
            Adicionar posição
          </PrimaryButton>
          <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
        </div>
      </div>
    </div>
  )
}

/**
 * O balanço em duas barras na mesma escala: o que você tem em cima, o que você
 * deve embaixo. Com um financiamento sem o bem cadastrado, a barra de baixo
 * aparecia sozinha e enorme — que era exatamente o erro de leitura.
 */
function BalanceSheetBars({
  financialAssets,
  physicalAssets,
  liabilities,
  netWorth,
}: {
  financialAssets: number
  physicalAssets: number
  liabilities: number
  netWorth: number
}) {
  const grossAssets = financialAssets + physicalAssets
  const scale = Math.max(grossAssets, liabilities, 1)
  const width = (value: number) => `${(value / scale) * 100}%`

  return (
    <div className="mt-5 border-t border-dark-border-subtle pt-4">
      <span className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-dark-text-muted">
        O balanço inteiro
      </span>

      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full"
          style={{ width: width(financialAssets), backgroundColor: CHART_PALETTE.aqua }}
          title={`Financeiro: ${formatCurrency(financialAssets)}`}
        />
        {physicalAssets > 0 && (
          <div
            className="h-full rounded-full"
            style={{ width: width(physicalAssets), backgroundColor: CHART_PALETTE.yellow }}
            title={`Bens: ${formatCurrency(physicalAssets)}`}
          />
        )}
      </div>
      <div className="mt-1 flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full"
          style={{ width: width(liabilities), backgroundColor: CHART_PALETTE.red }}
          title={`Dívidas: ${formatCurrency(liabilities)}`}
        />
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-dark-text-secondary">
        <span className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: CHART_PALETTE.aqua }}
          />
          Financeiro {formatCurrency(financialAssets)}
        </span>
        {physicalAssets > 0 && (
          <span className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: CHART_PALETTE.yellow }}
            />
            Bens {formatCurrency(physicalAssets)}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: CHART_PALETTE.red }}
          />
          Dívidas {formatCurrency(liabilities)}
        </span>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-dark-text-muted">
        {netWorth < 0
          ? `Você deve ${formatCurrency(-netWorth)} mais do que tem. Se algum financiamento ainda não tem o bem cadastrado, é aqui que a conta fica errada.`
          : `Tirando tudo que você deve, sobram ${formatCurrency(netWorth)}.`}
      </p>
    </div>
  )
}

export function InvestmentsManager() {
  const { summary, goals } = useInvestmentsStore()
  const { debts } = useFinancasStore()
  const [showForm, setShowForm] = useState(false)

  const {
    financialAssets,
    physicalAssets,
    liabilities,
    unsecuredLiabilities,
    financialNetWorth,
    netWorth,
    reserveBalance,
    goalsBalance,
    totalMarketValue,
    totalGain,
    totalInvested,
  } = summary
  const activeGoals = goals.filter((goal) => !goal.isComplete).length
  const hasDebt = liabilities > 0
  const hasAssets = physicalAssets > 0
  // Sem bem e sem dívida, os dois patrimônios são o mesmo número: mostrar as
  // duas linhas só confundiria.
  const showsBalanceSheet = hasAssets || hasDebt

  return (
    <div className="space-y-4">
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Patrimônio financeiro"
          value={formatCurrency(financialNetWorth)}
          detail={
            unsecuredLiabilities > 0
              ? `${formatCurrency(financialAssets)} − ${formatCurrency(unsecuredLiabilities)} de dívida sem garantia`
              : 'investimentos + reserva + metas'
          }
          tone={financialNetWorth >= 0 ? 'accent' : 'negative'}
        />
        {showsBalanceSheet ? (
          <StatTile
            label="Patrimônio líquido total"
            value={formatCurrency(netWorth)}
            detail={
              hasAssets
                ? `com ${formatCurrency(physicalAssets)} em bens − ${formatCurrency(liabilities)} de dívida`
                : `${formatCurrency(financialAssets)} em ativos − ${formatCurrency(liabilities)} de dívida`
            }
            tone={netWorth >= 0 ? 'accent' : 'negative'}
          />
        ) : (
          <StatTile
            label="Investido"
            value={formatCurrency(totalMarketValue)}
            detail={`${formatCurrency(reserveBalance + goalsBalance)} em reserva e metas`}
          />
        )}
        <StatTile
          label={hasDebt ? 'Dívidas' : 'Rendimento'}
          value={
            hasDebt
              ? formatCurrency(liabilities)
              : `${totalGain >= 0 ? '+' : '−'} ${formatCurrency(Math.abs(totalGain))}`
          }
          detail={
            hasDebt
              ? `${formatCurrency(debts.summary.totalMonthlyInterest)}/mês de juros`
              : totalInvested > 0
                ? `${summary.totalGainPct >= 0 ? '+' : ''}${summary.totalGainPct.toFixed(1)}% sobre o aportado`
                : undefined
          }
          tone={hasDebt ? 'negative' : totalGain >= 0 ? 'positive' : 'negative'}
        />
        <StatTile
          label={hasDebt ? 'Rendimento' : 'Reserva e metas'}
          value={
            hasDebt
              ? `${totalGain >= 0 ? '+' : '−'} ${formatCurrency(Math.abs(totalGain))}`
              : formatCurrency(reserveBalance + goalsBalance)
          }
          detail={
            hasDebt
              ? totalInvested > 0
                ? `${summary.totalGainPct >= 0 ? '+' : ''}${summary.totalGainPct.toFixed(1)}% sobre o aportado`
                : undefined
              : activeGoals > 0
                ? `${formatCurrency(reserveBalance)} de reserva · ${activeGoals} meta${activeGoals > 1 ? 's' : ''} em aberto`
                : `${formatCurrency(reserveBalance)} de reserva`
          }
          tone={hasDebt ? (totalGain >= 0 ? 'positive' : 'negative') : 'neutral'}
        />
      </div>

      {financialAssets > 0 && (
        <Panel>
          <PanelHeader
            title="Alocação dos ativos financeiros"
            description={
              showsBalanceSheet
                ? `As fatias são sobre os ${formatCurrency(financialAssets)} que respondem a aporte e resgate. Bens não se rebalanceiam e ficam fora daqui.`
                : undefined
            }
          />
          <div className="mt-4">
            <SegmentedBar
              segments={[
                ...summary.classes.map((assetClass) => ({
                  id: assetClass.id,
                  label: assetClass.name,
                  value: assetClass.marketValue,
                  color: assetClass.color,
                })),
                ...(reserveBalance > 0
                  ? [
                      {
                        id: 'reserva',
                        label: 'Reserva de emergência',
                        value: reserveBalance,
                        color: RESERVE_COLOR,
                      },
                    ]
                  : []),
                ...(goalsBalance > 0
                  ? [{ id: 'metas', label: 'Metas', value: goalsBalance, color: GOALS_COLOR }]
                  : []),
              ]}
              total={financialAssets}
              height={12}
            />
          </div>

          {showsBalanceSheet && (
            <BalanceSheetBars
              financialAssets={financialAssets}
              physicalAssets={physicalAssets}
              liabilities={liabilities}
              netWorth={netWorth}
            />
          )}
        </Panel>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <ReserveSection />
        <GoalsSection />
      </div>

      <AssetsManager />
      <DebtsManager />

      <Panel>
        <PanelHeader
          title="Posições"
          icon={<Landmark size={16} />}
          description="Cada posição tem um livro-razão de aportes e um valor de mercado que você atualiza."
          actions={
            !showForm && (
              <SecondaryButton onClick={() => setShowForm(true)}>
                <Plus size={14} />
                Nova posição
              </SecondaryButton>
            )
          }
        />

        {showForm && <NewHoldingForm onClose={() => setShowForm(false)} />}

        <div className="mt-4">
          {summary.classes.length === 0 ? (
            <EmptyState
              icon={<Landmark size={26} />}
              title="Nenhuma posição cadastrada"
              action={
                !showForm && (
                  <PrimaryButton onClick={() => setShowForm(true)}>
                    <Plus size={15} />
                    Adicionar a primeira
                  </PrimaryButton>
                )
              }
            >
              Cadastre onde seu dinheiro está para acompanhar patrimônio, alocação e rentabilidade
              por classe de ativo.
            </EmptyState>
          ) : (
            <div className="space-y-4">
              {summary.classes.map((assetClass) => (
                <div key={assetClass.id} className="rounded-xl border border-dark-border">
                  <div className="flex flex-wrap items-center gap-3 border-b border-dark-border/60 px-4 py-3">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: assetClass.color }}
                    />
                    <h4 className="text-sm font-semibold text-dark-text">{assetClass.name}</h4>
                    <Tag>{assetClass.allocationPct.toFixed(0)}% do patrimônio</Tag>
                    <div className="ml-auto text-right">
                      <p className="text-sm font-semibold tabular-nums text-dark-text">
                        {formatCurrency(assetClass.marketValue)}
                      </p>
                      <p className="text-[11px]">
                        <GainLabel
                          gain={assetClass.gain}
                          pct={assetClass.invested > 0 ? assetClass.gainPct : null}
                        />
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 p-3">
                    {assetClass.holdings.map((holding) => (
                      <HoldingRow key={holding.id} holding={holding} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Panel>
    </div>
  )
}
