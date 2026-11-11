import { createContext, useContext } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'

export interface ThemeContextValue {
  preference: ThemePreference
  resolved: 'light' | 'dark'
  setPreference: (preference: ThemePreference) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme se mora koristiti unutar <ThemeProvider>.')
  return context
}
