import { useCallback, useEffect, useState } from 'react'
import {
  clearPersistenceError,
  getPersistenceError,
  PERSISTENCE_ERROR_EVENT,
  probeStorage,
  type PersistenceErrorDetail,
} from '../lib/persistence'

export interface PersistenceStatus {
  hasError: boolean
  message: string
  failedKey?: string
  retry: () => boolean
}

export function usePersistenceStatus(): PersistenceStatus {
  const [error, setError] = useState<PersistenceErrorDetail | null>(() => getPersistenceError())

  useEffect(() => {
    const handleError = (event: Event) => {
      setError((event as CustomEvent<PersistenceErrorDetail>).detail)
    }
    window.addEventListener(PERSISTENCE_ERROR_EVENT, handleError)
    return () => window.removeEventListener(PERSISTENCE_ERROR_EVENT, handleError)
  }, [])

  const retry = useCallback(() => {
    const writable = probeStorage()
    if (writable) {
      clearPersistenceError()
      setError(null)
    }
    return writable
  }, [])

  return {
    hasError: error !== null,
    message: error?.message ?? '',
    failedKey: error?.key,
    retry,
  }
}
