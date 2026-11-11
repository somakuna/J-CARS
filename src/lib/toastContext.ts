import { createContext, useContext } from 'react'

export type ToastTone = 'ok' | 'danger'

export interface ToastContextValue {
  /** Kratka poruka na dnu zaslona koja nestaje sama. */
  showToast: (message: string, tone?: ToastTone) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast se mora koristiti unutar <ToastProvider>.')
  return context
}
