import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency } from "../utils";

interface Props {
  salaryNet: number;
  totalDeductions: number;
  availableForBudget: number;
  totalCosts: number;
  balanceAfterCosts: number;
}

export function Summary({
  salaryNet,
  availableForBudget,
  totalCosts,
  balanceAfterCosts,
}: Props) {
  if (salaryNet <= 0) return null;

  const isOverBudget = totalCosts > availableForBudget;
  const savingsRate =
    availableForBudget > 0
      ? ((availableForBudget - totalCosts) / availableForBudget) * 100
      : 0;
  const costRatio =
    availableForBudget > 0 ? (totalCosts / availableForBudget) * 100 : 0;

  const stats = [
    {
      label: "Salario Liquido",
      value: formatCurrency(salaryNet),
      icon: <Wallet size={18} />,
      color: "bg-primary-500/10 text-primary-400 border-primary-500/20",
      iconBg: "bg-primary-500/20",
    },
    {
      label: "Disponivel",
      value: formatCurrency(availableForBudget),
      icon: <PiggyBank size={18} />,
      color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      iconBg: "bg-emerald-500/20",
    },
    {
      label: "Total de Custos",
      value: formatCurrency(totalCosts),
      icon: <TrendingDown size={18} />,
      color: "bg-rose-500/10 text-rose-400 border-rose-500/20",
      iconBg: "bg-rose-500/20",
      sub: `${costRatio.toFixed(1)}% do disponivel`,
    },
    {
      label: "Saldo Livre",
      value: formatCurrency(balanceAfterCosts),
      icon: isOverBudget ? (
        <AlertTriangle size={18} />
      ) : (
        <TrendingUp size={18} />
      ),
      color: isOverBudget
        ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      iconBg: isOverBudget ? "bg-rose-500/20" : "bg-emerald-500/20",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`px-4 py-4 rounded-2xl border ${s.color}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-8 h-8 rounded-lg ${s.iconBg} flex items-center justify-center`}
              >
                {s.icon}
              </div>
            </div>
            <span className="block text-xs font-medium opacity-70">
              {s.label}
            </span>
            <span className="block text-lg font-bold mt-0.5">{s.value}</span>
            {s.sub && (
              <span className="block text-[11px] opacity-60 mt-0.5">
                {s.sub}
              </span>
            )}
          </div>
        ))}
      </div>

      {isOverBudget && (
        <div className="flex items-center gap-3 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
          <AlertTriangle size={18} className="text-rose-400 shrink-0" />
          <p className="text-sm text-rose-300">
            <strong>Atencao:</strong> Seus custos excedem o valor disponivel em{" "}
            <strong>{formatCurrency(Math.abs(balanceAfterCosts))}</strong>.
            Revise seus gastos.
          </p>
        </div>
      )}

      {!isOverBudget && savingsRate > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <TrendingUp size={18} className="text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-300">
            Voce esta economizando <strong>{savingsRate.toFixed(1)}%</strong> do
            seu orçamento disponivel.
            {savingsRate >= 20 && " Excelente!"}
          </p>
        </div>
      )}
    </div>
  );
}
