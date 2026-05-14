'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { api } from '@/lib/api'
import { COUNTRIES } from '@crabwatch/shared'
import Link from 'next/link'

interface RegisterForm {
  name: string
  email: string
  phoneCode: string
  phoneNumber: string
  addressLine1: string
  addressLine2: string
  addressLine3: string
  state: string
  postcode: string
  country: string
  password: string
  confirmPassword: string
}

export default function RegisterPage(): React.JSX.Element {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')
  const [isNetworkError, setIsNetworkError] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('')
  const [inviteToken, setInviteToken] = useState('')
  const [validatingInvite, setValidatingInvite] = useState(false)
  const {
    register,
    control,
    handleSubmit,
    formState: { isSubmitting, errors },
    setValue,
  } = useForm<RegisterForm>({
    defaultValues: {
      phoneCode: '+60',
      country: 'MY',
    },
  })

  useEffect(() => {
    const token = searchParams.get('invite')
    if (token) {
      setValidatingInvite(true)
      api.validateInvite(token)
        .then((result) => {
          if (result.valid && result.email && result.role) {
            setInviteToken(token)
            setInviteEmail(result.email)
            setInviteRole(result.role)
            setValue('email', result.email)
          } else {
            setError(result.error || 'Invalid or expired invite')
          }
        })
        .catch(() => setError('Failed to validate invite'))
        .finally(() => setValidatingInvite(false))
    }
  }, [searchParams, setValue])

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
        phoneCode: data.phoneCode,
        phoneNumber: data.phoneNumber,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2 || undefined,
        addressLine3: data.addressLine3 || undefined,
        state: data.state,
        postcode: data.postcode,
        country: data.country,
        password: data.password,
        inviteToken: inviteToken || undefined,
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
    <div className="min-h-screen flex items-center justify-center bg-ocean-50 py-8">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-bold text-ocean-900 mb-6 text-center">
          Join CrabWatch
        </h1>

        {validatingInvite && (
          <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
            Validating invite...
          </div>
        )}

        {inviteEmail && inviteRole && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
            <p className="font-medium">Invited as: {inviteRole.toUpperCase()}</p>
            <p>Email: {inviteEmail}</p>
          </div>
        )}

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
              disabled={!!inviteEmail}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div className="flex gap-3">
            <div className="w-20">
              <label htmlFor="reg-phoneCode" className="block text-sm font-medium text-gray-700 mb-1">
                Code
              </label>
              <Controller
                control={control}
                name="phoneCode"
                render={({ field }) => (
                  <select id="reg-phoneCode" className="input-field" {...field}>
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.phoneCode}>
                        {c.phoneCode}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>
            <div className="flex-1">
              <label htmlFor="reg-phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                id="reg-phoneNumber"
                {...register('phoneNumber', {
                  required: 'Phone number is required',
                  minLength: { value: 7, message: 'At least 7 digits' },
                })}
                type="tel"
                className="input-field"
                placeholder="123456789"
              />
              {errors.phoneNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.phoneNumber.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="reg-addressLine1" className="block text-sm font-medium text-gray-700 mb-1">
              Address Line 1
            </label>
            <input
              id="reg-addressLine1"
              {...register('addressLine1', { required: 'Address line 1 is required' })}
              className="input-field"
              placeholder="Street address"
            />
          </div>

          <div>
            <label htmlFor="reg-addressLine2" className="block text-sm font-medium text-gray-700 mb-1">
              Address Line 2 <span className="text-gray-400">(optional)</span>
            </label>
            <input
              id="reg-addressLine2"
              {...register('addressLine2')}
              className="input-field"
              placeholder="Apartment, suite, etc."
            />
          </div>

          <div>
            <label htmlFor="reg-addressLine3" className="block text-sm font-medium text-gray-700 mb-1">
              Address Line 3 <span className="text-gray-400">(optional)</span>
            </label>
            <input
              id="reg-addressLine3"
              {...register('addressLine3')}
              className="input-field"
              placeholder="Additional address info"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="reg-state" className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                id="reg-state"
                {...register('state', { required: 'State is required' })}
                className="input-field"
                placeholder="State"
              />
            </div>
            <div className="w-28">
              <label htmlFor="reg-postcode" className="block text-sm font-medium text-gray-700 mb-1">
                Postcode
              </label>
              <input
                id="reg-postcode"
                {...register('postcode', { required: 'Postcode is required' })}
                className="input-field"
                placeholder="Postcode"
              />
            </div>
          </div>

          <div>
            <label htmlFor="reg-country" className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <Controller
              control={control}
              name="country"
              render={({ field }) => (
                <select
                  id="reg-country"
                  className="input-field"
                  {...field}
                  onChange={(e) => {
                    const code = e.target.value
                    field.onChange(code)
                    const country = COUNTRIES.find((c) => c.code === code)
                    if (country) {
                      setValue('phoneCode', country.phoneCode)
                    }
                  }}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.country && (
              <p className="mt-1 text-sm text-red-600">{errors.country.message}</p>
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

          <button type="submit" disabled={isSubmitting || validatingInvite} className="btn-primary w-full">
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
