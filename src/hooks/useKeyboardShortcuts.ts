import { useEffect } from 'react'

/** Não sequestrar teclas enquanto o usuário digita. */
function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

export function useKeyboardShortcuts(handlers: Record<string, () => void>) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      // Esc precisa funcionar mesmo dentro de um campo, para fechar overlays.
      if (event.key !== 'Escape' && isTypingTarget(event.target)) return

      const handler = handlers[event.key]
      if (!handler) return
      event.preventDefault()
      handler()
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handlers])
}
