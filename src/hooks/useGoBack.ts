import { useCallback } from 'react'
import { useNavigate } from 'react-router'

/**
 * Natrag u povijesti preglednika; ako je stranica otvorena izravno
 * (nema prethodne stranice u aplikaciji), ide na `fallback`.
 */
export function useGoBack(fallback: string) {
  const navigate = useNavigate()
  return useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }, [navigate, fallback])
}
