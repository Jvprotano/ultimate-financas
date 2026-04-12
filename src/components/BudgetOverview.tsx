import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Landmark,
  ArrowRight,
  Shuffle,
} from "lucide-react";
import { Card } from "./Card";
import type { BudgetBucket } from "../types";
import { formatCurrency } from "../utils";

interface Props {
  budgetComparison: Record<string, BudgetBucket>;
  investmentDeductions: number;
  directInvestmentTarget: number;
  unallocatedMoney: number;
  availableForBudget: number;
  selectedModel: {
    necessidades: number;
    desejos: number;
    investimentos: number;
  };
  baseBudgetAllocation: {
    necessidades: number;
    desejos: number;
    investimentos: number;
  };
  budgetAllocation: {
    necessidades: number;
    desejos: number;
    investimentos: number;
  };
  necessidadesSurplus: number;
  surplusToDesejos: number;
  setSurplusToDesejos: (v: number) => void;
}

function ProgressBar({
  percentage,
  color,
  bgColor,
}: {
  percentage: number;
  color: string;
  bgColor: string;
}) {
  const isOver = percentage > 100;

  return (
    <div className={`w-full h-3 rounded-full ${bgColor} overflow-hidden`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${color} ${
          isOver ? "animate-pulse" : ""
        }`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  );
}

function BucketCard({
  label,
  modelPct,
  bucket,
  color,
  bgColor,
  barColor,
  barBg,
  icon,
  extraInfo,
  hasBonus,
  bonusAmount,
  actualLabel = 'Atual',
  underLabel = 'Sobrando',
  exactLabel = 'Exatamente no limite',
}: {
  label: string;
  modelPct: number;
  bucket: BudgetBucket;
  color: string;
  bgColor: string;
  barColor: string;
  barBg: string;
  icon: React.ReactNode;
  extraInfo?: React.ReactNode;
  hasBonus?: boolean;
  bonusAmount?: number;
  actualLabel?: string;
  underLabel?: string;
  exactLabel?: string;
}) {
  const isOver = bucket.actual > bucket.target;
  const isUnder = bucket.diff > 0;
  const pct = bucket.target > 0 ? (bucket.actual / bucket.target) * 100 : 0;

  return (
    <div className={`rounded-2xl border ${bgColor} p-5 space-y-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}
          >
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-bold text-dark-text">{label}</h3>
            <span className="text-xs text-dark-text-muted">
              {modelPct}% do orçamento
            </span>
          </div>
        </div>
        {bucket.target > 0 && (
          <span className="text-xs font-medium text-dark-text-muted">
            {pct.toFixed(0)}%
          </span>
        )}
      </div>

      <ProgressBar percentage={pct} color={barColor} bgColor={barBg} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="block text-[11px] text-dark-text-muted uppercase tracking-wide">
            Meta
          </span>
          <span className="block text-base font-bold text-dark-text">
            {formatCurrency(bucket.target)}
          </span>
          {hasBonus && bonusAmount && bonusAmount > 0 && (
            <span className="block text-[11px] text-emerald-400 mt-0.5">
              +{formatCurrency(bonusAmount)} redistribuido
            </span>
          )}
        </div>
        <div>
          <span className="block text-[11px] text-dark-text-muted uppercase tracking-wide">
            {actualLabel}
          </span>
          <span className="block text-base font-bold text-dark-text">
            {formatCurrency(bucket.actual)}
          </span>
        </div>
      </div>

      {extraInfo}

      {bucket.target > 0 && (
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${
            isOver
              ? "bg-rose-500/15 text-rose-400"
              : isUnder
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-primary-500/15 text-primary-400"
          }`}
        >
          {isOver ? (
            <>
              <AlertTriangle size={14} />
              Excedendo em {formatCurrency(Math.abs(bucket.diff))}
            </>
          ) : isUnder ? (
            <>
              <CheckCircle2 size={14} />
              {underLabel} {formatCurrency(bucket.diff)}
            </>
          ) : (
            <>
              <CheckCircle2 size={14} />
              {exactLabel}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function BudgetOverview({
  budgetComparison,
  investmentDeductions,
  directInvestmentTarget,
  unallocatedMoney,
  availableForBudget,
  selectedModel,
  baseBudgetAllocation,
  budgetAllocation,
  necessidadesSurplus,
  surplusToDesejos,
  setSurplusToDesejos,
}: Props) {
  if (availableForBudget <= 0) return null;

  const n = budgetComparison.necessidades;
  const d = budgetComparison.desejos;
  const i = budgetComparison.investimentos;

  const surplusForDesejos = necessidadesSurplus * surplusToDesejos / 100;
  const surplusForInvestimentos = necessidadesSurplus - surplusForDesejos;

  return (
    <Card
      title="Visao do Orçamento"
      icon={<Landmark size={18} />}
      accentColor="bg-primary-600"
      collapsible
      storageKey="budget-overview"
      headerExtra={
        <div className="text-right leading-tight">
          <span className="block text-[10px] uppercase tracking-wide text-dark-text-muted">
            Total
          </span>
          <span className="text-sm font-bold text-primary-400">{formatCurrency(availableForBudget)}</span>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Necessidades */}
          <BucketCard
            label="Necessidades"
            modelPct={selectedModel.necessidades}
            bucket={n}
            color="bg-primary-500/20 text-primary-400"
            bgColor="bg-primary-500/5 border-primary-500/20"
            barColor="bg-primary-500"
            barBg="bg-primary-500/20"
            icon={<TrendingDown size={18} />}
          />

          {/* Desejos */}
          <BucketCard
            label="Desejos"
            modelPct={selectedModel.desejos}
            bucket={d}
            color="bg-violet-500/20 text-violet-400"
            bgColor="bg-violet-500/5 border-violet-500/20"
            barColor="bg-violet-500"
            barBg="bg-violet-500/20"
            icon={<TrendingUp size={18} />}
            hasBonus={surplusForDesejos > 0}
            bonusAmount={surplusForDesejos}
          />

          {/* Investimentos */}
          <BucketCard
            label="Investimentos"
            modelPct={selectedModel.investimentos}
            bucket={i}
            color="bg-emerald-500/20 text-emerald-400"
            bgColor="bg-emerald-500/5 border-emerald-500/20"
            barColor="bg-emerald-500"
            barBg="bg-emerald-500/20"
            icon={<TrendingUp size={18} />}
            hasBonus={surplusForInvestimentos > 0}
            bonusAmount={surplusForInvestimentos}
            actualLabel="Alocado"
            underLabel="Falta alocar"
            exactLabel="Total alocado"
            extraInfo={
              investmentDeductions > 0 ? (
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-dark-text-secondary">
                    <span>Previdencia (fonte)</span>
                    <span className="font-semibold text-emerald-400">
                      {formatCurrency(investmentDeductions)}
                    </span>
                  </div>
                  <div className="flex justify-between text-dark-text-secondary">
                    <span>Aporte direto necessario</span>
                    <span className="font-semibold text-dark-text">
                      {formatCurrency(directInvestmentTarget)}
                    </span>
                  </div>
                </div>
              ) : null
            }
          />
        </div>

        {/* Surplus redistribution slider */}
        {necessidadesSurplus > 0 && (
          <div className="p-4 bg-dark-surface rounded-xl border border-dark-border space-y-3">
            <div className="flex items-center gap-2">
              <Shuffle size={16} className="text-emerald-400 shrink-0" />
              <p className="text-sm text-dark-text">
                Voce tem <strong className="text-emerald-400">{formatCurrency(necessidadesSurplus)}</strong> sobrando
                em necessidades. Redistribua:
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-violet-400 font-medium">
                  Desejos: {surplusToDesejos}% ({formatCurrency(surplusForDesejos)})
                </span>
                <span className="text-emerald-400 font-medium">
                  Investimentos: {100 - surplusToDesejos}% ({formatCurrency(surplusForInvestimentos)})
                </span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={surplusToDesejos}
                  onChange={(e) => setSurplusToDesejos(parseInt(e.target.value))}
                  className="w-full h-2.5 rounded-full appearance-none cursor-pointer
                    bg-gradient-to-r from-violet-500 to-emerald-500
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
                    [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-dark-border
                    [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5
                    [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white
                    [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-dark-border
                    [&::-moz-range-thumb]:cursor-pointer"
                />
              </div>
              <div className="flex justify-between text-[11px] text-dark-text-muted">
                <span>100% desejos</span>
                <span>100% investimentos</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-dark-border-subtle">
              <div className="text-center">
                <span className="block text-[11px] text-dark-text-muted">Desejos efetivo</span>
                <span className="block text-sm font-bold text-violet-400">
                  {formatCurrency(budgetAllocation.desejos)}
                </span>
                <span className="block text-[11px] text-dark-text-muted">
                  {formatCurrency(baseBudgetAllocation.desejos)} + {formatCurrency(surplusForDesejos)}
                </span>
              </div>
              <div className="text-center">
                <span className="block text-[11px] text-dark-text-muted">Investimentos efetivo</span>
                <span className="block text-sm font-bold text-emerald-400">
                  {formatCurrency(budgetAllocation.investimentos)}
                </span>
                <span className="block text-[11px] text-dark-text-muted">
                  {formatCurrency(baseBudgetAllocation.investimentos)} + {formatCurrency(surplusForInvestimentos)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Unallocated money summary */}
        {unallocatedMoney !== 0 && (
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
              unallocatedMoney > 0
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-rose-500/10 border-rose-500/20"
            }`}
          >
            {unallocatedMoney > 0 ? (
              <>
                <ArrowRight
                  size={16}
                  className="text-emerald-400 shrink-0"
                />
                <p className="text-sm text-emerald-300">
                  <strong>{formatCurrency(unallocatedMoney)}</strong> disponivel
                  apos necessidades e descontos de investimento
                </p>
              </>
            ) : (
              <>
                <AlertTriangle
                  size={16}
                  className="text-rose-400 shrink-0"
                />
                <p className="text-sm text-rose-300">
                  Voce esta{" "}
                  <strong>
                    {formatCurrency(Math.abs(unallocatedMoney))}
                  </strong>{" "}
                  acima do orçamento. Revise seus gastos.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
