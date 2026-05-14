'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '@/lib/authStore'
import type { UserRole } from '@crabwatch/shared'
import { api } from '@/lib/api'
import Link from 'next/link'

interface LoginForm {
  email: string
  password: string
}

export default function LoginPage(): React.JSX.Element {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuthStore()
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginForm>()

  const isRegistered = searchParams.get('registered') === 'true'

  const onSubmit = async (data: LoginForm) => {
    try {
      setError('')
      const result = await api.login(data)

      login({ ...result.user, role: result.user.role as UserRole })
      router.push('/dashboard')
    } catch {
      setError('Invalid email or password')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ocean-50">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-bold text-ocean-900 mb-6 text-center">
          Login to CrabWatch
        </h1>

        {isRegistered && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
            Account created successfully. Please log in.
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

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              {...register('password', { required: true })}
              type="password"
              className="input-field"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full"
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>

          <div className="text-right">
            <Link href="/auth/forgot-password" className="text-sm text-ocean-600 hover:underline">
              Forgot password?
            </Link>
          </div>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="text-ocean-600 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}
