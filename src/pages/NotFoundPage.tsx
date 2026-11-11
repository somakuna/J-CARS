import { MapPinOff } from 'lucide-react'
import { Link } from 'react-router'
import { buttonClasses } from '@/components/ui/buttonClasses'
import { EmptyState } from '@/components/ui/EmptyState'

export function NotFoundPage() {
  return (
    <EmptyState
      icon={MapPinOff}
      title="Stranica nije pronađena"
      description="Poveznica je možda neispravna ili je sadržaj obrisan."
      action={
        <Link to="/" className={buttonClasses('secondary')}>
          Na nadzornu ploču
        </Link>
      }
    />
  )
}
