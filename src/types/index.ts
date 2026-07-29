// ---------------------------------------------------------------------------
// Vocabulário base
// ---------------------------------------------------------------------------

export type BudgetArea = 'necessidades' | 'desejos' | 'investimentos'

export type SalaryInputMode = 'before_payroll_deductions' | 'take_home'

/**
 * Como um item planejado é pago. Separa o regime de competência (em que mês o
 * gasto acontece) do regime de caixa (em que mês o dinheiro sai da conta):
 * o que passa no cartão só deixa a conta quando a fatura vence.
 */
export type PaymentMethod = 'card' | 'account'

/**
 * Movimentação de um livro-razão (reserva, posição de investimento, meta).
 * Positivo = entrada/aporte, negativo = saída/retirada.
 */
export interface LedgerEntry {
  id: string
  amount: number
  date: string
  note?: string
}

// ---------------------------------------------------------------------------
// Orçamento do mês
// ---------------------------------------------------------------------------

export type CostCategory =
  | 'moradia'
  | 'contas'
  | 'alimentacao'
  | 'transporte'
  | 'saude'
  | 'educacao'
  | 'lazer'
  | 'dividas'
  | 'outros'

export interface CostItem {
  id: string
  name: string
  /** Valor cheio da conta, incluindo a parte de terceiros. */
  value: number
  category: CostCategory
  /** Parte bancada por outra pessoa — sai do seu orçamento. */
  sharedAmount?: number
  /** Com quem o custo é dividido. */
  sharedWith?: string
  /** Onde o pagamento cai. Custos antigos migram como débito em conta. */
  paidWith?: PaymentMethod
}

export interface WantItem {
  id: string
  name: string
  plannedAmount: number
  /** Desejos costumam ser cartão — é o padrão de quem planeja pelo limite. */
  paidWith?: PaymentMethod
}

export type DeductionType =
  | 'previdencia_privada'
  | 'plano_saude'
  | 'vale_alimentacao'
  | 'vale_transporte'
  | 'seguro_vida'
  | 'outros'

export interface DeductionItem {
  id: string
  name: string
  value: number
  type: DeductionType
  employerContribution?: number
}

export interface BudgetModel {
  id: string
  name: string
  description: string
  necessidades: number
  desejos: number
  investimentos: number
}

export interface DiversificationSlice {
  id: string
  name: string
  percentage: number
  color: string
}

export interface BudgetBucket {
  target: number
  /** O que o plano prevê gastar/investir. */
  actual: number
  /** O que já foi de fato gasto no cartão nesta área. */
  realized: number
  diff: number
  percentage: number
}

// ---------------------------------------------------------------------------
// Patrimônio — reserva, posições e metas (módulos globais, fora do cenário)
// ---------------------------------------------------------------------------

export interface EmergencyFundState {
  /** Saldo guardado — derivado da soma das transações. */
  current: number
  targetMonths: number
  transactions: LedgerEntry[]
}

/**
 * Saldo já cadastrado em outro módulo que uma meta *engloba* em vez de duplicar.
 * Uma meta de patrimônio ("9 mil até dezembro") não guarda dinheiro próprio: ela
 * mede a reserva e os investimentos que já existem.
 */
export type GoalInclusionType = 'reserve' | 'investments' | 'goals' | 'class' | 'debts'

export interface GoalInclusion {
  type: GoalInclusionType
  /** Id da classe de ativo, quando `type === 'class'`. */
  id?: string
}

/** Objetivo com nome, valor-alvo e prazo — ex.: "Viagem Japão". */
export interface FinancialGoal {
  id: string
  name: string
  targetAmount: number
  /** Mês-alvo no formato AAAA-MM. */
  targetMonth?: string
  color: string
  transactions: LedgerEntry[]
  createdAt: string
  completedAt?: string
  /** Saldos de outros módulos que contam para esta meta, sem virar dinheiro novo. */
  includes?: GoalInclusion[]
}

export interface GoalSummary extends FinancialGoal {
  /** Saldo do livro-razão da própria meta — só isto entra no patrimônio. */
  ownBalance: number
  /** Saldo emprestado de outros módulos (reserva, investimentos, outras metas). */
  includedBalance: number
  /** ownBalance + includedBalance: o progresso que a meta exibe. */
  current: number
  /** Nomes do que a meta engloba, para a interface explicar de onde vem o saldo. */
  includedLabels: string[]
  remaining: number
  progress: number
  /** Meses restantes até o mês-alvo (negativo = atrasada). */
  monthsLeft: number | null
  /** Quanto aportar por mês para chegar no prazo. */
  suggestedMonthly: number
  isComplete: boolean
}

