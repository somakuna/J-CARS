import { useEffect, useState } from 'react'
import { todayISO, type ISODate } from '@shared/dates'

/**
 * Današnji datum (Europe/Zagreb) koji se sam mijenja u ponoć,
 * i kad se aplikacija vrati iz pozadine nakon više dana.
 */
export function useToday(): ISODate {
  const [today, setToday] = useState(todayISO)

  useEffect(() => {
    const refresh = () => setToday(todayISO())
    const timer = window.setInterval(refresh, 60_000)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  return today
}
