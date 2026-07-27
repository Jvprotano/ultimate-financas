import { Shield } from 'lucide-react'
import { LedgerList, LedgerMoveForm } from './Ledger'
import { Meter, Panel, PanelHeader, SegmentedControl } from './ui'
import { formatCurrency } from '../lib/format'
import { useInvestmentsStore, useMetrics } from '../context/financasStore'
import { CHART_PALETTE } from '../types/constants'

const MONTH_OPTIONS = [3, 6, 12]

export function ReserveSection() {
  const {
    emergencyFund,
    addEmergencyFundTransaction,
    removeEmergencyFundTransaction,
    setEmergencyFundTargetMonths,
  } = useInvestmentsStore()
  const {
    emergencyFundTarget: target,
    emergencyFundRemaining: remaining,
    emergencyFundProgress: progress,
  } = useMetrics()

  return (
    <Panel>
      <PanelHeader
        title="Reserva de emergência"
        icon={<Shield size={16} />}
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

      <div className="mt-4 space-y-3">
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

        <LedgerMoveForm
          onMove={addEmergencyFundTransaction}
          inLabel="Adicionar"
          outLabel="Remover"
          disableOut={emergencyFund.current <= 0}
          notePlaceholder="Nota (opcional) — ex.: aporte mensal, resgate para conserto do carro"
        />

        <LedgerList
          transactions={emergencyFund.transactions}
          onRemove={removeEmergencyFundTransaction}
        />
      </div>
    </Panel>
  )
}
