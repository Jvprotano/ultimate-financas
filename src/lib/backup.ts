// ---------------------------------------------------------------------------
// Backup dos dados locais.
// As cópias automáticas usam o prefixo `ufbk_` justamente para NÃO casarem com
// `uf_`: senão cada backup entraria no backup seguinte e o storage cresceria
// sozinho até estourar a cota.
//
// O prefixo `uf_` é mantido mesmo após o rename para FinTano: trocar as chaves
// apagaria, na prática, os dados existentes de quem já usa o app.
// ---------------------------------------------------------------------------

export const APP_STORAGE_PREFIX = 'uf_'
export const BACKUP_STORAGE_PREFIX = 'ufbk_'
export const AUTO_BACKUP_KEY = 'ufbk_auto_v1'
const AUTO_BACKUP_INTERVAL_DAYS = 7
const AUTO_BACKUP_KEEP = 3
const RESTORE_PROBE_KEY = 'fintano_restore_probe'
const MAX_BACKUP_BYTES = 4 * 1024 * 1024

export interface BackupPayload {
  app?: string
  version?: number
  exportedAt?: string
  localStorage?: Record<string, string>
}

export interface AutoBackup {
  createdAt: string
  entries: Record<string, string>
}

export interface RestoreResult {
  ok: boolean
  restoredKeys: number
  error?: string
}

export function getAppStorageEntries(storage: Storage = localStorage): Record<string, string> {
  const entries: Record<string, string> = {}

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (key?.startsWith(APP_STORAGE_PREFIX)) {
      entries[key] = storage.getItem(key) ?? ''
    }
  }

  return entries
}

function removeByPrefixes(prefixes: string[], storage: Storage): void {
  const keysToRemove: string[] = []

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (key && prefixes.some((prefix) => key.startsWith(prefix))) keysToRemove.push(key)
  }

  keysToRemove.forEach((key) => storage.removeItem(key))
}

/** Limpa o estado atual, mas preserva as cópias automáticas de recuperação. */
export function clearAppStorage(storage: Storage = localStorage): void {
  removeByPrefixes([APP_STORAGE_PREFIX], storage)
}

/** Remove estado atual e cópias automáticas deste navegador. */
export function clearAllFinTanoStorage(storage: Storage = localStorage): void {
  removeByPrefixes([APP_STORAGE_PREFIX, BACKUP_STORAGE_PREFIX], storage)
}

export function buildBackupPayload(): BackupPayload {
  return {
    app: 'fintano',
    version: 5,
    exportedAt: new Date().toISOString(),
    localStorage: getAppStorageEntries(),
  }
}

