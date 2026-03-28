import { Shield } from 'lucide-react'
import { Card } from './Card'
import { formatCurrency } from '../utils'

interface Props {
  totalCosts: number
}

export function EmergencyFund({ totalCosts }: Props) {
  if (totalCosts <= 0) return null

  const months = [3, 6, 12]

  return (
    <Card title="Reserva de Emergencia" icon={<Shield size={18} />} accentColor="bg-slate-600">
      <div className="space-y-3">
        <p className="text-xs text-dark-text-muted">
          Baseado nos seus custos mensais, o ideal e ter reservado:
        </p>
        <div className="grid grid-cols-3 gap-3">
          {months.map((m) => (
            <div key={m} className="px-3 py-3 bg-dark-surface rounded-xl border border-dark-border text-center">
              <span className="block text-xs text-dark-text-muted">{m} meses</span>
              <span className="block text-base font-bold text-dark-text mt-1">
                {formatCurrency(totalCosts * m)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
