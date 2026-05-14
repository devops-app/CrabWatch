'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { api } from '@/lib/api'
import Link from 'next/link'

interface ForgotPasswordForm {
  email: string
}

export default function ForgotPasswordPage(): React.JSX.Element {
  const router = useRouter()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ForgotPasswordForm>()

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      setError('')
      await api.requestPasswordReset(data)
      setSuccess(true)
    } catch {
      setError('Failed to send reset email')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ocean-50">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-bold text-ocean-900 mb-2 text-center">
          Forgot Password
        </h1>
        <p className="text-sm text-gray-600 mb-6 text-center">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success ? (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">
              If an account exists with that email, a password reset link has been sent. Check your inbox.
            </div>
            <Link href="/auth/login" className="btn-primary w-full text-center block">
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                {...register('email', { required: true })}
                type="email"
                className="input-field"
                placeholder="your@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full"
            >
              {isSubmitting ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-gray-600">
          Remember your password?{' '}
          <Link href="/auth/login" className="text-ocean-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
