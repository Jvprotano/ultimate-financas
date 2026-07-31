import type { FinancialGoal, GoalInclusion, GoalInclusionType, GoalSummary } from '../types'
import { GOAL_PRESET_COLORS } from '../types/constants'
import { finiteNumber, ledgerBalance, monthKey, monthsBetween, normalizeLedger, nowIso, uid } from './shared'

// ---------------------------------------------------------------------------
// Metas.
//
// Uma meta pode ser de duas naturezas, e a diferença importa para o patrimônio
// não ser contado duas vezes:
//
//  · **meta de poupança** — junta dinheiro próprio num livro-razão ("Viagem
//    Japão"). Esse saldo é dinheiro novo e soma ao patrimônio.
//  · **meta de patrimônio** — mede saldos que já existem em outros módulos
//    ("9 mil até dezembro", contando reserva e investimentos). Aqui a meta não
//    guarda nada: ela *engloba*. Some ao patrimônio seria duplicar.
//
// Por isso `ownBalance` (o que a própria meta guarda) e `includedBalance` (o que
// ela apenas observa) andam separados: só o primeiro entra no patrimônio.
// ---------------------------------------------------------------------------

const INCLUSION_TYPES: GoalInclusionType[] = [
  'reserve',
  'investments',
  'goals',
  'class',
  'debts',
  'assets',
]

export const INCLUSION_LABELS: Record<Exclude<GoalInclusionType, 'class'>, string> = {
  reserve: 'Reserva de emergência',
  investments: 'Investimentos',
  goals: 'Outras metas',
  assets: 'Bens',
  debts: '− Dívidas',
}

/** Tudo que já está cadastrado e pode ser englobado por uma meta. */
export interface GoalContext {
  reserveBalance: number
  investmentsBalance: number
  classBalances: { id: string; name: string; marketValue: number }[]
  /** Saldo do livro-razão de cada meta, indexado por id. */
  goalOwnBalances: Record<string, number>
  /** Valor de mercado dos bens — imóvel, veículo. */
  assetsBalance: number
  /** Saldo devedor total — entra na meta com sinal negativo. */
  debtBalance: number
}

export const EMPTY_GOAL_CONTEXT: GoalContext = {
  reserveBalance: 0,
  investmentsBalance: 0,
  classBalances: [],
  goalOwnBalances: {},
  assetsBalance: 0,
  debtBalance: 0,
}

function normalizeInclusions(raw: unknown): GoalInclusion[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const inclusions: GoalInclusion[] = []

  for (const item of raw as Partial<GoalInclusion>[]) {
    if (!item || !INCLUSION_TYPES.includes(item.type as GoalInclusionType)) continue
    const type = item.type as GoalInclusionType
    const id = type === 'class' ? item.id : undefined
    if (type === 'class' && !id) continue
    const key = `${type}:${id ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    inclusions.push(id ? { type, id } : { type })
  }

  // "Investimentos" já cobre qualquer classe: manter as duas confundiria a conta.
  return inclusions.some((item) => item.type === 'investments')
    ? inclusions.filter((item) => item.type !== 'class')
    : inclusions
}

export function normalizeGoal(raw: Partial<FinancialGoal> | undefined, index = 0): FinancialGoal {
  const includes = normalizeInclusions(raw?.includes)

  return {
    id: raw?.id || uid(),
    name: raw?.name?.trim() || 'Meta',
    targetAmount: Math.max(0, finiteNumber(raw?.targetAmount)),
    targetMonth: /^\d{4}-\d{2}$/.test(raw?.targetMonth ?? '') ? raw?.targetMonth : undefined,
    color: raw?.color || GOAL_PRESET_COLORS[index % GOAL_PRESET_COLORS.length],
    transactions: normalizeLedger(raw?.transactions),
    createdAt: raw?.createdAt || nowIso(),
    completedAt: raw?.completedAt || undefined,
    includes: includes.length ? includes : undefined,
  }
}

/** Saldo e rótulo de cada fonte englobada por uma meta. */
function resolveInclusions(goal: FinancialGoal, context: GoalContext) {
  let balance = 0
  const labels: string[] = []

  for (const inclusion of goal.includes ?? []) {
    if (inclusion.type === 'reserve') {
      balance += context.reserveBalance
      labels.push(INCLUSION_LABELS.reserve)
    } else if (inclusion.type === 'investments') {
      balance += context.investmentsBalance
      labels.push(INCLUSION_LABELS.investments)
    } else if (inclusion.type === 'goals') {
      // Só o saldo próprio das outras metas — o que elas englobam já foi somado
      // aqui pelas inclusões desta meta, ou não pertence a ela.
      for (const [id, own] of Object.entries(context.goalOwnBalances)) {
        if (id !== goal.id) balance += own
      }
      labels.push(INCLUSION_LABELS.goals)
    } else if (inclusion.type === 'assets') {
      balance += context.assetsBalance
      labels.push(INCLUSION_LABELS.assets)
    } else if (inclusion.type === 'debts') {
      // Uma meta de patrimônio *líquido* desconta o que você deve. Junto com
      // "Bens", vira o balanço completo; sozinha, mede só o dinheiro.
      balance -= context.debtBalance
      labels.push(INCLUSION_LABELS.debts)
    } else if (inclusion.type === 'class') {
      const assetClass = context.classBalances.find((item) => item.id === inclusion.id)
      if (!assetClass) continue
      balance += assetClass.marketValue
      labels.push(assetClass.name)
    }
  }

  return { balance, labels }
}

export function summarizeGoals(
  goals: FinancialGoal[],
  context: GoalContext = EMPTY_GOAL_CONTEXT,
): GoalSummary[] {
  const currentMonth = monthKey()

  return goals.map((goal) => {
    const ownBalance = Math.max(0, ledgerBalance(goal.transactions))
    const included = resolveInclusions(goal, context)
    // Pode ficar negativo: uma meta de patrimônio líquido com mais dívida que ativo.
    const current = ownBalance + included.balance
    const remaining = Math.max(0, goal.targetAmount - current)
    const monthsLeft = goal.targetMonth ? monthsBetween(currentMonth, goal.targetMonth) : null
    // O mês corrente ainda conta como uma chance de aportar.
    const monthsAvailable = monthsLeft === null ? 0 : Math.max(1, monthsLeft + 1)

    return {
      ...goal,
      ownBalance,
      includedBalance: included.balance,
      includedLabels: included.labels,
      current,
      remaining,
      progress:
        goal.targetAmount > 0
          ? Math.max(0, Math.min(100, (current / goal.targetAmount) * 100))
          : 0,
      monthsLeft,
      suggestedMonthly: monthsAvailable > 0 ? remaining / monthsAvailable : 0,
      isComplete: goal.targetAmount > 0 && current >= goal.targetAmount,
    }
  })
}
