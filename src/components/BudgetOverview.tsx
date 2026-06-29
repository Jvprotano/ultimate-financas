import { useState } from 'react'
import { AlertTriangle, ArrowRight, CheckCircle2, Landmark, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { Card } from './Card'
import { CurrencyInput } from './CurrencyInput'
import { HeaderMetric } from './HeaderMetric'
import type { AllocationTransfer, BudgetArea, BudgetBucket } from '../types'
import { BUDGET_AREA_LABELS } from '../types/constants'
import { formatCurrency } from '../utils'

interface Props {
  budgetComparison: Record<string, BudgetBucket>
  allocationTransfers: AllocationTransfer[]
  addAllocationTransfer: (from: BudgetArea, to: BudgetArea, amount: number) => void
  removeAllocationTransfer: (id: string) => void
  clearAllocationTransfers: () => void
  investmentDeductions: number
  employerInvestmentContributions: number
  directInvestmentTarget: number
  availableForBudget: number
  selectedModel: {
    necessidades: number
    desejos: number
    investimentos: number
  }
  baseBudgetAllocation: Record<BudgetArea, number>
  balanceAfterCosts: number
}

const AREAS: BudgetArea[] = ['necessidades', 'desejos', 'investimentos']

const areaStyle: Record<
  BudgetArea,
  {
    text: string
    bg: string
    border: string
    fill: string
    pct: number
  }
> = {
  necessidades: {
    text: 'text-sky-300',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/25',
    fill: 'bg-sky-500',
    pct: 0,
  },
  desejos: {
    text: 'text-violet-300',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/25',
    fill: 'bg-violet-500',
    pct: 0,
  },
  investimentos: {
    text: 'text-emerald-300',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/25',
    fill: 'bg-emerald-500',
    pct: 0,
  },
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function getDiffLabel(area: BudgetArea, diff: number) {
  if (Math.abs(diff) < 0.01) return 'No limite'
  if (area === 'investimentos') {
    return diff > 0 ? 'Falta aportar' : 'Acima da meta'
  }
  return diff > 0 ? 'Sobrando' : 'Faltando'
}

function getDiffTone(area: BudgetArea, diff: number) {
  if (Math.abs(diff) < 0.01) return 'text-primary-300 bg-primary-500/10 border-primary-500/20'
  if (area === 'investimentos') {
    return diff > 0
      ? 'text-amber-300 bg-amber-500/10 border-amber-500/20'
      : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20'
  }
  return diff > 0
    ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20'
    : 'text-rose-300 bg-rose-500/10 border-rose-500/20'
}

function BucketCard({
  area,
  bucket,
  modelPct,
}: {
  area: BudgetArea
  bucket: BudgetBucket
  modelPct: number
}) {
  const style = areaStyle[area]
  const pct = bucket.target > 0 ? (bucket.actual / bucket.target) * 100 : 0
  const baseTarget = bucket.baseTarget ?? bucket.target
  const movedNet = (bucket.movedIn ?? 0) - (bucket.movedOut ?? 0)

  return (
    <article className={`rounded-lg border ${style.border} ${style.bg} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-dark-text">{BUDGET_AREA_LABELS[area]}</h3>
          <p className="text-xs text-dark-text-muted">{modelPct}% no modelo escolhido</p>
        </div>
        <span className={`rounded-lg border px-2 py-1 text-xs font-bold ${getDiffTone(area, bucket.diff)}`}>
          {getDiffLabel(area, bucket.diff)}
        </span>
      </div>

      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/[0.07]">
        <div className={`h-full rounded-full ${style.fill}`} style={{ width: `${clamp(pct, 0, 100)}%` }} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-dark-text-muted">Meta atual</dt>
          <dd className="font-bold text-dark-text">{formatCurrency(bucket.target)}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-dark-text-muted">Usado</dt>
          <dd className="font-bold text-dark-text">{formatCurrency(bucket.actual)}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-dark-text-muted">Base original</dt>
          <dd className="font-medium text-dark-text-secondary">{formatCurrency(baseTarget)}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-dark-text-muted">Diferenca</dt>
          <dd className={`font-bold ${bucket.diff >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
            {formatCurrency(Math.abs(bucket.diff))}
          </dd>
        </div>
      </dl>

      {Math.abs(movedNet) > 0.01 && (
        <p className="mt-3 rounded-lg border border-white/10 bg-black/15 px-3 py-2 text-xs text-dark-text-secondary">
          {movedNet > 0 ? 'Recebeu' : 'Enviou'} {formatCurrency(Math.abs(movedNet))} por transferencias.
        </p>
      )}
    </article>
  )
}

export function BudgetOverview({
  budgetComparison,
  allocationTransfers,
  addAllocationTransfer,
  removeAllocationTransfer,
  clearAllocationTransfers,
  investmentDeductions,
  employerInvestmentContributions,
  directInvestmentTarget,
  availableForBudget,
  selectedModel,
  baseBudgetAllocation,
  balanceAfterCosts,
}: Props) {
  const [fromArea, setFromArea] = useState<BudgetArea>('necessidades')
  const [toArea, setToArea] = useState<BudgetArea>('investimentos')
  const [amount, setAmount] = useState(0)

  if (availableForBudget <= 0) return null

  const buckets = budgetComparison as Record<BudgetArea, BudgetBucket>
  const sourceCapacity = Math.max(0, buckets[fromArea].target - buckets[fromArea].actual)
  const canTransfer = fromArea !== toArea && amount > 0 && sourceCapacity > 0
  const transferAmount = Math.min(amount, sourceCapacity)
  const totalMoved = allocationTransfers.reduce((sum, transfer) => sum + transfer.amount, 0)
  const investmentFromPayroll = investmentDeductions + employerInvestmentContributions

  const handleTransfer = () => {
    if (!canTransfer) return
    addAllocationTransfer(fromArea, toArea, transferAmount)
    setAmount(0)
  }

  return (
    <Card
      title="Plano de Alocacao"
      icon={<Landmark size={18} />}
      accentColor="bg-primary-600"
      collapsible
      storageKey="budget-overview"
      headerExtra={<HeaderMetric amount={availableForBudget} baseAmount={availableForBudget} label="Base" />}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <BucketCard area="necessidades" modelPct={selectedModel.necessidades} bucket={buckets.necessidades} />
          <BucketCard area="desejos" modelPct={selectedModel.desejos} bucket={buckets.desejos} />
          <BucketCard area="investimentos" modelPct={selectedModel.investimentos} bucket={buckets.investimentos} />
        </div>

        <section className="rounded-lg border border-dark-border bg-dark-surface p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-dark-text">Mover diferenca entre alocacoes</h3>
              <p className="mt-1 text-xs leading-relaxed text-dark-text-muted">
                Use quando uma caixa tem folga e outra precisa de mais meta. O movimento altera as metas, nao os gastos
                cadastrados.
              </p>
            </div>
            {allocationTransfers.length > 0 && (
              <button
                type="button"
                onClick={clearAllocationTransfers}
                className="inline-flex items-center gap-1.5 rounded-lg border border-dark-border bg-dark-input px-3 py-2 text-xs font-semibold text-dark-text-secondary transition-colors hover:border-rose-500/40 hover:text-rose-300"
              >
                <RotateCcw size={13} />
                Limpar
              </button>
            )}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_180px_auto] lg:items-end">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-dark-text-muted">Sair de</span>
              <select
                value={fromArea}
                onChange={(event) => setFromArea(event.target.value as BudgetArea)}
                className="w-full rounded-lg border border-dark-border bg-dark-input px-3 py-2.5 text-sm text-dark-text outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
              >
                {AREAS.map((area) => (
                  <option key={area} value={area}>
                    {BUDGET_AREA_LABELS[area]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-dark-text-muted">Ir para</span>
              <select
                value={toArea}
                onChange={(event) => setToArea(event.target.value as BudgetArea)}
                className="w-full rounded-lg border border-dark-border bg-dark-input px-3 py-2.5 text-sm text-dark-text outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
              >
                {AREAS.map((area) => (
                  <option key={area} value={area}>
                    {BUDGET_AREA_LABELS[area]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-dark-text-muted">Valor</span>
              <CurrencyInput value={amount} onChange={setAmount} />
            </label>

            <button
              type="button"
              onClick={handleTransfer}
              disabled={!canTransfer}
              className="inline-flex h-[42px] items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={15} />
              Migrar
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-lg border border-dark-border bg-black/15 px-2.5 py-1.5 text-dark-text-muted">
              Folga em {BUDGET_AREA_LABELS[fromArea]}: {formatCurrency(sourceCapacity)}
            </span>
            {amount > sourceCapacity && sourceCapacity > 0 && (
              <span className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1.5 text-amber-300">
                O movimento sera limitado a {formatCurrency(sourceCapacity)}.
              </span>
            )}
            {totalMoved > 0 && (
              <span className="rounded-lg border border-primary-500/20 bg-primary-500/10 px-2.5 py-1.5 text-primary-300">
                {formatCurrency(totalMoved)} em movimentos ativos.
              </span>
            )}
          </div>

          {allocationTransfers.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-dark-border-subtle pt-4">
              {allocationTransfers.map((transfer) => (
                <div
                  key={transfer.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-dark-border bg-dark-input px-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm text-dark-text-secondary">
                    <span className="truncate">{BUDGET_AREA_LABELS[transfer.from]}</span>
                    <ArrowRight size={14} className="shrink-0 text-dark-text-muted" />
                    <span className="truncate">{BUDGET_AREA_LABELS[transfer.to]}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <strong className="text-sm text-dark-text">{formatCurrency(transfer.amount)}</strong>
                    <button
                      type="button"
                      onClick={() => removeAllocationTransfer(transfer.id)}
                      className="rounded-lg p-1.5 text-dark-text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                      aria-label="Remover transferencia"
                    >
                      <Trash2 size={14} />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-dark-border bg-dark-surface px-3 py-3">
            <span className="block text-xs text-dark-text-muted">Base original</span>
            <strong className="text-sm text-dark-text">
              {formatCurrency(baseBudgetAllocation.necessidades + baseBudgetAllocation.desejos + baseBudgetAllocation.investimentos)}
            </strong>
          </div>
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-3">
            <span className="block text-xs text-emerald-300">Investimento via folha</span>
            <strong className="text-sm text-emerald-100">{formatCurrency(investmentFromPayroll)}</strong>
          </div>
          <div
            className={`rounded-lg border px-3 py-3 ${
              balanceAfterCosts >= 0
                ? 'border-emerald-500/20 bg-emerald-500/10'
                : 'border-rose-500/20 bg-rose-500/10'
            }`}
          >
            <span className={`block text-xs ${balanceAfterCosts >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              Saldo real apos plano
            </span>
            <strong className={`text-sm ${balanceAfterCosts >= 0 ? 'text-emerald-100' : 'text-rose-100'}`}>
              {formatCurrency(balanceAfterCosts)}
            </strong>
          </div>
        </section>

        {directInvestmentTarget > 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            <CheckCircle2 size={16} className="shrink-0" />
            Aporte direto necessario: <strong>{formatCurrency(directInvestmentTarget)}</strong>.
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            <AlertTriangle size={16} className="shrink-0" />
            A meta de investimentos ja foi coberta por folha, empresa ou movimentos de meta.
          </div>
        )}
      </div>
    </Card>
  )
}
