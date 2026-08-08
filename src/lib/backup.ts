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
const AUTO_BACKUP_KEY = 'ufbk_auto_v1'
const AUTO_BACKUP_INTERVAL_DAYS = 7
const AUTO_BACKUP_KEEP = 3

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

export function getAppStorageEntries(): Record<string, string> {
  const entries: Record<string, string> = {}

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (key?.startsWith(APP_STORAGE_PREFIX)) {
      entries[key] = localStorage.getItem(key) ?? ''
    }
  }

  return entries
}

export function clearAppStorage() {
  const keysToRemove: string[] = []

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (key?.startsWith(APP_STORAGE_PREFIX)) keysToRemove.push(key)
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key))
}

export function buildBackupPayload(): BackupPayload {
  return {
    app: 'fintano',
    version: 4,
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
  if (!storage) return []
  return Object.entries(storage).filter(
    ([key, value]) => key.startsWith(APP_STORAGE_PREFIX) && typeof value === 'string',
  )
}

export function restoreEntries(entries: [string, string][]) {
  clearAppStorage()
  entries.forEach(([key, value]) => localStorage.setItem(key, value))
}

// ---------------------------------------------------------------------------
// Cópias automáticas
// ---------------------------------------------------------------------------

export function listAutoBackups(): AutoBackup[] {
  try {
    const raw = localStorage.getItem(AUTO_BACKUP_KEY)
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
export function maybeCreateAutoBackup(): void {
  try {
    const entries = getAppStorageEntries()
    if (Object.keys(entries).length === 0) return

    const backups = listAutoBackups()
    const last = backups[0]
    if (last) {
      const ageDays = (Date.now() - new Date(last.createdAt).getTime()) / (24 * 60 * 60 * 1000)
      if (ageDays < AUTO_BACKUP_INTERVAL_DAYS) return
    }

    const next = [{ createdAt: new Date().toISOString(), entries }, ...backups].slice(
      0,
      AUTO_BACKUP_KEEP,
    )
    localStorage.setItem(AUTO_BACKUP_KEY, JSON.stringify(next))
  } catch {
    // cota cheia ou storage indisponível — backup automático é best-effort
  }
}

export function restoreAutoBackup(createdAt: string): boolean {
  const backup = listAutoBackups().find((item) => item.createdAt === createdAt)
  if (!backup) return false
  restoreEntries(Object.entries(backup.entries))
  return true
}
