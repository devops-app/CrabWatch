'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useAuthStore } from '@/lib/authStore'
import { api } from '@/lib/api'

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?: string
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp !== undefined && payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

export default function AuthGuard({ children, requiredRole }: AuthGuardProps): React.JSX.Element {
  const router = useRouter()
  const t = useTranslations('common')
  const { user, token, isHydrated, updateUser, logout } = useAuthStore()
  const userId = user?.id
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (!isHydrated) return

    if (!user) {
      router.replace('/auth/login')
      return
    }

    if (token && isTokenExpired(token)) {
      logout()
      router.replace('/auth/login')
      return
    }

    let cancelled = false

    const verifySession = async () => {
      try {
        const profile = await api.getProfile()
        if (cancelled) return

        updateUser(profile)

        if (requiredRole && profile.role !== requiredRole) {
          router.replace('/dashboard')
          return
        }

        setIsChecking(false)
      } catch {
        if (cancelled) return
        logout()
        router.replace('/auth/login')
      }
    }

    void verifySession()

    return () => {
      cancelled = true
    }
  }, [router, userId, token, requiredRole, isHydrated, updateUser, logout])

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-ocean-200 border-t-ocean-600 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">{t('loading')}</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