export interface InvestmentAssetClass {
  id: string
  name: string
  color: string
}

export interface InvestmentHolding {
  id: string
  name: string
  assetClassId: string
  institution?: string
  /** Saldo atual de mercado, atualizado pelo usuário (marcação a mercado). */
  marketValue: number
  transactions: LedgerEntry[]
}

export interface HoldingSummary extends InvestmentHolding {
  invested: number
  gain: number
  gainPct: number
  /** Retorno anualizado estimado a partir das datas dos aportes. */
  annualizedPct: number | null
}

export interface AssetClassSummary {
  id: string
  name: string
  color: string
  marketValue: number
  invested: number
  gain: number
  gainPct: number
  /** Fatia do patrimônio total (inclui reserva e metas). */
  allocationPct: number
  holdings: HoldingSummary[]
}

export interface InvestmentsSummary {
  totalMarketValue: number
  totalInvested: number
  totalGain: number
  totalGainPct: number
  /** Tudo que você tem: investimentos + reserva + guardado nas metas. */
  grossAssets: number
  /** Soma dos saldos devedores. */
  liabilities: number
  /** Ativos − dívidas. É o número que mede se você está ficando mais rico. */
  netWorth: number
  reserveBalance: number
  /** Só o livro-razão das metas: o que uma meta engloba já está contado. */
  goalsBalance: number
  classes: AssetClassSummary[]
}

// ---------------------------------------------------------------------------
// Dívidas — o outro lado do patrimônio
// ---------------------------------------------------------------------------

export type DebtKind = 'financiamento' | 'emprestimo' | 'consignado' | 'cartao' | 'outros'

export interface Debt {
  id: string
  name: string
  kind: DebtKind
  /** Saldo devedor de hoje. Você mantém atualizado, como o valor de mercado de uma posição. */
  balance: number
  /** Juros nominais ao mês, em %, como aparece no contrato. */
  monthlyRatePct: number
  /** Parcela mensal. */
  installment: number
  /** Parcelas que ainda faltam; 0 = não informado (o prazo é estimado pela taxa). */
  remainingInstallments: number
  /** Custo fixo do cenário que já representa esta parcela — evita contar duas vezes. */
  linkedCostId?: string
  /** Movimentações: negativo = amortização, positivo = saldo que aumentou. */
  transactions: LedgerEntry[]
  createdAt: string
  settledAt?: string
}

export interface DebtSummary extends Debt {
  annualRatePct: number
  /** Juros que correm sobre o saldo neste mês. */
  monthlyInterest: number
  /** Fatia da parcela que abate o saldo (o resto é só juros). */
  amortizationShare: number
  /** Meses até quitar no ritmo da parcela; null quando a parcela não cobre os juros. */
  monthsToPayoff: number | null
  /** Total que ainda vai sair do seu bolso até quitar. */
  totalRemaining: number
  /** Juros que ainda vão correr até o fim. */
  interestRemaining: number
  isSettled: boolean
  /** A parcela informada bate com o custo fixo ligado a ela? */
  linkedCostMismatch: number | null
}

export interface DebtsSummary {
  totalBalance: number
  totalInstallment: number
  totalMonthlyInterest: number
  totalInterestRemaining: number
  /** Taxa média ponderada pelo saldo. */
  weightedAnnualRatePct: number
  /** Dívida de maior taxa — a que mais custa carregar. */
  costliest: DebtSummary | null
  debts: DebtSummary[]
}

// ---------------------------------------------------------------------------
// Futuro — entradas e saídas esperadas fora do mês a mês
// ---------------------------------------------------------------------------

export type ExpectedEventKind = 'income' | 'expense'

export type ExpectedEventRecurrence = 'once' | 'yearly' | 'monthly'

/**
 * Dinheiro que você já sabe que vai entrar ou sair, mas não cabe no orçamento
 * mensal: 13º, bônus, férias, IPTU, IPVA, seguro.
 */
export interface ExpectedEvent {
  id: string
  name: string
  kind: ExpectedEventKind
  /** Sempre positivo; o sinal vem de `kind`. */
  amount: number
  /** Mês da primeira ocorrência, no formato AAAA-MM. */
  month: string
  recurrence: ExpectedEventRecurrence
  /** Fatia da entrada que vira patrimônio (0–100). O resto é consumo. */
  savedPct?: number
  /** Meta que este dinheiro reforça — só planejamento, não movimenta saldo. */
  goalId?: string
  note?: string
  createdAt: string
}

