import { describe, expect, it } from 'vitest'
import {
  buildClaudeDeepLink,
  buildFinancialAnalysisPrompt,
  type FinancialAnalysisSnapshot,
} from './aiAnalysis'

const snapshot: FinancialAnalysisSnapshot = {
  cycleMonth: '2026-09',
  scenarioName: 'Atual',
  paycheck: 8_000,
  extraIncome: 500,
  totalIncome: 8_500,
  invoiceToPay: 1_200,
  costsPlanned: 2_000,
  costsActual: 2_100,
  wantsPlanned: 600,
  wantsActual: 450,
  investmentsPlanned: 1_500,
  directInvestmentActual: 860,
  payrollInvestment: 540,
  employerInvestment: 540,
  personalInvestment: 1_400,
  creditedInvestment: 1_940,
  extraExpenses: 200,
  cashLeftover: 3_150,
  discretionaryAvailable: 3_600,
  nextInvoiceActual: 1_300,
  nextInvoicePlanned: 1_100,
  nextCycleMonth: '2026-10',
  nextCycleAvailableToAllocate: 3_100,
  nextCycleAfterPlannedWants: 2_500,
  remainingCardInstallments: 2_400,
  financialAssets: 40_000,
  physicalAssets: 0,
  liabilities: 5_000,
  financialNetWorth: 35_000,
  netWorth: 35_000,
  emergencyFund: 12_000,
  debtBalance: 5_000,
  debtInstallments: 500,
  debtMonthlyInterest: 50,
  costs: [{ name: 'Moradia', planned: 2_000, actual: 2_100, payment: 'conta' }],
  wants: [{ name: 'Viagem', planned: 600, payment: 'conta' }],
  debts: [{ name: 'Empréstimo', amount: 5_000, detail: '1,00% a.m.' }],
}

describe('análise externa do cenário', () => {
  it('separa caixa, cartão, patrimônio e regras de dupla contagem', () => {
    const prompt = buildFinancialAnalysisPrompt(snapshot)

    expect(prompt).toContain('CAIXA DO CICLO ATUAL')
    expect(prompt).toContain('CARTÃO E PRÓXIMO CICLO')
    expect(prompt).toContain('PATRIMÔNIO ATUAL')
    expect(prompt).toContain('Previdência do usuário já descontada antes do salário cair na conta: R$ 540,00')
    expect(prompt).toContain('Aportes efetivamente feitos pela conta: R$ 860,00')
    expect(prompt).toContain('Total creditado em investimentos: R$ 1.940,00')
    expect(prompt).toContain('Previsão não é dinheiro disponível')
    expect(prompt).toContain('O envelope Cartão já inclui seus itens filhos')
    expect(prompt).toContain('Moradia: plano R$ 2.000,00 · realizado/efetivo R$ 2.100,00')
  })

  it('codifica todo o prompt no deep link oficial do Claude', () => {
    const prompt = 'Analise renda & cartão em setembro'
    const link = buildClaudeDeepLink(prompt)

    expect(link).toBe(`claude://claude.ai/new?q=${encodeURIComponent(prompt)}`)
  })
})
