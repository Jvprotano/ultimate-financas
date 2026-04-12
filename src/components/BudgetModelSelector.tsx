import { PieChart, Play } from "lucide-react";
import { Card } from "./Card";
import { BUDGET_MODELS, BUDGET_MODEL_VIDEOS } from "../types/constants";

interface Props {
  selectedModelId: string;
  setSelectedModelId: (id: string) => void;
  customModel: { n: number; d: number; i: number };
  setCustomModel: (m: { n: number; d: number; i: number }) => void;
}

export function BudgetModelSelector({
  selectedModelId,
  setSelectedModelId,
  customModel,
  setCustomModel,
}: Props) {
  const isCustom = selectedModelId === "custom";

  const handleCustomChange = (field: "n" | "d" | "i", value: number) => {
    const clamped = Math.max(0, Math.min(100, value));
    setCustomModel({ ...customModel, [field]: clamped });
  };

  const customTotal = customModel.n + customModel.d + customModel.i;

  return (
    <Card
      title="Modelo de Orçamento"
      icon={<PieChart size={18} />}
      accentColor="bg-primary-600"
      collapsible
      storageKey="budget-model"
      headerExtra={
        <span className="text-sm font-bold text-primary-400">
          {BUDGET_MODELS.find((m) => m.id === selectedModelId)?.name}
        </span>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {BUDGET_MODELS.map((model) => {
            const video = BUDGET_MODEL_VIDEOS[model.id];
            const isSelected = selectedModelId === model.id;

            return (
              <div key={model.id} className="relative group/card">
                <button
                  onClick={() => setSelectedModelId(model.id)}
                  className={`w-full relative px-3 py-3 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? "border-primary-500 bg-primary-500/10 shadow-sm shadow-primary-500/10"
                      : "border-dark-border hover:border-dark-border-subtle hover:bg-dark-hover bg-dark-surface"
                  }`}
                >
                  <span
                    className={`block text-sm font-bold ${
                      isSelected ? "text-primary-400" : "text-dark-text"
                    }`}
                  >
                    {model.name}
                  </span>
                  <span className="block text-[11px] text-dark-text-muted mt-0.5 leading-tight">
                    {model.id === "custom" ? "Voce define" : model.description}
                  </span>
                </button>

                {video && (
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-rose-600 hover:bg-rose-500
                      flex items-center justify-center shadow-lg shadow-rose-600/30
                      opacity-0 group-hover/card:opacity-100 transition-all scale-75 group-hover/card:scale-100 z-10"
                    title={`Assistir video sobre a regra ${model.name} no YouTube`}
                  >
                    <Play
                      size={12}
                      className="text-white ml-0.5"
                      fill="white"
                    />
                  </a>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-dark-text-muted flex items-center gap-1.5">
          <Play size={10} className="text-rose-500" fill="currentColor" />
          Passe o mouse sobre um modelo para ver o video explicativo no YouTube
        </p>

        {isCustom && (
          <div className="space-y-3 p-4 bg-dark-surface rounded-xl border border-dark-border">
            <p className="text-xs font-medium text-dark-text-muted uppercase tracking-wide">
              Proporcoes personalizadas
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: "Necessidades",
                  field: "n" as const,
                  color: "text-primary-400",
                },
                {
                  label: "Desejos",
                  field: "d" as const,
                  color: "text-violet-400",
                },
                {
                  label: "Investimentos",
                  field: "i" as const,
                  color: "text-emerald-400",
                },
              ].map(({ label, field, color }) => (
                <div key={field}>
                  <label className={`block text-xs font-medium ${color} mb-1`}>
                    {label}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={customModel[field]}
                      onChange={(e) =>
                        handleCustomChange(field, parseInt(e.target.value) || 0)
                      }
                      className="w-full px-3 py-2 rounded-lg border border-dark-border bg-dark-input text-dark-text text-sm text-center font-semibold
                        focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-dark-text-muted">
                      %
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {customTotal !== 100 && (
              <p className="text-xs text-rose-400 font-medium">
                Total: {customTotal}% — deve somar 100%
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
