'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/authStore'

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?: string
}

export default function AuthGuard({ children, requiredRole }: AuthGuardProps): React.JSX.Element {
  const router = useRouter()
  const { user, isHydrated } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (!isHydrated) return

    if (!user) {
      router.replace('/auth/login')
      return
    }

    if (requiredRole && user.role !== requiredRole) {
      router.replace('/dashboard')
      return
    }

    setIsChecking(false)
  }, [router, user, requiredRole, isHydrated])

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-ocean-200 border-t-ocean-600 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