/** Uma ocorrência concreta de um evento em um mês específico. */
export interface ExpectedOccurrence {
  event: ExpectedEvent
  month: string
  /** Valor com sinal: entrada positiva, saída negativa. */
  signedAmount: number
  /** Quanto desta ocorrência sobra como patrimônio. */
  savedAmount: number
}

export interface ForecastAssumptions {
  /** Aporte mensal usado na projeção; null = usa o aporte do plano. */
  monthlyContribution: number | null
  /** Rendimento nominal esperado do patrimônio, ao ano. */
  annualReturnPct: number
  /** Inflação esperada ao ano — usada para ler a projeção em reais de hoje. */
  inflationPct: number
  /** Exibir os valores descontados da inflação. */
  showInRealTerms: boolean
  /** Somar a sobra do mês ao aporte projetado. */
  includeLeftover: boolean
  /** Quando uma dívida quita, a parcela liberada passa a ser aportada. */
  reinvestFreedInstallments: boolean
  horizonMonths: number
}

export interface ForecastPoint {
  month: string
  /** Ativos ao fim do mês. */
  assets: number
  /** Saldo devedor total ao fim do mês. */
  debt: number
  /** Ativos − dívidas. */
  netWorth: number
  /** Os mesmos valores em reais de hoje. */
  assetsReal: number
  netWorthReal: number
  contribution: number
  /** Efeito líquido dos eventos esperados sobre o patrimônio. */
  eventsSaved: number
  returns: number
  /** Quanto do saldo devedor foi abatido no mês. */
  debtPaid: number
  occurrences: ExpectedOccurrence[]
}

// ---------------------------------------------------------------------------
// Caixa do mês — o que de fato entra e sai da conta
// ---------------------------------------------------------------------------

export interface CashFlowSummary {
  paycheck: number
  extraIncome: number
  totalIn: number
  /** Parte pessoal da fatura que vence neste mês. */
  invoiceToPay: number
  costsOnAccount: number
  wantsOnAccount: number
  /** O que o plano prevê que vai cair na fatura. */
  costsOnCard: number
  wantsOnCard: number
  plannedOnCard: number
  directInvestment: number
  extraExpense: number
  totalOut: number
  leftover: number
  /** Fatura pessoal − plano previsto no cartão. Positivo = gastou além do plano. */
  cardPlanGap: number
}

// ---------------------------------------------------------------------------
// Cartões de crédito
// ---------------------------------------------------------------------------

export type CreditCardCycle = 'current' | 'next'

export interface CreditCardEntry {
  id: string
  cycle: CreditCardCycle
  description: string
  purchaseDate: string
  cardName: string
  amount: number
  personalAmount: number
  remainingAmount: number
  /** Área do orçamento que a compra consome — liga a fatura ao plano. */
  budgetArea?: BudgetArea
  ownerName?: string
  ownerNote?: string
  installmentCurrent?: number
  installmentTotal?: number
  isRecurring?: boolean
  /** Compra já paga antecipadamente: continua listada, mas fora dos totais da fatura. */
  isPrepaid?: boolean
  autoGenerated?: boolean
  sourceEntryId?: string
}

export interface CreditCardSettings {
  /** Legado: texto livre do vencimento, antes de cada cartão ter o seu. */
  paymentDate: string
  personalSpendingLimit: number
}

/**
 * Cartão cadastrado. Os lançamentos continuam ligados pelo nome (é o que a
 * importação por colagem produz); isto acrescenta o calendário de cada um.
 */
export interface CreditCardAccount {
  id: string
  name: string
  /** Dia do mês em que a fatura fecha. */
  closingDay: number
  /** Dia do mês em que a fatura vence. */
  dueDay: number
  /** Limite do cartão no banco (0 = não informado). */
  limit: number
}

export interface CardCycleStatus extends CreditCardAccount {
  /** A fatura deste ciclo já fechou? */
  isClosed: boolean
  /** Dias até fechar (negativo = fechou há tantos dias). */
  daysToClosing: number
  /** Dias até vencer. */
  daysToDue: number
  /** Sua parte da fatura atual neste cartão. */
  personalAmount: number
  totalAmount: number
  /** Uso do limite do banco, em % (null quando não há limite informado). */
  usagePct: number | null
}

export interface CardTotal {
  cardName: string
  totalAmount: number
  personalAmount: number
}

