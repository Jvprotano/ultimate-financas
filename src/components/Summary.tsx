import {
  Wallet,
  PiggyBank,
  Receipt,
  Heart,
  TrendingUp,
} from "lucide-react";
import type { SalaryInputMode } from "../types";
import { formatCurrency } from "../utils";

interface Props {
  salaryNet: number;
  salaryInputMode: SalaryInputMode;
  paycheckInAccount: number;
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
  salaryInputMode,
  paycheckInAccount,
  totalDeductions,
  benefitDeductions,
  investmentDeductions,
  availableForBudget,
  totalCosts,
  totalWants,
  balanceAfterCosts,
}: Props) {
  if (salaryNet <= 0) return null;

  const stats = [
    {
      label: "Valor Informado",
      value: formatCurrency(salaryNet),
      icon: <Wallet size={18} />,
      color: "bg-primary-500/10 text-primary-400 border-primary-500/20",
      iconBg: "bg-primary-500/20",
      sub: salaryInputMode === "take_home"
        ? "Valor que caiu na conta"
        : "Valor antes dos descontos em folha",
    },
    {
      label: "Cai na Conta",
      value: formatCurrency(paycheckInAccount),
      icon: <Wallet size={18} />,
      color: "bg-sky-500/10 text-sky-400 border-sky-500/20",
      iconBg: "bg-sky-500/20",
      sub: salaryInputMode === "before_payroll_deductions"
        ? totalDeductions > 0
          ? `Descontos em folha: ${formatCurrency(totalDeductions)}`
          : "Sem descontos cadastrados"
        : "Ja corresponde ao valor recebido",
    },
    {
      label: "Base do Orcamento",
      value: formatCurrency(availableForBudget),
      icon: <PiggyBank size={18} />,
      color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      iconBg: "bg-emerald-500/20",
      sub: salaryInputMode === "before_payroll_deductions"
        ? benefitDeductions > 0
          ? `Beneficios removidos: ${formatCurrency(benefitDeductions)}`
          : "Sem beneficios abatidos"
        : investmentDeductions > 0
          ? `Somando ${formatCurrency(investmentDeductions)} de investimento em folha`
          : "Mesmo valor que caiu na conta",
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
      label: "Saldo Livre",
      value: formatCurrency(balanceAfterCosts),
      icon: <TrendingUp size={18} />,
      color: balanceAfterCosts >= 0
        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        : "bg-rose-500/10 text-rose-400 border-rose-500/20",
      iconBg: balanceAfterCosts >= 0 ? "bg-emerald-500/20" : "bg-rose-500/20",
      sub: "Apos custos, desejos e aporte alocado",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className={`px-4 py-4 rounded-lg border ${s.color}`}
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
