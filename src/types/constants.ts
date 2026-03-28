import type {
  BudgetModel,
  DiversificationSlice,
  CostCategory,
  DeductionType,
} from "./index";

export const BUDGET_MODELS: BudgetModel[] = [
  {
    id: "50-30-20",
    name: "50 / 30 / 20",
    description: "50% Necessidades, 30% Desejos, 20% Investimentos",
    necessidades: 50,
    desejos: 30,
    investimentos: 20,
  },
  {
    id: "60-20-20",
    name: "60 / 20 / 20",
    description: "60% Necessidades, 20% Desejos, 20% Investimentos",
    necessidades: 60,
    desejos: 20,
    investimentos: 20,
  },
  {
    id: "70-20-10",
    name: "70 / 20 / 10",
    description: "70% Necessidades, 20% Desejos, 10% Investimentos",
    necessidades: 70,
    desejos: 20,
    investimentos: 10,
  },
  {
    id: "40-30-30",
    name: "40 / 30 / 30",
    description: "40% Necessidades, 30% Desejos, 30% Investimentos",
    necessidades: 40,
    desejos: 30,
    investimentos: 30,
  },
  {
    id: "custom",
    name: "Personalizado",
    description: "Defina suas proprias proporcoes",
    necessidades: 50,
    desejos: 30,
    investimentos: 20,
  },
];

/** YouTube video links explaining each budget model */
export const BUDGET_MODEL_VIDEOS: Record<
  string,
  { url: string; channel: string }
> = {
  "50-30-20": {
    url: "https://youtu.be/GjLQnuREjlY?si=S0BOrn0ao8DHVyRH",
    channel: "Investidor Sardinha",
  },
  "60-20-20": {
    url: "https://youtu.be/RwRJrFN918s?si=ndBC0nVemMVNcIL8",
    channel: "Finan. YouTube",
  },
  "70-20-10": {
    url: "https://www.youtube.com/shorts/Bf6m5WWkV7I",
    channel: "Investidor Sardinha",
  },
  "40-30-30": {
    url: "https://youtu.be/RwRJrFN918s?si=ndBC0nVemMVNcIL8",
    channel: "Finan. YouTube",
  },
};

export const DEFAULT_DIVERSIFICATION: DiversificationSlice[] = [
  { id: "renda-fixa", name: "Renda Fixa", percentage: 50, color: "#3b82f6" },
  { id: "acoes", name: "Acoes", percentage: 30, color: "#34d399" },
  { id: "fiis", name: "Fundos Imobiliarios", percentage: 10, color: "#fbbf24" },
  { id: "cripto", name: "Criptomoedas", percentage: 10, color: "#a78bfa" },
];

export const COST_CATEGORIES: {
  key: CostCategory;
  label: string;
  hint: string;
  emoji: string;
}[] = [
  {
    key: "moradia",
    label: "Moradia",
    hint: "Aluguel, condominio, IPTU, conta de agua",
    emoji: "🏠",
  },
  {
    key: "contas",
    label: "Contas & Servicos",
    hint: "Energia, internet, celular, gas, streaming",
    emoji: "💡",
  },
  {
    key: "alimentacao",
    label: "Alimentacao",
    hint: "Supermercado, feira, acougue, padaria",
    emoji: "🛒",
  },
  {
    key: "transporte",
    label: "Transporte",
    hint: "Combustivel, estacionamento, Uber, pedagio",
    emoji: "🚗",
  },
  {
    key: "saude",
    label: "Saude",
    hint: "Farmacia, consultas, academia, suplementos",
    emoji: "❤️",
  },
  {
    key: "educacao",
    label: "Educacao",
    hint: "Faculdade, cursos, livros, escola dos filhos",
    emoji: "📚",
  },
  {
    key: "lazer",
    label: "Lazer & Pessoal",
    hint: "Restaurantes, viagens, roupas, hobbies",
    emoji: "🎮",
  },
  {
    key: "dividas",
    label: "Dividas & Parcelas",
    hint: "Cartao de credito, emprestimos, financiamentos",
    emoji: "💳",
  },
  {
    key: "outros",
    label: "Outros",
    hint: "Qualquer gasto que nao se encaixa acima",
    emoji: "📦",
  },
];

export const COST_CATEGORY_LABELS: Record<CostCategory, string> =
  Object.fromEntries([
    ["moradia", "Moradia"],
    ["contas", "Contas & Servicos"],
    ["alimentacao", "Alimentacao"],
    ["transporte", "Transporte"],
    ["saude", "Saude"],
    ["educacao", "Educacao"],
    ["lazer", "Lazer & Pessoal"],
    ["dividas", "Dividas & Parcelas"],
    ["outros", "Outros"],
  ]) as Record<CostCategory, string>;

export const DEDUCTION_TYPE_LABELS: Record<DeductionType, string> = {
  previdencia_privada: "Previdencia Privada",
  plano_saude: "Plano de Saude",
  vale_alimentacao: "Vale Alimentacao",
  vale_transporte: "Vale Transporte",
  seguro_vida: "Seguro de Vida",
  outros: "Outros",
};

export const COST_CATEGORY_COLORS: Record<CostCategory, string> = {
  moradia: "#3b82f6",
  contas: "#06b6d4",
  alimentacao: "#34d399",
  transporte: "#fbbf24",
  saude: "#fb7185",
  educacao: "#a78bfa",
  lazer: "#22d3ee",
  dividas: "#f97316",
  outros: "#64748b",
};
