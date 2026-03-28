import { DollarSign } from "lucide-react";
import { Card } from "./Card";
import { CurrencyInput } from "./CurrencyInput";
import { formatCurrency } from "../utils";

interface Props {
  salaryNet: number;
  setSalaryNet: (v: number) => void;
  totalDeductions: number;
}

export function SalaryInput({
  salaryNet,
  setSalaryNet,
  totalDeductions,
}: Props) {
  const availableAfterDeductions = Math.max(0, salaryNet - totalDeductions);

  return (
    <Card
      title="Salario Liquido"
      icon={<DollarSign size={18} />}
      accentColor="bg-emerald-600"
    >
      <div className="space-y-4">
        <div>
          <label
            htmlFor="salary"
            className="block text-sm font-medium text-dark-text-secondary mb-1.5"
          >
            Salario liquido mensal
          </label>
          <CurrencyInput
            id="salary"
            value={salaryNet}
            onChange={setSalaryNet}
            placeholder="0,00"
          />
        </div>

        {totalDeductions > 0 && (
          <div className="flex items-center justify-between px-3 py-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
            <span className="text-sm text-amber-400">Descontos na fonte</span>
            <span className="text-sm font-semibold text-amber-400">
              - {formatCurrency(totalDeductions)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between px-3 py-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
          <span className="text-sm text-emerald-400">
            Disponivel para orçamento
          </span>
          <span className="text-sm font-bold text-emerald-400">
            {formatCurrency(availableAfterDeductions)}
          </span>
        </div>
      </div>
    </Card>
  );
}
