/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type {
  CreditCardEntry,
  CreditCardSettings,
  EmergencyFundState,
  FinanceScenario,
  FinancialGoal,
  MonthlyActuals,
} from '../types'
import { backupV7ToRepository } from './backupV7'
import type { FinTanoBackupV7 } from './backupSchemaV7'
import { normalizeActuals, summarizeActuals } from '../lib/actuals'
import { calculateCardCycleAccounting } from '../lib/cardCycleAccounting'
import { calculateCreditCardSummary } from '../lib/creditCards'
import { buildCurrentCycleFacts } from '../lib/currentCycleFacts'
import { calculateMonthlyInvestmentActuals } from '../lib/investmentActuals'
import { normalizeEmergencyFund, type FinancialHolding } from '../lib/investments'
import { calculateScenario } from '../lib/scenario'

const backupPath = process.env.FINTANO_V7_BACKUP_PATH

describe.skipIf(!backupPath)('invariantes do backup migrado v7', () => {
  it('reconcilia caixa, previdência, competência e saldos iniciais', () => {
    const backup = JSON.parse(readFileSync(backupPath!, 'utf8')) as FinTanoBackupV7
    const repository = backupV7ToRepository(backup)
    const cycle = backup.profile.activeCycle.month
    const scenarios = repository.collections.scenarios as FinanceScenario[]
    const active = scenarios.find(
      (scenario) => scenario.id === backup.profile.activePlanningTemplateId,
    )!
    const emergency = normalizeEmergencyFund(
      repository.collections.emergencyFund as EmergencyFundState,
    )
    const holdings = repository.collections.investmentHoldings as FinancialHolding[]
    const goals = repository.collections.goals as FinancialGoal[]
    const actualMonth = ((repository.collections.actuals as MonthlyActuals[]) ?? [])
      .map(normalizeActuals)
      .find((item) => item.month === cycle)
    const actuals = summarizeActuals(active.costs, actualMonth, cycle, active.wants)
    const metrics = calculateScenario(active, emergency)
    const investmentLedger = calculateMonthlyInvestmentActuals({
      month: cycle,
      emergencyFund: emergency,
      holdings,
      goals,
    })
    const cardEntries = repository.collections.cardEntries as CreditCardEntry[]
    const cardSettings = repository.collections.cardSettings as CreditCardSettings
    const cardSummary = calculateCreditCardSummary(cardEntries, cardSettings)
    const cardCycle = calculateCardCycleAccounting({
      entries: cardEntries,
      currentDueMonth: cardSettings.currentDueMonth!,
      activeCycleMonth: cycle,
      currentTotal: cardSummary.currentTotal,
      currentPersonalTotal: cardSummary.currentPersonalTotal,
      nextTotal: cardSummary.nextTotal,
      nextPersonalTotal: cardSummary.nextPersonalTotal,
      paidInvoices: repository.collections.cardPaidInvoices as never[],
    })
    const accountCosts = actuals.rows
      .filter((row) => row.cost.paidWith !== 'card')
      .reduce((sum, row) => sum + row.effective, 0)
    const accountCostPlan = actuals.rows
      .filter((row) => row.cost.paidWith !== 'card')
      .reduce((sum, row) => sum + row.planned, 0)
    const facts = buildCurrentCycleFacts({
      month: cycle,
      paycheck: metrics.paycheckInAccount,
      extraIncome: actuals.extraIncomeTotal,
      extraExpense: actuals.extraExpenseTotal,
      invoiceToPay: cardCycle.invoiceThisCycle.personalTotal,
      costsOnAccountActual: accountCosts,
      costsPlanned: accountCostPlan,
      wantsOnAccountActual: actuals.effectiveWants,
      wantsPlanned: actuals.plannedWants,
      costsOnCardPlanned: metrics.costsOnCard,
      wantsOnCardPlanned: metrics.wantsOnCard,
      directInvestmentActual: investmentLedger.directNet,
      directInvestmentPlanned: metrics.directInvestmentTarget,
      payrollInvestment: metrics.investmentDeductions,
      employerInvestment: metrics.employerInvestmentContributions,
      totalInvestmentPlanned: metrics.totalPlannedInvestment,
    })

    expect(facts.cash.leftover).toBeCloseTo(3.81)
    expect(facts.cash.totalIn).toBeCloseTo(9_024)
    expect(facts.cash.invoiceToPay).toBeCloseTo(3_178.68)
    expect(facts.cash.costsOnAccount).toBeCloseTo(4_021.51)
    expect(facts.cash.directInvestment).toBeCloseTo(1_150)
    expect(facts.cash.wantsOnAccount).toBeCloseTo(670)
    expect(facts.actual.personalInvestment).toBeCloseTo(1_690)
    expect(facts.actual.creditedInvestment).toBeCloseTo(2_230)

    const july = calculateMonthlyInvestmentActuals({
      month: '2026-07',
      emergencyFund: emergency,
      holdings,
      goals,
    })
    expect(july.directNet).toBe(0)
    expect(july.openingBalance).toBeCloseTo(400)
    expect(backup.history.closures.find((item) => item.month === '2026-07')?.investments.employerCents).toBeNull()
  })
})
