import { useState } from 'react'
import { Building2, ChevronDown, Plus, Shield, Trash2 } from 'lucide-react'
import { CurrencyInput } from './CurrencyInput'
import { LedgerList, LedgerMoveForm } from './Ledger'
import {
  EmptyState,
  GainLabel,
  Meter,
  Panel,
  PanelHeader,
  PrimaryButton,
  SecondaryButton,
  SegmentedControl,
  Tag,
} from './ui'
import { formatCurrency, inputClass } from '../lib/format'
import { useInvestmentsStore, useMetrics } from '../context/financasStore'
import type { FinancialHoldingSummary } from '../lib/investments'
import { CHART_PALETTE } from '../types/constants'

const MONTH_OPTIONS = [3, 6, 12]

function ReservePositionRow({ holding }: { holding: FinancialHoldingSummary }) {
  const {
    investmentClasses,
    updateHolding,
    removeHolding,
    addHoldingTransaction,
    removeHoldingTransaction,
    setMarketValue,
  } = useInvestmentsStore()
  const [expanded, setExpanded] = useState(false)
  const assetClass = investmentClasses.find((item) => item.id === holding.assetClassId)

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
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-dark-text-muted">
            {holding.institution && (
              <span className="inline-flex items-center gap-1">
                <Building2 size={10} />
                {holding.institution}
              </span>
            )}
            {assetClass && <span>{assetClass.name}</span>}
            {holding.benchmark && <span>{holding.benchmark}</span>}
            {holding.liquidity && <span>liquidez {holding.liquidity}</span>}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums text-dark-text">
            {formatCurrency(holding.marketValue)}
          </p>
          <p className="text-[11px]">
            <GainLabel gain={holding.gain} pct={holding.invested > 0 ? holding.gainPct : null} />
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
              <strong className="tabular-nums text-dark-text">{formatCurrency(holding.invested)}</strong>
            </div>
            <div className="rounded-md bg-dark-input/60 px-2.5 py-1.5">
              <span className="block text-dark-text-muted">Rendimento</span>
              <strong>
                <GainLabel gain={holding.gain} pct={holding.invested > 0 ? holding.gainPct : null} />
              </strong>
            </div>
            <div className="rounded-md bg-dark-input/60 px-2.5 py-1.5">
              <span className="block text-dark-text-muted">Retorno anualizado</span>
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
            notePlaceholder="Nota (opcional) — ex.: aporte mensal, resgate emergencial"
          />

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dark-text-muted">
                Saldo atual
              </span>
              <CurrencyInput
                value={holding.marketValue}
                onChange={(value) => setMarketValue(holding.id, value)}
                className="!py-2"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dark-text-muted">
                Classe do ativo
              </span>
              <select
                value={holding.assetClassId}
                onChange={(event) => updateHolding(holding.id, { assetClassId: event.target.value })}
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
              placeholder="Produto — ex.: CDB liquidez diária"
              aria-label="Produto da reserva"
            />
            <input
              value={holding.institution ?? ''}
              onChange={(event) => updateHolding(holding.id, { institution: event.target.value })}
              className={`${inputClass} !py-1.5`}
              placeholder="Instituição — ex.: Inter, Itaú, XP"
              aria-label="Instituição da reserva"
            />
            <input
              value={holding.benchmark ?? ''}
              onChange={(event) => updateHolding(holding.id, { benchmark: event.target.value })}
              className={`${inputClass} !py-1.5`}
              placeholder="Referência — ex.: 100% CDI"
              aria-label="Referência da reserva"
            />
            <input
              value={holding.liquidity ?? ''}
              onChange={(event) => updateHolding(holding.id, { liquidity: event.target.value })}
              className={`${inputClass} !py-1.5`}
              placeholder="Liquidez — ex.: D+0"
              aria-label="Liquidez da reserva"
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
            Excluir posição da reserva
          </button>
        </div>
      )}
    </div>
  )
}

