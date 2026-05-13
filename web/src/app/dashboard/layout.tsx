import DashboardLayout from '@/components/DashboardLayout'
import AuthGuard from '@/components/AuthGuard'
import ErrorBoundary from '@/components/ErrorBoundary'

export default function DashboardRouteLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <AuthGuard>
      <ErrorBoundary>
        <DashboardLayout>{children}</DashboardLayout>
      </ErrorBoundary>
    </AuthGuard>
  )
}
