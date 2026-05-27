'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '@/lib/authStore'
import type { UserRole } from '@crabwatch/shared'
import { api } from '@/lib/api'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'

interface LoginForm {
  email: string
  password: string
}

export default function LoginPage(): React.JSX.Element {
  const router = useRouter()
  const t = useTranslations('auth.login')
  const [isRegistered, setIsRegistered] = useState(false)
  const { login } = useAuthStore()
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginForm>()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      setIsRegistered(params.get('registered') === 'true')
    }
  }, [])

  const onSubmit = async (data: LoginForm) => {
    try {
      setError('')
      const result = await api.login(data)

      login({
        ...result.user,
        role: result.user.role as UserRole,
        avatar: null,
        firebaseUid: '',
        preferredLocale: null,
        createdAt: new Date(),
      }, result.token)
      router.push('/dashboard')
    } catch {
      setError(t('invalidCredentials'))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ocean-50">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-bold text-ocean-900 mb-6 text-center">
          {t('title')}
        </h1>

        {isRegistered && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
            {t('registeredSuccess')}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              {t('email')}
            </label>
            <input
              id="email"
              {...register('email', { required: true })}
              type="email"
              className="input-field"
              placeholder={t('emailPlaceholder')}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              {t('password')}
            </label>
            <input
              id="password"
              {...register('password', { required: true })}
              type="password"
              className="input-field"
              placeholder={t('passwordPlaceholder')}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full"
          >
            {isSubmitting ? t('signInLoading') : t('signIn')}
          </button>

          <div className="text-right">
            <Link href="/auth/forgot-password" className="text-sm text-ocean-600 hover:underline">
              {t('forgotPassword')}
            </Link>
          </div>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          {t('noAccount')}{' '}
          <Link href="/auth/register" className="text-ocean-600 hover:underline">
            {t('signUp')}
          </Link>
        </p>
      </div>
    </div>
  )
}
