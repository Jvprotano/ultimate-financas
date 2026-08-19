import { useState, useEffect, useCallback, useRef } from 'react'
import { writeStorageValue } from '../lib/persistence'

export type LocalStorageSetter<T> = (value: T | ((prev: T) => T)) => boolean

/**
 * Estado espelhado no localStorage.
 *
 * `initialValue` aceita uma função: as migrações deste app leem e normalizam o
 * storage inteiro para montar o valor inicial, e passar isso como valor direto
 * faria esse trabalho rodar em *todo* render — o `useState` só usa o resultado
 * na primeira vez.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T),
): [T, LocalStorageSetter<T>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    const resolveInitial = () =>
      initialValue instanceof Function ? (initialValue as () => T)() : initialValue

    try {
      const item = window.localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : resolveInitial()
    } catch {
      return resolveInitial()
    }
  })
  const valueRef = useRef(storedValue)

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      const nextValue = value instanceof Function ? value(valueRef.current) : value
      if (!writeStorageValue(key, JSON.stringify(nextValue))) return false
      valueRef.current = nextValue
      setStoredValue(nextValue)
      return true
    },
    [key],
  )

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== key) return
      // newValue null = chave removida em outra aba (ex.: "apagar tudo").
      // Ignorar isso deixava esta aba exibindo dados fantasmas e os regravando.
      if (e.newValue === null) {
        window.location.reload()
        return
      }
      try {
        const nextValue = JSON.parse(e.newValue) as T
        valueRef.current = nextValue
        setStoredValue(nextValue)
      } catch {
        // ignore parse errors
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [key])

  return [storedValue, setValue]
}
