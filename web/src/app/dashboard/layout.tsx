import DashboardLayout from '@/components/DashboardLayout'
import AuthGuard from '@/components/AuthGuard'
import ErrorBoundary from '@/components/ErrorBoundary'
import { ToastProvider } from '@/lib/ToastProvider'

export default function DashboardRouteLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <AuthGuard>
      <ErrorBoundary>
        <ToastProvider>
          <DashboardLayout>{children}</DashboardLayout>
        </ToastProvider>
      </ErrorBoundary>
    </AuthGuard>
  )
}