export function downloadBackup() {
  const blob = new Blob([JSON.stringify(buildBackupPayload(), null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `fintano-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * A importação é deliberadamente tolerante ao campo `app`: backups antigos
 * identificados como `ultimate-financas` continuam válidos porque a fonte da
 * verdade são as chaves `uf_`.
 */
export function readBackupEntries(payload: BackupPayload): [string, string][] {
  const storage = payload.localStorage
  if (!storage || typeof storage !== 'object') return []
  const entries = Object.entries(storage).filter(
    ([key, value]) => key.startsWith(APP_STORAGE_PREFIX) && typeof value === 'string',
  )
  if (entries.length === 0) return []

  const serializedBytes = new Blob(entries.map(([key, value]) => `${key}${value}`)).size
  if (serializedBytes > MAX_BACKUP_BYTES) throw new Error('Backup excede o limite de 4 MB.')

  for (const [, value] of entries) {
    JSON.parse(value)
  }
  return entries
}

function writeEntries(entries: [string, string][], storage: Storage): void {
  for (const [key, value] of entries) storage.setItem(key, value)
}

function createAutoBackupNow(storage: Storage): boolean {
  const entries = getAppStorageEntries(storage)
  if (Object.keys(entries).length === 0) return true
  try {
    const backups = listAutoBackups(storage)
    const next = [{ createdAt: new Date().toISOString(), entries }, ...backups].slice(
      0,
      AUTO_BACKUP_KEEP,
    )
    storage.setItem(AUTO_BACKUP_KEY, JSON.stringify(next))
    return true
  } catch {
    return false
  }
}

/**
 * Restaura com pré-validação, cópia de segurança e rollback. Nenhum dado atual
 * é removido antes de o payload inteiro provar que é JSON válido e cabe no storage.
 */
export function restoreEntries(
  entries: [string, string][],
  storage: Storage = localStorage,
): RestoreResult {
  try {
    if (entries.length === 0) throw new Error('Backup sem dados do FinTano.')
    for (const [key, value] of entries) {
      if (!key.startsWith(APP_STORAGE_PREFIX) || typeof value !== 'string') {
        throw new Error('Backup contém uma chave inválida.')
      }
      JSON.parse(value)
    }

    // Prova de capacidade conservadora: o payload cabe mesmo ao lado dos dados atuais.
    storage.setItem(RESTORE_PROBE_KEY, JSON.stringify(Object.fromEntries(entries)))
    storage.removeItem(RESTORE_PROBE_KEY)
  } catch (error) {
    storage.removeItem(RESTORE_PROBE_KEY)
    return {
      ok: false,
      restoredKeys: 0,
      error: error instanceof Error ? error.message : 'Não foi possível validar o backup.',
    }
  }

  const previous = Object.entries(getAppStorageEntries(storage))
  if (!createAutoBackupNow(storage)) {
    return { ok: false, restoredKeys: 0, error: 'Não foi possível criar a cópia de segurança.' }
  }

  try {
    clearAppStorage(storage)
    writeEntries(entries, storage)
    const restored = getAppStorageEntries(storage)
    if (Object.keys(restored).length !== entries.length) {
      throw new Error('A restauração ficou incompleta.')
    }
    return { ok: true, restoredKeys: entries.length }
  } catch (error) {
    try {
      clearAppStorage(storage)
      writeEntries(previous, storage)
    } catch {
      return {
        ok: false,
        restoredKeys: 0,
        error: 'A restauração falhou e o navegador também recusou o rollback.',
      }
    }
    return {
      ok: false,
      restoredKeys: 0,
      error:
        error instanceof Error
          ? `Restauração cancelada: ${error.message}`
          : 'Restauração cancelada sem alterar os dados atuais.',
    }
  }
}

// ---------------------------------------------------------------------------
// Cópias automáticas
// ---------------------------------------------------------------------------

export function listAutoBackups(storage: Storage = localStorage): AutoBackup[] {
  try {
    const raw = storage.getItem(AUTO_BACKUP_KEY)
    const parsed = raw ? (JSON.parse(raw) as AutoBackup[]) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Guarda uma cópia se a última tiver mais de uma semana. Chamado no mount —
 * silencioso por design: se a cota estourar, o app continua funcionando.
 */
export function maybeCreateAutoBackup(storage: Storage = localStorage): void {
  try {
    const entries = getAppStorageEntries(storage)
    if (Object.keys(entries).length === 0) return

    const backups = listAutoBackups(storage)
    const last = backups[0]
    if (last) {
      const ageDays = (Date.now() - new Date(last.createdAt).getTime()) / (24 * 60 * 60 * 1000)
      if (ageDays < AUTO_BACKUP_INTERVAL_DAYS) return
    }

    const next = [{ createdAt: new Date().toISOString(), entries }, ...backups].slice(
      0,
      AUTO_BACKUP_KEEP,
    )
    storage.setItem(AUTO_BACKUP_KEY, JSON.stringify(next))
  } catch {
    // cota cheia ou storage indisponível — backup automático é best-effort
  }
}

export function restoreAutoBackup(
  createdAt: string,
  storage: Storage = localStorage,
): RestoreResult {
  const backup = listAutoBackups(storage).find((item) => item.createdAt === createdAt)
  if (!backup) return { ok: false, restoredKeys: 0, error: 'Cópia não encontrada.' }
  return restoreEntries(Object.entries(backup.entries), storage)
}
