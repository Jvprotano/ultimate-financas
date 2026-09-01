/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { readRepositoryDocument } from '../data/repository'
import type {
  CreditCardEntry,
  EmergencyFundState,
  FinanceScenario,
  FinancialGoal,
  MonthlyActuals,
  MonthlySnapshot,
} from '../types'
import type { FinancialHolding } from './investments'
import { normalizeActuals } from './actuals'
import { buildBackupPayload, inspectBackup, restoreBackup } from './backup'
import { normalizeCreditCardEntry } from './creditCards'
import { buildHistoryPoints, normalizeSnapshot, projectHistoryInvestments } from './history'
import { normalizeGoal } from './goals'
import { normalizeEmergencyFund, normalizeHolding } from './investments'
import { normalizeScenario } from './scenario'

class ValidationStorage implements Storage {
  private values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

const backupPath = process.env.FINTANO_BACKUP_PATH

describe.skipIf(!backupPath)('backup real informado para validação', () => {
  it('migra para v7, restaura e permanece aceito pelos cálculos atuais', () => {
    const payload = JSON.parse(readFileSync(backupPath!, 'utf8')) as unknown
    const inspection = inspectBackup(payload)
    const storage = new ValidationStorage()

    const sourceVersion = (payload as { schemaVersion?: number }).schemaVersion
    expect(inspection.migratedFromVersion).toBe(sourceVersion === 7 ? null : 6)
    expect(inspection.issues.filter((issue) => issue.severity === 'error')).toEqual([])
    expect(inspection.backup.cards.charges.every((charge) => charge.accountId)).toBe(true)
    expect(
      inspection.backup.investments.ledgerEntries.every(
        (entry) => Number.isInteger(entry.amountCents) && /^\d{4}-\d{2}$/.test(entry.competenceMonth),
      ),
    ).toBe(true)
    expect(restoreBackup(payload, storage).ok).toBe(true)

    const repository = readRepositoryDocument(storage)
    const actuals = (repository.collections.actuals ?? []) as Partial<MonthlyActuals>[]
    const history = (repository.collections.history ?? []) as Partial<MonthlySnapshot>[]
    const cardEntries = (repository.collections.cardEntries ?? []) as CreditCardEntry[]
    const scenarios = (repository.collections.scenarios ?? []) as FinanceScenario[]
    const holdings = (repository.collections.investmentHoldings ?? []) as FinancialHolding[]
    const goals = (repository.collections.goals ?? []) as FinancialGoal[]
    const emergencyFund = (repository.collections.emergencyFund ?? {}) as EmergencyFundState
    const normalizedHistory = history.map(normalizeSnapshot)

    expect(actuals.map(normalizeActuals)).toHaveLength(actuals.length)
    expect(cardEntries.map(normalizeCreditCardEntry)).toHaveLength(cardEntries.length)
    expect(scenarios.map(normalizeScenario)).toHaveLength(scenarios.length)
    const projectedHistory = projectHistoryInvestments(normalizedHistory, {
      emergencyFund: normalizeEmergencyFund(emergencyFund),
      holdings: holdings.map(normalizeHolding),
      goals: goals.map((goal, index) => normalizeGoal(goal, index)),
    })
    const points = buildHistoryPoints(projectedHistory)

    expect(
      points.every(
        (point) =>
          Number.isFinite(point.invested) &&
          Number.isFinite(point.savingsRate) &&
          Number.isFinite(point.financialNetWorth) &&
          Number.isFinite(point.netWorth),
      ),
    ).toBe(true)

    const roundTrip = inspectBackup(buildBackupPayload(storage))
    expect(roundTrip.migratedFromVersion).toBeNull()
    expect(roundTrip.issues.filter((issue) => issue.severity === 'error')).toEqual([])
    expect(roundTrip.counts).toEqual(inspection.counts)
  })
})