export interface CreditCardSummary {
  currentTotal: number
  currentPersonalTotal: number
  currentThirdPartyTotal: number
  currentPrepaidTotal: number
  currentPersonalPrepaidTotal: number
  nextTotal: number
  nextPersonalTotal: number
  remainingInstallmentsTotal: number
  remainingPersonalInstallmentsTotal: number
  availablePersonalLimit: number
  totalsByCard: CardTotal[]
  totalsByOwner: CardTotal[]
  currentEntriesCount: number
  nextEntriesCount: number
  /** Gasto pessoal do ciclo atual por área do orçamento. */
  personalByArea: Record<BudgetArea, number>
  /** Gasto pessoal ainda sem área definida. */
  unclassifiedPersonal: number
}

// ---------------------------------------------------------------------------
// Cenários
// ---------------------------------------------------------------------------

export interface FinanceScenarioData {
  salaryNet: number
  salaryInputMode: SalaryInputMode
  costs: CostItem[]
  wants: WantItem[]
  deductions: DeductionItem[]
  selectedModelId: string
  diversification: DiversificationSlice[]
  customModel: { n: number; d: number; i: number }
}

export interface FinanceScenario extends FinanceScenarioData {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface ScenarioSummary {
  id: string
  name: string
  availableForBudget: number
  totalCosts: number
  totalWantsAmount: number
  totalPlannedInvestment: number
  balanceAfterPlan: number
  savingsRate: number
}

// ---------------------------------------------------------------------------
// Histórico — o que de fato aconteceu em cada mês
// ---------------------------------------------------------------------------

/**
 * O que de fato foi pago num mês, item por item. O cartão já traz o realizado
 * pela fatura; isto é o equivalente para o que sai em débito ou boleto.
 */
export interface MonthlyActuals {
  /** Mês de competência, AAAA-MM. */
  month: string
  /** id do custo → valor pago (a sua parte). Ausente = usar o planejado. */
  costs: Record<string, number>
}

export interface ActualsSummary {
  month: string
  /** Soma dos custos usando o realizado onde houver, o plano no resto. */
  effectiveCosts: number
  /** Soma do que o plano previa. */
  plannedCosts: number
  /** effectiveCosts − plannedCosts. */
  variance: number
  /** Quantos itens têm valor realizado informado. */
  informedCount: number
  /** Custos por categoria já com o realizado aplicado. */
  byCategory: Map<CostCategory, number>
  /** Linha por custo, para a interface montar o formulário. */
  rows: {
    cost: CostItem
    planned: number
    actual: number | null
    effective: number
    variance: number
  }[]
}

export interface MonthlySnapshot {
  id: string
  /** Mês de competência no formato AAAA-MM. */
  month: string
  closedAt: string
  scenarioId: string
  scenarioName: string
  availableForBudget: number
  paycheckInAccount: number
  /** Custos do mês — o realizado quando informado, o plano no resto. */
  costs: number
  /** O que o plano previa de custos, para comparar com o realizado. */
  costsPlanned: number
  wants: number
  invested: number
  balance: number
  savingsRate: number
  costsByCategory: Partial<Record<CostCategory, number>>
  /** Ativos no fechamento (investimentos + reserva + metas). */
  grossAssets: number
  /** Saldo devedor no fechamento. */
  liabilities: number
  /** Ativos − dívidas. Snapshots antigos (sem dívidas) trazem o valor bruto. */
  netWorth: number
  emergencyFund: number
  cardPersonalTotal: number
  /** Gasto pessoal do cartão por área — o realizado ao lado do planejado. */
  cardByArea: Partial<Record<BudgetArea, number>>
  /** Sobra em caixa depois de pagar a fatura e o que não passa no cartão. */
  cashLeftover: number
  note?: string
}

export interface HistoryPoint extends MonthlySnapshot {
  /** Variação do patrimônio em relação ao mês fechado anterior. */
  netWorthDelta: number | null
  costsDelta: number | null
}

/** Campos que o fechamento permite corrigir depois. */
export type SnapshotPatch = Partial<
  Pick<
    MonthlySnapshot,
    | 'availableForBudget'
    | 'paycheckInAccount'
    | 'costs'
    | 'wants'
    | 'invested'
    | 'grossAssets'
    | 'liabilities'
    | 'emergencyFund'
    | 'cardPersonalTotal'
    | 'cashLeftover'
    | 'note'
  >
>

export interface HistoryStats {
  months: number
  averageCosts: number
  averageWants: number
  averageInvested: number
  averageSavingsRate: number
  /** Média da sua parte da fatura nos meses fechados. */
  averageCardPersonal: number
  netWorthGrowth: number
  netWorthGrowthPct: number
  bestSavingsMonth: MonthlySnapshot | null
}
