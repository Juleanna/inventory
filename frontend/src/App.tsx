import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { AppLayout } from '@/components/layout/app-layout'
import { lazy, Suspense, type ReactNode } from 'react'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { ErrorBoundary } from '@/components/error/error-boundary'

const LoginPage = lazy(() => import('@/pages/auth/login'))
const RegisterPage = lazy(() => import('@/pages/auth/register'))
const TwoFactorPage = lazy(() => import('@/pages/auth/two-factor'))
const DashboardPage = lazy(() => import('@/pages/dashboard'))
const EquipmentListPage = lazy(() => import('@/pages/equipment/list'))
const EquipmentDetailPage = lazy(() => import('@/pages/equipment/[id]'))
const MaintenanceListPage = lazy(() => import('@/pages/maintenance/list'))
const MaintenanceSchedulePage = lazy(() => import('@/pages/maintenance/schedule'))
const SparePartsListPage = lazy(() => import('@/pages/spare-parts/list'))
const SuppliersPage = lazy(() => import('@/pages/spare-parts/suppliers'))
const OrdersPage = lazy(() => import('@/pages/spare-parts/orders'))
const SoftwareListPage = lazy(() => import('@/pages/software/list'))
const PeripheralsListPage = lazy(() => import('@/pages/peripherals/list'))
const LicensesListPage = lazy(() => import('@/pages/licenses/list'))
const UsersListPage = lazy(() => import('@/pages/users/list'))
const PasswordVaultPage = lazy(() => import('@/pages/passwords/vault'))
const AnalyticsPage = lazy(() => import('@/pages/analytics'))
const NotificationsPage = lazy(() => import('@/pages/notifications'))
const SettingsPage = lazy(() => import('@/pages/settings'))
const NotFoundPage = lazy(() => import('@/pages/not-found'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function GuestRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (isAuthenticated) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<LoadingSpinner size="lg" className="h-screen" />}>
          <Routes>
            {/* Guest routes */}
            <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
            <Route path="/2fa" element={<TwoFactorPage />} />

            {/* Protected routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="equipment" element={<EquipmentListPage />} />
              <Route path="equipment/:id" element={<EquipmentDetailPage />} />
              <Route path="software" element={<SoftwareListPage />} />
              <Route path="peripherals" element={<PeripheralsListPage />} />
              <Route path="licenses" element={<LicensesListPage />} />
              <Route path="maintenance" element={<MaintenanceListPage />} />
              <Route path="maintenance/schedule" element={<MaintenanceSchedulePage />} />
              <Route path="spare-parts" element={<SparePartsListPage />} />
              <Route path="spare-parts/suppliers" element={<SuppliersPage />} />
              <Route path="spare-parts/orders" element={<OrdersPage />} />
              <Route path="users" element={<UsersListPage />} />
              <Route path="passwords" element={<PasswordVaultPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      </ErrorBoundary>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  )
}