function NewReservePositionForm({ onClose }: { onClose: () => void }) {
  const { investmentClasses, addHolding } = useInvestmentsStore()
  const fixedIncome = investmentClasses.find((item) => item.id === 'renda-fixa')
  const [name, setName] = useState('')
  const [institution, setInstitution] = useState('')
  const [benchmark, setBenchmark] = useState('')
  const [liquidity, setLiquidity] = useState('')
  const [assetClassId, setAssetClassId] = useState(
    fixedIncome?.id ?? investmentClasses[0]?.id ?? '',
  )
  const [initialAmount, setInitialAmount] = useState(0)

  const handleAdd = () => {
    if (!name.trim() || !assetClassId) return
    addHolding({
      name,
      institution,
      benchmark,
      liquidity,
      assetClassId,
      initialAmount,
      purpose: 'emergency_fund',
    })
    onClose()
  }

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-dark-border bg-dark-surface/60 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Produto — ex.: CDB liquidez diária"
          className={inputClass}
        />
        <input
          value={institution}
          onChange={(event) => setInstitution(event.target.value)}
          placeholder="Instituição — ex.: Inter"
          className={inputClass}
        />
        <input
          value={benchmark}
          onChange={(event) => setBenchmark(event.target.value)}
          placeholder="Referência — ex.: 100% CDI"
          className={inputClass}
        />
        <input
          value={liquidity}
          onChange={(event) => setLiquidity(event.target.value)}
          placeholder="Liquidez — ex.: D+0"
          className={inputClass}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-dark-text-muted">
            Classe do ativo
          </span>
          <select
            value={assetClassId}
            onChange={(event) => setAssetClassId(event.target.value)}
            className={inputClass}
          >
            {investmentClasses.map((assetClass) => (
              <option key={assetClass.id} value={assetClass.id}>
                {assetClass.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-dark-text-muted">
            Valor aplicado hoje
          </span>
          <CurrencyInput value={initialAmount} onChange={setInitialAmount} />
        </label>
      </div>

      <div className="flex gap-2">
        <PrimaryButton onClick={handleAdd} disabled={!name.trim() || !assetClassId}>
          <Plus size={15} />
          Adicionar à reserva
        </PrimaryButton>
        <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
      </div>
    </div>
  )
}

export function ReserveSection() {
  const {
    emergencyFund,
    investmentClasses,
    summary,
    setEmergencyFundTargetMonths,
  } = useInvestmentsStore()
  const {
    emergencyFundTarget: target,
    emergencyFundRemaining: remaining,
    emergencyFundProgress: progress,
  } = useMetrics()
  const [showForm, setShowForm] = useState(false)

  const reserveHoldings = summary.reserveHoldings
  const classById = new Map(investmentClasses.map((item) => [item.id, item]))

  return (
    <Panel>
      <PanelHeader
        title="Reserva de emergência"
        icon={<Shield size={16} />}
        description="A reserva é patrimônio investido, mas tem finalidade própria: segurança e liquidez. Ela não entra no rebalanceamento da carteira de longo prazo."
        actions={
          <div className="text-right leading-tight">
            <p className="text-sm font-semibold tabular-nums text-dark-text">
              {formatCurrency(emergencyFund.current)}
            </p>
            {target > 0 && (
              <p className="text-[11px] text-dark-text-muted">
                {progress.toFixed(0)}% da meta ({emergencyFund.targetMonths} meses)
              </p>
            )}
          </div>
        }
      />

      <div className="mt-4 space-y-4">
        {target > 0 && (
          <div>
            <div className="mb-1.5 flex items-baseline justify-between text-xs">
              <span className="text-dark-text-muted">Meta: {formatCurrency(target)}</span>
              <span className="text-dark-text-muted">
                {remaining <= 0 ? 'Meta completa' : `Faltam ${formatCurrency(remaining)}`}
              </span>
            </div>
            <Meter
              value={emergencyFund.current}
              max={target}
              color={CHART_PALETTE.blue}
              height={8}
              overIsBad={false}
            />
          </div>
        )}

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-dark-text-muted">
              Meta em meses de custo
            </span>
            <SegmentedControl
              value={emergencyFund.targetMonths}
              onChange={setEmergencyFundTargetMonths}
              options={MONTH_OPTIONS.map((months) => ({ value: months, label: `${months}m` }))}
            />
          </div>
          {!showForm && (
            <SecondaryButton onClick={() => setShowForm(true)}>
              <Plus size={14} />
              Nova alocação
            </SecondaryButton>
          )}
        </div>

        {showForm && <NewReservePositionForm onClose={() => setShowForm(false)} />}

        {reserveHoldings.length === 0 ? (
          <EmptyState
            icon={<Shield size={26} />}
            title="Diga onde sua reserva está aplicada"
            action={
              !showForm && (
                <PrimaryButton onClick={() => setShowForm(true)}>
                  <Plus size={15} />
                  Adicionar aplicação
                </PrimaryButton>
              )
            }
          >
            Cadastre produto, instituição, referência e liquidez. O saldo continua sendo tratado
            como reserva e também como ativo financeiro.
          </EmptyState>
        ) : (
          <div className="space-y-2">
            {reserveHoldings.map((holding) => (
              <ReservePositionRow key={holding.id} holding={holding} />
            ))}
          </div>
        )}

        {reserveHoldings.length > 0 && (
          <div className="rounded-lg border border-dark-border-subtle bg-dark-card px-3 py-2.5 text-xs leading-relaxed text-dark-text-muted">
            <strong className="text-dark-text">Onde está alocada:</strong>{' '}
            {Array.from(
              reserveHoldings.reduce((acc, holding) => {
                const label = classById.get(holding.assetClassId)?.name ?? 'Sem classe'
                acc.set(label, (acc.get(label) ?? 0) + holding.marketValue)
                return acc
              }, new Map<string, number>()),
            )
              .map(([label, value]) => `${label} ${formatCurrency(value)}`)
              .join(' · ')}
            . Aportes nessas posições contam como investimento realizado no fechamento do ciclo.
          </div>
        )}

        {summary.reserveGain !== 0 && (
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-dark-text-muted">Rendimento acumulado da reserva</span>
            <Tag>
              <GainLabel
                gain={summary.reserveGain}
                pct={summary.reserveInvested > 0 ? (summary.reserveGain / summary.reserveInvested) * 100 : null}
              />
            </Tag>
          </div>
        )}
      </div>
    </Panel>
  )
}
