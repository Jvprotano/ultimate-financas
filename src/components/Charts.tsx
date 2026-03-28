import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { Card } from "./Card";
import type { DiversificationSlice, CostCategory } from "../types";
import { COST_CATEGORY_LABELS, COST_CATEGORY_COLORS } from "../types/constants";
import { formatCurrency } from "../utils";

interface Props {
  budgetAllocation: {
    necessidades: number;
    desejos: number;
    investimentos: number;
  };
  investmentAllocation: (DiversificationSlice & { amount: number })[];
  costsByCategory: Map<string, number>;
  availableForBudget: number;
}

const BUDGET_COLORS = ["#3b82f6", "#a78bfa", "#34d399"];

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: { color?: string; fill?: string };
  }>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-card px-3 py-2 rounded-lg shadow-lg border border-dark-border text-sm">
      <p className="font-medium text-dark-text">{payload[0].name}</p>
      <p className="text-primary-400 font-semibold">
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderLegend(props: any) {
  const { payload } = props as {
    payload?: Array<{ value: string; color: string }>;
  };
  if (!payload) return null;
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
      {payload.map((entry) => (
        <span
          key={entry.value}
          className="flex items-center gap-1.5 text-xs text-dark-text-secondary"
        >
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          {entry.value}
        </span>
      ))}
    </div>
  );
}

export function Charts({
  budgetAllocation,
  investmentAllocation,
  costsByCategory,
  availableForBudget,
}: Props) {
  if (availableForBudget <= 0) return null;

  const budgetData = [
    {
      name: "Necessidades",
      value: budgetAllocation.necessidades,
      color: BUDGET_COLORS[0],
    },
    {
      name: "Desejos",
      value: budgetAllocation.desejos,
      color: BUDGET_COLORS[1],
    },
    {
      name: "Investimentos",
      value: budgetAllocation.investimentos,
      color: BUDGET_COLORS[2],
    },
  ].filter((d) => d.value > 0);

  const investmentData = investmentAllocation
    .filter((d) => d.amount > 0)
    .map((d) => ({ name: d.name, value: d.amount, color: d.color }));

  const costData = Array.from(costsByCategory.entries())
    .map(([cat, value]) => ({
      name: COST_CATEGORY_LABELS[cat as CostCategory] || cat,
      value,
      fill: COST_CATEGORY_COLORS[cat as CostCategory] || "#64748b",
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <Card
      title="Visao Geral"
      icon={<BarChart3 size={18} />}
      accentColor="bg-slate-600"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Budget Split */}
        <div>
          <h3 className="text-sm font-semibold text-dark-text-secondary mb-3 text-center">
            Divisao do Orçamento
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={budgetData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {budgetData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={renderLegend} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Investment Split */}
        {investmentData.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-dark-text-secondary mb-3 text-center">
              Diversificacao
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={investmentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {investmentData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend content={renderLegend} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Costs Breakdown */}
        {costData.length > 0 && (
          <div className="md:col-span-2 xl:col-span-1">
            <h3 className="text-sm font-semibold text-dark-text-secondary mb-3 text-center">
              Custos por Categoria
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={costData}
                layout="vertical"
                margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3044" />
                <XAxis
                  type="number"
                  tickFormatter={(v: number) => formatCurrency(v)}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={90}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                  {costData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}
