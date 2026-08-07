import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { buildAlerts, type AppAlert } from '../lib/alerts'
import { useFinancasStore } from '../context/financasStore'

const alertStyle: Record<AppAlert['severity'], { box: string; text: string }> = {
  critical: { box: 'border-rose-500/25 bg-rose-500/[0.07]', text: 'text-rose-300' },
  warning: { box: 'border-amber-500/25 bg-amber-500/[0.07]', text: 'text-amber-300' },
  ok: { box: 'border-primary-500/25 bg-primary-500/[0.07]', text: 'text-primary-300' },
}

/** Até 3 alertas do plano/ciclo — vive no hub, não numa aba separada. */
export function CycleAlerts() {
  const store = useFinancasStore()
  const alerts = buildAlerts(
    store.metrics,
    store.cards.summary,
    store.financialCycle,
    store.debts.summary,
  )

  return (
    <div className="grid gap-2.5 md:grid-cols-3">
      {alerts.map((alert) => {
        const style = alertStyle[alert.severity]
        const Icon = alert.severity === 'ok' ? CheckCircle2 : AlertTriangle
        return (
          <div key={alert.id} className={`rounded-xl border px-4 py-3 ${style.box}`}>
            <div className="flex items-start gap-2.5">
              <Icon size={15} className={`mt-0.5 shrink-0 ${style.text}`} />
              <div>
                <strong className={`block text-sm font-semibold ${style.text}`}>
                  {alert.title}
                </strong>
                <span className="mt-0.5 block text-xs leading-relaxed text-dark-text-secondary">
                  {alert.detail}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
