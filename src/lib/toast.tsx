import { CircleAlert, CircleCheck, X } from 'lucide-react'
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn } from './cn'
import { ToastContext, type ToastTone } from './toastContext'

interface Toast {
  id: number
  message: string
  tone: ToastTone
}

const DURATION_MS = 3500

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, tone: ToastTone = 'ok') => {
      const id = nextId.current++
      setToasts((current) => [...current.slice(-2), { id, message, tone }])
      window.setTimeout(() => dismiss(id), tone === 'danger' ? DURATION_MS * 2 : DURATION_MS)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6"
      >
        {toasts.map((toast) => {
          const Icon = toast.tone === 'ok' ? CircleCheck : CircleAlert
          return (
            <div
              key={toast.id}
              role={toast.tone === 'danger' ? 'alert' : 'status'}
              className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl bg-ink px-4 py-3 text-sm text-white shadow-lg dark:bg-surface-2 dark:text-fg"
            >
              <Icon
                className={cn('size-5 shrink-0', toast.tone === 'ok' ? 'text-brand' : 'text-red-400')}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">{toast.message}</span>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="-mr-1 rounded-md p-1 opacity-70 hover:opacity-100"
                aria-label="Zatvori obavijest"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
