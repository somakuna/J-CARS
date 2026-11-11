import { TriangleAlert } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Button } from './Button'
import { Spinner } from './Spinner'

interface ConfirmDialogProps {
  open: boolean
  title: string
  children?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  /** Crveni gumb za potvrdu (brisanje). */
  destructive?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Modalni dijalog za potvrdu važnih radnji (npr. brisanja). Koristi izvorni <dialog>. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Odustani',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        if (!busy) onCancel()
      }}
      onClick={(e) => {
        // Klik na zatamnjenu pozadinu zatvara dijalog.
        if (e.target === ref.current && !busy) onCancel()
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border bg-surface p-0 text-fg shadow-xl backdrop:bg-black/50"
      aria-labelledby={titleId}
    >
      <div className="p-5 sm:p-6">
        <div className="flex gap-4">
          {destructive && (
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
              <TriangleAlert className="size-5" aria-hidden="true" />
            </div>
          )}
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            {children && <div className="mt-2 text-sm text-muted">{children}</div>}
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>
            {busy && <Spinner className="size-4" />}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
