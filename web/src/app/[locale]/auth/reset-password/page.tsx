'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { api } from '@/lib/api'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

interface ResetPasswordForm {
  password: string
  confirmPassword: string
}

export default function ResetPasswordPage(): React.JSX.Element {
  const t = useTranslations('auth.resetPassword')
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
    watch,
  } = useForm<ResetPasswordForm>()

  const password = watch('password')

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const params = new URLSearchParams(window.location.search)
    setToken(params.get('token'))
  }, [])

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) {
      setError(t('invalidToken'))
      return
    }
    if (data.password !== data.confirmPassword) {
      setError(t('passwordsMismatch'))
      return
    }
    try {
      setError('')
      await api.resetPassword({ token, password: data.password })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failed'))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ocean-50">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-bold text-ocean-900 mb-2 text-center">
          {t('title')}
        </h1>
        <p className="text-sm text-gray-600 mb-6 text-center">
          {t('subtitle')}
        </p>

        {!token && !success && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {t('invalidToken')}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success ? (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">
              {t('success')}
            </div>
            <Link href="/auth/login" className="btn-primary w-full text-center block">
              {t('backToLogin')}
            </Link>
          </div>
        ) : token ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                {t('password')}
              </label>
              <input
                id="password"
                {...register('password', {
                  required: t('passwordRequired'),
                  minLength: { value: 8, message: t('passwordMin') },
                })}
                type="password"
                className="input-field"
                placeholder={t('passwordPlaceholder')}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                {t('confirmPassword')}
              </label>
              <input
                id="confirmPassword"
                {...register('confirmPassword', {
                  required: t('confirmPasswordRequired'),
                  validate: (v) => v === password || t('passwordsMismatch'),
                })}
                type="password"
                className="input-field"
                placeholder={t('confirmPasswordPlaceholder')}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full"
            >
              {isSubmitting ? t('resetPasswordLoading') : t('resetPassword')}
            </button>
          </form>
        ) : null}

        <p className="mt-4 text-center text-sm text-gray-600">
          {t('rememberPassword')}{' '}
          <Link href="/auth/login" className="text-ocean-600 hover:underline">
            {t('signInLink')}
          </Link>
        </p>
      </div>
    </div>
  )
}
