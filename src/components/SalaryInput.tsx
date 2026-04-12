import { DollarSign } from "lucide-react";
import type { SalaryInputMode } from "../types";
import { Card } from "./Card";
import { CurrencyInput } from "./CurrencyInput";
import { formatCurrency } from "../utils";

interface Props {
  salaryNet: number;
  setSalaryNet: (v: number) => void;
  salaryInputMode: SalaryInputMode;
  setSalaryInputMode: (mode: SalaryInputMode) => void;
  paycheckInAccount: number;
  totalDeductions: number;
  benefitDeductions: number;
  investmentDeductions: number;
  availableForBudget: number;
}

export function SalaryInput({
  salaryNet,
  setSalaryNet,
  salaryInputMode,
  setSalaryInputMode,
  paycheckInAccount,
  totalDeductions,
  benefitDeductions,
  investmentDeductions,
  availableForBudget,
}: Props) {
  const isTakeHomeMode = salaryInputMode === "take_home";

  return (
    <Card
      title="Salario de Referencia"
      icon={<DollarSign size={18} />}
      accentColor="bg-emerald-600"
      collapsible
      storageKey="salary"
      headerExtra={
        salaryNet > 0 ? (
          <span className="text-sm font-bold text-emerald-400">{formatCurrency(salaryNet)}</span>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <span className="block text-sm font-medium text-dark-text-secondary">
            Como interpretar o valor informado
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSalaryInputMode("take_home")}
              className={`px-3 py-2.5 rounded-xl border text-sm text-left transition-colors ${
                isTakeHomeMode
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                  : "border-dark-border bg-dark-surface text-dark-text-secondary hover:border-dark-border-subtle"
              }`}
            >
              <span className="block font-semibold">Caiu na conta</span>
              <span className="block text-[11px] opacity-70 mt-0.5">
                Informe exatamente o valor recebido
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSalaryInputMode("before_payroll_deductions")}
              className={`px-3 py-2.5 rounded-xl border text-sm text-left transition-colors ${
                !isTakeHomeMode
                  ? "border-primary-500 bg-primary-500/10 text-primary-400"
                  : "border-dark-border bg-dark-surface text-dark-text-secondary hover:border-dark-border-subtle"
              }`}
            >
              <span className="block font-semibold">Antes dos descontos</span>
              <span className="block text-[11px] opacity-70 mt-0.5">
                Informe o valor antes do que esta abaixo
              </span>
            </button>
          </div>
          <div className="px-3 py-2.5 rounded-xl border border-dark-border bg-dark-surface text-xs text-dark-text-muted">
            {isTakeHomeMode
              ? "Use esta opcao se voce quer digitar o valor que realmente caiu na conta. Investimentos em folha entram de volta na base do orcamento; beneficios nao sao descontados de novo."
              : "Use esta opcao se o valor informado ainda inclui os descontos cadastrados abaixo. Beneficios saem da base do orcamento e investimentos em folha continuam contando como investimento."}
          </div>
        </div>

        <div>
          <label
            htmlFor="salary"
            className="block text-sm font-medium text-dark-text-secondary mb-1.5"
          >
            {isTakeHomeMode ? "Valor recebido na conta" : "Salario antes dos descontos em folha"}
          </label>
          <CurrencyInput
            id="salary"
            value={salaryNet}
            onChange={setSalaryNet}
            placeholder="0,00"
          />
        </div>

        {totalDeductions > 0 && (
          <div className="space-y-2">
            {benefitDeductions > 0 && (
              <div className="flex items-center justify-between px-3 py-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <span className="text-sm text-amber-400">Descontos (beneficios)</span>
                <span className="text-sm font-semibold text-amber-400">
                  - {formatCurrency(benefitDeductions)}
                </span>
              </div>
            )}
            {investmentDeductions > 0 && (
              <div className="flex items-center justify-between px-3 py-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <span className="text-sm text-emerald-400">Previdencia (investimento)</span>
                <span className="text-sm font-semibold text-emerald-400">
                  {formatCurrency(investmentDeductions)}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center justify-between px-3 py-2.5 bg-sky-500/10 rounded-xl border border-sky-500/20">
            <span className="text-sm text-sky-400">Cai na conta</span>
            <span className="text-sm font-bold text-sky-400">
              {formatCurrency(paycheckInAccount)}
            </span>
          </div>
          <div className="flex items-center justify-between px-3 py-2.5 bg-primary-500/10 rounded-xl border border-primary-500/20">
            <span className="text-sm text-primary-400">Base do orcamento</span>
            <span className="text-sm font-bold text-primary-400">
              {formatCurrency(availableForBudget)}
            </span>
          </div>
        </div>

        {isTakeHomeMode && benefitDeductions > 0 && (
          <p className="text-xs text-dark-text-muted">
            Os beneficios cadastrados ja estao fora do valor recebido e nao serao abatidos novamente.
          </p>
        )}
      </div>
    </Card>
  );
}
