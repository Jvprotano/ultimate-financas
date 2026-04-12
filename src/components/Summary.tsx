import {
  Wallet,
  PiggyBank,
  Receipt,
  Heart,
  TrendingUp,
} from "lucide-react";
import { formatCurrency } from "../utils";

interface Props {
  salaryNet: number;
  totalDeductions: number;
  benefitDeductions: number;
  investmentDeductions: number;
  availableForBudget: number;
  totalCosts: number;
  totalWants: number;
  balanceAfterCosts: number;
}

export function Summary({
  salaryNet,
  availableForBudget,
  totalCosts,
  totalWants,
  investmentDeductions,
  balanceAfterCosts,
}: Props) {
  if (salaryNet <= 0) return null;

  const stats = [
    {
      label: "Salario Liquido",
      value: formatCurrency(salaryNet),
      icon: <Wallet size={18} />,
      color: "bg-primary-500/10 text-primary-400 border-primary-500/20",
      iconBg: "bg-primary-500/20",
    },
    {
      label: "Disponivel p/ Orçamento",
      value: formatCurrency(availableForBudget),
      icon: <PiggyBank size={18} />,
      color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      iconBg: "bg-emerald-500/20",
      sub: investmentDeductions > 0
        ? `Inclui ${formatCurrency(investmentDeductions)} de previdencia`
        : undefined,
    },
    {
      label: "Necessidades",
      value: formatCurrency(totalCosts),
      icon: <Receipt size={18} />,
      color: "bg-rose-500/10 text-rose-400 border-rose-500/20",
      iconBg: "bg-rose-500/20",
    },
    {
      label: "Desejos",
      value: formatCurrency(totalWants),
      icon: <Heart size={18} />,
      color: "bg-violet-500/10 text-violet-400 border-violet-500/20",
      iconBg: "bg-violet-500/20",
    },
    {
      label: "Saldo na Conta",
      value: formatCurrency(balanceAfterCosts),
      icon: <TrendingUp size={18} />,
      color: balanceAfterCosts >= 0
        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        : "bg-rose-500/10 text-rose-400 border-rose-500/20",
      iconBg: balanceAfterCosts >= 0 ? "bg-emerald-500/20" : "bg-rose-500/20",
      sub: "Apos custos e desejos",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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
  );
}
