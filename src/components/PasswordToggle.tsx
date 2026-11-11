import { Eye, EyeOff } from 'lucide-react'

interface PasswordToggleProps {
  visible: boolean
  onToggle: () => void
}

export function PasswordToggle({ visible, onToggle }: PasswordToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex size-10 items-center justify-center rounded-lg text-muted hover:text-fg"
      aria-label={visible ? 'Sakrij lozinku' : 'Prikaži lozinku'}
      aria-pressed={visible}
    >
      {visible ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
    </button>
  )
}
