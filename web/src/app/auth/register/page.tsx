'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { api } from '@/lib/api'
import Link from 'next/link'

interface RegisterForm {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export default function RegisterPage(): React.JSX.Element {
  const router = useRouter()
  const [error, setError] = useState('')
  const [isNetworkError, setIsNetworkError] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<RegisterForm>()

  const onSubmit = async (data: RegisterForm) => {
    try {
      setError('')
      setIsNetworkError(false)
      setIsSuccess(false)
      if (data.password !== data.confirmPassword) {
        setError('Passwords do not match')
        return
      }

      await api.register({
        name: data.name,
        email: data.email,
        password: data.password,
      })

      setIsSuccess(true)
      router.push('/auth/login?registered=true')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      const isNetwork = message.includes('Network') || message.includes('fetch')
      setIsNetworkError(isNetwork)
      setError(message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ocean-50">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-bold text-ocean-900 mb-6 text-center">
          Join CrabWatch
        </h1>

        {error && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${isNetworkError ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>
            {isNetworkError ? 'Network error. Please check your connection and try again.' : error}
          </div>
        )}

        {isSuccess && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
            Account created successfully! Redirecting to login...
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              id="name"
              {...register('name', { required: 'Name is required' })}
              className="input-field"
              placeholder="Ahmad bin Ali"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="reg-email"
              {...register('email', { required: 'Email is required' })}
              type="email"
              className="input-field"
              placeholder="your@email.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="reg-password"
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Minimum 8 characters' },
              })}
              type="password"
              className="input-field"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              id="confirm-password"
              {...register('confirmPassword', { required: 'Please confirm your password' })}
              type="password"
              className="input-field"
              placeholder="••••••••"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-ocean-600 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  )
}
