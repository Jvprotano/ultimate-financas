import { describe, expect, it } from 'vitest'
import {
  AUTO_BACKUP_KEY,
  clearAllFinTanoStorage,
  clearAppStorage,
  readBackupEntries,
  restoreEntries,
} from './backup'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  failOnceFor: string | null = null

  get length() {
    return this.values.size
  }

  clear() {
    this.values.clear()
  }

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null
  }

  removeItem(key: string) {
    this.values.delete(key)
  }

  setItem(key: string, value: string) {
    if (this.failOnceFor === key) {
      this.failOnceFor = null
      throw new DOMException('quota', 'QuotaExceededError')
    }
    this.values.set(key, String(value))
  }
}

describe('backup seguro', () => {
  it('rejeita valor interno que não é JSON', () => {
    expect(() =>
      readBackupEntries({ app: 'fintano', localStorage: { uf_history_v1: 'inválido' } }),
    ).toThrow()
  })

  it('não toca no estado atual quando o arquivo é incompatível', () => {
    const storage = new MemoryStorage()
    storage.setItem('uf_salary_net', '1000')

    expect(() =>
      readBackupEntries({ app: 'outro-app', localStorage: { uf_history_v1: '{quebrado' } }),
    ).toThrow()
    expect(storage.getItem('uf_salary_net')).toBe('1000')
    expect(storage.length).toBe(1)
  })

  it('restaura todas as chaves e cria uma cópia do estado anterior', () => {
    const storage = new MemoryStorage()
    storage.setItem('uf_salary_net', '1000')

    const result = restoreEntries(
      [
        ['uf_salary_net', '2000'],
        ['uf_actuals_v1', '[]'],
      ],
      storage,
    )

    expect(result).toMatchObject({ ok: true, restoredKeys: 2 })
    expect(storage.getItem('uf_salary_net')).toBe('2000')
    expect(storage.getItem(AUTO_BACKUP_KEY)).toContain('uf_salary_net')
  })

  it('faz rollback se uma escrita falha no meio da restauração', () => {
    const storage = new MemoryStorage()
    storage.setItem('uf_salary_net', '1000')
    storage.failOnceFor = 'uf_actuals_v1'

    const result = restoreEntries(
      [
        ['uf_salary_net', '2000'],
        ['uf_actuals_v1', '[]'],
      ],
      storage,
    )

    expect(result.ok).toBe(false)
    expect(storage.getItem('uf_salary_net')).toBe('1000')
    expect(storage.getItem('uf_actuals_v1')).toBeNull()
  })

  it('distingue limpar dados atuais de apagar também as cópias', () => {
    const storage = new MemoryStorage()
    storage.setItem('uf_salary_net', '1000')
    storage.setItem(AUTO_BACKUP_KEY, '[]')

    clearAppStorage(storage)
    expect(storage.getItem('uf_salary_net')).toBeNull()
    expect(storage.getItem(AUTO_BACKUP_KEY)).toBe('[]')

    clearAllFinTanoStorage(storage)
    expect(storage.getItem(AUTO_BACKUP_KEY)).toBeNull()
  })
})
