import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router'
import { ConfigErrorScreen } from '@/components/ConfigErrorScreen'
import { AppLayout } from '@/components/layout/AppLayout'
import { RequireAuth } from '@/components/RequireAuth'
import { AuthProvider, PASSWORD_RESET_PATH } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/supabase'
import { ThemeProvider } from '@/lib/theme'
import { ToastProvider } from '@/lib/toast'
import { ActivitiesPage } from '@/pages/ActivitiesPage'
import { CalendarPage } from '@/pages/CalendarPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { EditActivityPage } from '@/pages/EditActivityPage'
import { LoginPage } from '@/pages/LoginPage'
import { NewActivityPage } from '@/pages/NewActivityPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { NotificationSettingsPage } from '@/pages/NotificationSettingsPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { VehicleDetailPage } from '@/pages/VehicleDetailPage'
import { EditVehiclePage, NewVehiclePage } from '@/pages/VehicleFormPage'
import { VehiclesPage } from '@/pages/VehiclesPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <ThemeProvider>
      {isSupabaseConfigured ? (
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ToastProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="prijava" element={<LoginPage />} />
                  <Route path={PASSWORD_RESET_PATH.slice(1)} element={<ResetPasswordPage />} />

                  <Route
                    element={
                      <RequireAuth>
                        <AppLayout />
                      </RequireAuth>
                    }
                  >
                    <Route index element={<DashboardPage />} />
                    <Route path="vozila" element={<VehiclesPage />} />
                    <Route path="vozila/novo" element={<NewVehiclePage />} />
                    <Route path="vozila/:id" element={<VehicleDetailPage />} />
                    <Route path="vozila/:id/uredi" element={<EditVehiclePage />} />
                    <Route path="kalendar" element={<CalendarPage />} />
                    <Route path="aktivnosti" element={<ActivitiesPage />} />
                    <Route path="aktivnosti/nova" element={<NewActivityPage />} />
                    <Route path="aktivnosti/:id/uredi" element={<EditActivityPage />} />
                    <Route path="postavke" element={<SettingsPage />} />
                    <Route path="postavke/obavijesti" element={<NotificationSettingsPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </ToastProvider>
          </AuthProvider>
        </QueryClientProvider>
      ) : (
        <ConfigErrorScreen />
      )}
    </ThemeProvider>
  )
}
