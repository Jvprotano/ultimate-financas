/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { normalizeActuals } from './actuals'
import { readBackupEntries, restoreEntries, type BackupPayload } from './backup'
import { normalizeCardAccount, normalizeCreditCardEntry, normalizeCreditCardSettings } from './creditCards'
import { normalizeExpectedEvent } from './forecast'
import {
  buildHistoryPoints,
  calculateNetWorthChange,
  normalizeSnapshot,
  projectHistoryInvestments,
} from './history'
import { normalizeGoal } from './goals'
import { normalizeEmergencyFund, normalizeHolding } from './investments'
import { normalizeScenario } from './scenario'
import type { CreditCardEntry, FinanceScenario, MonthlyActuals, MonthlySnapshot } from '../types'

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
  it('restaura integralmente e é aceito pelos normalizadores atuais', () => {
    const payload = JSON.parse(readFileSync(backupPath!, 'utf8')) as BackupPayload
    const entries = readBackupEntries(payload)
    const source = Object.fromEntries(entries)
    const storage = new ValidationStorage()

    expect(restoreEntries(entries, storage)).toMatchObject({ ok: true, restoredKeys: entries.length })
    expect(storage.length).toBeGreaterThanOrEqual(entries.length)
    entries.forEach(([key, value]) => expect(storage.getItem(key)).toBe(value))

    const actuals = JSON.parse(source.uf_actuals_v1) as Partial<MonthlyActuals>[]
    const history = JSON.parse(source.uf_history_v1) as Partial<MonthlySnapshot>[]
    const cardEntries = JSON.parse(source.uf_credit_card_entries_v1) as CreditCardEntry[]
    const cardAccounts = JSON.parse(source.uf_credit_card_accounts_v1) as object[]
    const events = JSON.parse(source.uf_expected_events_v1) as object[]
    const scenarios = JSON.parse(source.uf_scenarios_v3) as FinanceScenario[]
    const holdings = JSON.parse(source.uf_investment_holdings_v1 ?? '[]') as object[]
    const goals = JSON.parse(source.uf_goals_v1 ?? '[]') as object[]
    const emergencyFund = JSON.parse(source.uf_emergency_fund_v1 ?? '{}') as object
    const normalizedHistory = history.map(normalizeSnapshot)

    expect(actuals.map(normalizeActuals)).toHaveLength(actuals.length)
    expect(normalizedHistory).toHaveLength(history.length)
    expect(cardEntries.map(normalizeCreditCardEntry)).toHaveLength(cardEntries.length)
    expect(cardAccounts.map(normalizeCardAccount)).toHaveLength(cardAccounts.length)
    expect(events.map(normalizeExpectedEvent)).toHaveLength(events.length)
    expect(scenarios.map(normalizeScenario)).toHaveLength(scenarios.length)
    expect(normalizeCreditCardSettings(JSON.parse(source.uf_credit_card_settings_v1))).toBeTruthy()
    const projectedHistory = projectHistoryInvestments(normalizedHistory, {
      emergencyFund: normalizeEmergencyFund(emergencyFund),
      holdings: holdings.map((holding) => normalizeHolding(holding)),
      goals: goals.map((goal, index) => normalizeGoal(goal, index)),
    })

    expect(
      projectedHistory.every(
        (snapshot) =>
          Number.isFinite(snapshot.invested) &&
          Number.isFinite(snapshot.savingsRate) &&
          Number.isFinite(snapshot.balance),
      ),
    ).toBe(true)

    const points = buildHistoryPoints(projectedHistory)
    expect(
      points.every(
        (point) =>
          Number.isFinite(point.financialAssets) &&
          Number.isFinite(point.financialNetWorth) &&
          Number.isFinite(point.propertyEquity) &&
          Number.isFinite(point.netWorth),
      ),
    ).toBe(true)

    for (let index = 1; index < projectedHistory.length; index += 1) {
      const change = calculateNetWorthChange(
        projectedHistory[index - 1],
        projectedHistory[index],
      )
      expect(
        change.financialAssetsChange + change.physicalAssetsChange + change.debtEffect,
      ).toBeCloseTo(change.netWorthChange)
      expect(points[index].netWorthDelta).toBeCloseTo(change.netWorthChange)
    }
  })
})
