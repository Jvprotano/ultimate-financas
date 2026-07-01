import { formatCurrency } from "../utils";

interface HeaderMetricProps {
  amount: number;
  baseAmount: number;
  label?: string;
  tone?: "primary" | "emerald" | "amber" | "rose" | "violet" | "slate";
}

const toneClass = {
  primary: "text-primary-400",
  emerald: "text-emerald-400",
  amber: "text-amber-400",
  rose: "text-rose-400",
  violet: "text-violet-400",
  slate: "text-slate-200",
};

export function HeaderMetric({
  amount,
  baseAmount,
  label,
  tone = "primary",
}: HeaderMetricProps) {
  const percentage = baseAmount > 0 ? (amount / baseAmount) * 100 : 0;

  return (
    <div className="text-right leading-tight">
      {label && (
        <span className="block text-[10px] uppercase tracking-wide text-dark-text-muted">
          {label}
        </span>
      )}
      <span className={`block text-sm font-bold ${toneClass[tone]}`}>
        {formatCurrency(amount)}
      </span>
      {baseAmount > 0 && (
        <span className="block text-[11px] font-medium text-dark-text-muted">
          {percentage.toFixed(0)}% da renda
        </span>
      )}
    </div>
  );
}
