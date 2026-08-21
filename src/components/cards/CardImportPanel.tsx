import { FileText, Upload } from 'lucide-react'
import { Panel, PanelHeader } from '../ui'
import { formatMonthLong, inputClass } from '../../lib/format'
import type { CreditCardCycle } from '../../types'

export function CardImportPanel({
  text,
  onTextChange,
  cycle,
  onCycleChange,
  replace,
  onReplaceChange,
  detectedCount,
  currentDueMonth,
  nextDueMonth,
  onImport,
}: {
  text: string
  onTextChange: (value: string) => void
  cycle: CreditCardCycle
  onCycleChange: (cycle: CreditCardCycle) => void
  replace: boolean
  onReplaceChange: (replace: boolean) => void
  detectedCount: number
  currentDueMonth: string
  nextDueMonth: string
  onImport: () => void
}) {
  return (
    <Panel>
      <PanelHeader
        title="Colar planilha do cartão"
        icon={<Upload size={16} />}
        description='Cole linhas do Sheets com colunas parecidas: Descrição, Data, Cartão, Fatura, É meu, Restante, Área, Assinatura e Pago. Parcelas como "3/10" no nome são detectadas automaticamente.'
        actions={
          <span className="rounded-lg border border-dark-border bg-dark-surface px-3 py-1.5 text-xs font-medium text-dark-text-secondary">
            {detectedCount} linhas detectadas
          </span>
        }
      />
      <textarea
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        aria-label="Conteúdo da planilha"
        placeholder={'Descrição\tData\tCartão\tFatura\tÉ meu\tRestante\tÁrea\nYoutube premium\t20/06\tItaú\t53,90\t53,90\t0\tdesejo'}
        className="app-field mt-4 min-h-[200px] w-full px-4 py-3 font-mono text-xs"
      />
      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-dark-border bg-dark-surface p-3">
        <label className="block min-w-[150px] flex-1">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-dark-text-muted">Destino</span>
          <select
            value={cycle}
            onChange={(event) => onCycleChange(event.target.value as CreditCardCycle)}
            className={inputClass}
          >
            <option value="current">Fatura ativa · pagar em {formatMonthLong(currentDueMonth)}</option>
            <option value="next">Próxima fatura · pagar em {formatMonthLong(nextDueMonth)}</option>
          </select>
        </label>
        <label className="flex h-[46px] min-w-[200px] flex-1 cursor-pointer items-center gap-2 rounded-xl border border-dark-border bg-dark-input px-3 text-sm text-dark-text-secondary transition-colors hover:border-dark-text-muted/40 hover:text-dark-text">
          <input
            type="checkbox"
            checked={replace}
            onChange={(event) => onReplaceChange(event.target.checked)}
            className="h-4 w-4 rounded accent-primary-600"
          />
          Substituir fatura de destino
        </label>
        <button
          type="button"
          onClick={onImport}
          disabled={detectedCount === 0}
          className="inline-flex h-[46px] items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-6 text-sm font-semibold text-white transition-all hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <FileText size={16} />
          Importar dados
        </button>
      </div>
    </Panel>
  )
}
