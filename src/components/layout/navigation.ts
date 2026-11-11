import { CalendarDays, Car, ClipboardList, LayoutDashboard, Settings, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  /** Kraći naziv za donju navigaciju na mobitelu. */
  shortLabel: string
  icon: LucideIcon
  /** Aktivno samo na točnoj putanji (za početnu stranicu). */
  end?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Nadzorna ploča', shortLabel: 'Pregled', icon: LayoutDashboard, end: true },
  { to: '/vozila', label: 'Vozila', shortLabel: 'Vozila', icon: Car },
  { to: '/kalendar', label: 'Kalendar', shortLabel: 'Kalendar', icon: CalendarDays },
  { to: '/aktivnosti', label: 'Aktivnosti', shortLabel: 'Aktivnosti', icon: ClipboardList },
  { to: '/postavke', label: 'Postavke', shortLabel: 'Postavke', icon: Settings },
]

export const NEW_ACTIVITY_PATH = '/aktivnosti/nova'
