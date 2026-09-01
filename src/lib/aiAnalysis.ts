import { formatCurrency, formatMonthLong } from './format'

export interface FinancialAnalysisLine {
  name: string
  planned?: number
  actual?: number
  amount?: number
  payment?: 'conta' | 'cartao'
  detail?: string
}

export interface FinancialAnalysisSnapshot {
  cycleMonth: string
  scenarioName: string
  paycheck: number
  extraIncome: number
  totalIncome: number
  invoiceToPay: number
  costsPlanned: number
  costsActual: number
  wantsPlanned: number
  wantsActual: number
  investmentsPlanned: number
  directInvestmentActual: number
  payrollInvestment: number
  employerInvestment: number
  personalInvestment: number
  creditedInvestment: number
  extraExpenses: number
  cashLeftover: number
  discretionaryAvailable: number
  nextInvoiceActual: number
  nextInvoicePlanned: number
  nextCycleMonth: string
  nextCycleAvailableToAllocate: number
  nextCycleAfterPlannedWants: number
  remainingCardInstallments: number
  financialAssets: number
  physicalAssets: number
  liabilities: number
  financialNetWorth: number
  netWorth: number
  emergencyFund: number
  debtBalance: number
  debtInstallments: number
  debtMonthlyInterest: number
  costs: FinancialAnalysisLine[]
  wants: FinancialAnalysisLine[]
  debts: FinancialAnalysisLine[]
}

const money = (value: number) => formatCurrency(Number.isFinite(value) ? value : 0)

function ranked(lines: FinancialAnalysisLine[], limit = 12) {
  return [...lines]
    .sort(
      (a, b) =>
        Math.max(b.actual ?? 0, b.planned ?? 0, b.amount ?? 0) -
        Math.max(a.actual ?? 0, a.planned ?? 0, a.amount ?? 0),
    )
    .slice(0, limit)
}

function formatLines(lines: FinancialAnalysisLine[], emptyLabel: string) {
  if (!lines.length) return `- ${emptyLabel}`
  return ranked(lines)
    .map((line) => {
      const values = [
        line.planned !== undefined ? `plano ${money(line.planned)}` : '',
        line.actual !== undefined ? `realizado/efetivo ${money(line.actual)}` : '',
        line.amount !== undefined ? money(line.amount) : '',
        line.payment ? `via ${line.payment === 'cartao' ? 'cartão' : 'conta'}` : '',
        line.detail ?? '',
      ].filter(Boolean)
      return `- ${line.name}: ${values.join(' · ')}`
    })
    .join('\n')
}

/**
 * Gera um retrato curto e semanticamente explícito. O texto evita misturar caixa,
 * competência, patrimônio e projeção — a IA deve analisar os números, não
 * reinterpretar o modelo financeiro do FinTano.
 */
export function buildFinancialAnalysisPrompt(snapshot: FinancialAnalysisSnapshot) {
  return `Você é um analista financeiro pessoal objetivo e conservador. Analise o cenário abaixo em BRL.

Regras de leitura:
- Diferencie rigorosamente plano, realizado/efetivo, caixa, patrimônio e prévia do próximo ciclo.
- Previsão não é dinheiro disponível.
- Desejos são discricionários e vêm depois da fatura anterior, contas, aporte programado e movimentos extraordinários.
- O envelope Cartão já inclui seus itens filhos; não some detalhes do cartão novamente.
- Valores de Desejos realizados abaixo são somente os pagos fora do cartão. A fatura é a fonte do realizado no cartão.
- Não invente dados ausentes. Sinalize premissas e conflitos antes de recomendar.

Objetivo da resposta:
1. Dê um diagnóstico curto do ciclo atual.
2. Aponte até 3 riscos ou inconsistências, em ordem de impacto.
3. Proponha até 5 ações concretas para o próximo ciclo, com valor sugerido quando os dados permitirem.
4. Avalie se antecipar parcelas do cartão parece prudente sem tratar limite liberado como renda.
5. Termine com as perguntas mínimas que mudariam a recomendação.

CENÁRIO
- Nome: ${snapshot.scenarioName}
- Competência ativa: ${formatMonthLong(snapshot.cycleMonth)}

CAIXA DO CICLO ATUAL
- Salário líquido em conta: ${money(snapshot.paycheck)}
- Entradas extraordinárias já recebidas: ${money(snapshot.extraIncome)}
- Total efetivamente disponível no ciclo: ${money(snapshot.totalIncome)}
- Fatura anterior paga/a pagar neste caixa: ${money(snapshot.invoiceToPay)}
- Custos em conta efetivos: ${money(snapshot.costsActual)} (plano: ${money(snapshot.costsPlanned)})
- Desejos fora do cartão efetivos: ${money(snapshot.wantsActual)} (plano: ${money(snapshot.wantsPlanned)})
- Aportes efetivamente feitos pela conta: ${money(snapshot.directInvestmentActual)}
- Saídas extraordinárias já pagas: ${money(snapshot.extraExpenses)}
- Sobra de caixa após obrigações e desejos: ${money(snapshot.cashLeftover)}
- Disponível antes de alocar Desejos: ${money(snapshot.discretionaryAvailable)}

INVESTIMENTOS DO CICLO
- Previdência do usuário já descontada antes do salário cair na conta: ${money(snapshot.payrollInvestment)}
- Aportes feitos pela conta: ${money(snapshot.directInvestmentActual)}
- Total investido com recursos pessoais: ${money(snapshot.personalInvestment)} (plano: ${money(snapshot.investmentsPlanned)})
- Contrapartida da empresa, sem impacto no caixa: ${money(snapshot.employerInvestment)}
- Total creditado em investimentos: ${money(snapshot.creditedInvestment)}

CARTÃO E PRÓXIMO CICLO
- Fatura formada pelo ciclo ativo: ${money(snapshot.nextInvoiceActual)}
- Envelope planejado para essa fatura: ${money(snapshot.nextInvoicePlanned)}
- Minha parte nas parcelas futuras ainda não trazidas: ${money(snapshot.remainingCardInstallments)}
- Próxima competência: ${formatMonthLong(snapshot.nextCycleMonth)}
- Prévia disponível para alocar antes de Desejos: ${money(snapshot.nextCycleAvailableToAllocate)}
- Prévia depois dos Desejos planejados fora do cartão: ${money(snapshot.nextCycleAfterPlannedWants)}

PATRIMÔNIO ATUAL
- Ativos financeiros: ${money(snapshot.financialAssets)}
- Bens físicos: ${money(snapshot.physicalAssets)}
- Passivos: ${money(snapshot.liabilities)}
- Patrimônio financeiro líquido: ${money(snapshot.financialNetWorth)}
- Patrimônio líquido total: ${money(snapshot.netWorth)}
- Reserva de emergência: ${money(snapshot.emergencyFund)}

DÍVIDAS
- Saldo total: ${money(snapshot.debtBalance)}
- Parcelas mensais: ${money(snapshot.debtInstallments)}
- Juros estimados neste mês: ${money(snapshot.debtMonthlyInterest)}
${formatLines(snapshot.debts, 'Nenhuma dívida detalhada')}

PRINCIPAIS CUSTOS
${formatLines(snapshot.costs, 'Nenhum custo cadastrado')}

DESEJOS PLANEJADOS
${formatLines(snapshot.wants, 'Nenhum desejo cadastrado')}`
}

export function buildClaudeDeepLink(prompt: string) {
  return `claude://claude.ai/new?q=${encodeURIComponent(prompt)}`
}
