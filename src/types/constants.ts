import type {
  BudgetArea,
  BudgetModel,
  DiversificationSlice,
  CostCategory,
  DeductionType,
  InvestmentAssetClass,
} from './index'

export const BUDGET_MODELS: BudgetModel[] = [
  {
    id: '50-30-20',
    name: '50 / 30 / 20',
    description: 'Equilíbrio clássico entre presente e futuro',
    necessidades: 50,
    desejos: 30,
    investimentos: 20,
  },
  {
    id: '60-20-20',
    name: '60 / 20 / 20',
    description: 'Para quem tem custos fixos mais pesados',
    necessidades: 60,
    desejos: 20,
    investimentos: 20,
  },
  {
    id: '70-20-10',
    name: '70 / 20 / 10',
    description: 'Primeiro passo para quem está apertado',
    necessidades: 70,
    desejos: 20,
    investimentos: 10,
  },
  {
    id: '40-30-30',
    name: '40 / 30 / 30',
    description: 'Agressivo em investimentos',
    necessidades: 40,
    desejos: 30,
    investimentos: 30,
  },
  {
    id: 'custom',
    name: 'Personalizado',
    description: 'Você define as proporções',
    necessidades: 50,
    desejos: 30,
    investimentos: 20,
  },
]

/**
 * Paleta categórica validada para a superfície escura
 * (checagens de banda de luminosidade, croma, CVD e contraste).
 */
export const CHART_PALETTE = {
  blue: '#3987e5',
  aqua: '#199e70',
  yellow: '#c98500',
  green: '#008300',
  violet: '#9085e9',
  red: '#e66767',
  magenta: '#d55181',
  orange: '#d95926',
  muted: '#6f807a',
} as const

export const BUDGET_AREA_COLORS: Record<BudgetArea, string> = {
  necessidades: CHART_PALETTE.blue,
  desejos: CHART_PALETTE.yellow,
  investimentos: CHART_PALETTE.aqua,
}

export const DEFAULT_DIVERSIFICATION: DiversificationSlice[] = [
  { id: 'renda-fixa', name: 'Renda Fixa', percentage: 50, color: CHART_PALETTE.blue },
  { id: 'acoes', name: 'Ações', percentage: 30, color: CHART_PALETTE.aqua },
  { id: 'fiis', name: 'Fundos Imobiliários', percentage: 10, color: CHART_PALETTE.yellow },
  { id: 'cripto', name: 'Criptomoedas', percentage: 10, color: CHART_PALETTE.violet },
]

export const DEFAULT_INVESTMENT_CLASSES: InvestmentAssetClass[] = [
  { id: 'renda-fixa', name: 'Renda Fixa', color: CHART_PALETTE.blue },
  { id: 'acoes', name: 'Ações', color: CHART_PALETTE.aqua },
  { id: 'fiis', name: 'Fundos Imobiliários', color: CHART_PALETTE.yellow },
  { id: 'acoes-int', name: 'Ações Internacionais', color: CHART_PALETTE.orange },
  { id: 'etfs', name: 'ETFs', color: CHART_PALETTE.green },
  { id: 'cripto', name: 'Criptomoedas', color: CHART_PALETTE.violet },
]

export const INVESTMENT_CLASS_PRESET_COLORS: string[] = [
  CHART_PALETTE.blue,
  CHART_PALETTE.aqua,
  CHART_PALETTE.yellow,
  CHART_PALETTE.orange,
  CHART_PALETTE.green,
  CHART_PALETTE.violet,
  CHART_PALETTE.magenta,
  CHART_PALETTE.red,
]

export const DIVERSIFICATION_PRESET_COLORS: string[] = [
  CHART_PALETTE.blue,
  CHART_PALETTE.aqua,
  CHART_PALETTE.yellow,
  CHART_PALETTE.violet,
  CHART_PALETTE.red,
  CHART_PALETTE.magenta,
  CHART_PALETTE.orange,
  CHART_PALETTE.green,
]

/** Tipos de desconto em folha que contam como investimento */
export const INVESTMENT_DEDUCTION_TYPES: DeductionType[] = ['previdencia_privada']

export const BUDGET_AREA_LABELS: Record<BudgetArea, string> = {
  necessidades: 'Necessidades',
  desejos: 'Desejos',
  investimentos: 'Investimentos',
}

export const COST_CATEGORIES: {
  key: CostCategory
  label: string
  hint: string
}[] = [
  { key: 'moradia', label: 'Moradia', hint: 'Aluguel, condomínio, IPTU, água' },
  { key: 'contas', label: 'Contas & Serviços', hint: 'Energia, internet, celular, gás' },
  { key: 'alimentacao', label: 'Alimentação', hint: 'Supermercado, feira, padaria' },
  { key: 'transporte', label: 'Transporte', hint: 'Combustível, Uber, pedágio' },
  { key: 'saude', label: 'Saúde', hint: 'Farmácia, consultas, academia' },
  { key: 'educacao', label: 'Educação', hint: 'Faculdade, cursos, livros' },
  { key: 'lazer', label: 'Lazer & Pessoal', hint: 'Restaurantes, roupas, hobbies' },
  { key: 'dividas', label: 'Dívidas & Parcelas', hint: 'Empréstimos, financiamentos' },
  { key: 'outros', label: 'Outros', hint: 'O que não se encaixa acima' },
]

export const COST_CATEGORY_LABELS: Record<CostCategory, string> = Object.fromEntries(
  COST_CATEGORIES.map(({ key, label }) => [key, label]),
) as Record<CostCategory, string>

export const DEDUCTION_TYPE_LABELS: Record<DeductionType, string> = {
  previdencia_privada: 'Previdência Privada',
  plano_saude: 'Plano de Saúde',
  vale_alimentacao: 'Vale Alimentação',
  vale_transporte: 'Vale Transporte',
  seguro_vida: 'Seguro de Vida',
  outros: 'Outros',
}

export const COST_CATEGORY_COLORS: Record<CostCategory, string> = {
  moradia: CHART_PALETTE.blue,
  contas: CHART_PALETTE.violet,
  alimentacao: CHART_PALETTE.aqua,
  transporte: CHART_PALETTE.yellow,
  saude: CHART_PALETTE.magenta,
  educacao: CHART_PALETTE.green,
  lazer: CHART_PALETTE.orange,
  dividas: CHART_PALETTE.red,
  outros: CHART_PALETTE.muted,
}
