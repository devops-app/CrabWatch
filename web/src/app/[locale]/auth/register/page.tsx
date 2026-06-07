'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { api } from '@/lib/api'
import { COUNTRIES } from '@crabwatch/shared'
import { useTranslations, useLocale } from 'next-intl'
import { Link, useRouter, usePathname } from '@/i18n/navigation'

interface RegisterForm {
  name: string
  email: string
  phoneCode: string
  phoneNumber: string
  addressLine1: string
  addressLine2: string
  consentAccepted: boolean
  state: string
  postcode: string
  country: string
  password: string
  confirmPassword: string
}

export default function RegisterPage(): React.JSX.Element {
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('auth.register')
  const locale = useLocale()
  const [error, setError] = useState('')
  const [isNetworkError, setIsNetworkError] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('')
  const [inviteToken, setInviteToken] = useState('')
  const [validatingInvite, setValidatingInvite] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)
  const closeLang = useCallback(() => setLangOpen(false), [])
  useEffect(() => {
    if (!langOpen) return
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        closeLang()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [langOpen, closeLang])
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
    if (typeof window === 'undefined') {
      return
    }

    const searchParams = new URLSearchParams(window.location.search)
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
            setError(result.error || t('invalidInvite'))
          }
        })
        .catch(() => setError(t('inviteValidationFailed')))
        .finally(() => setValidatingInvite(false))
    }
  }, [setValue, t])

  const onSubmit = async (data: RegisterForm) => {
    try {
      setError('')
      setIsNetworkError(false)
      setIsSuccess(false)
      if (data.password !== data.confirmPassword) {
        setError(t('passwordsNoMatch'))
        return
      }

      await api.register({
        name: data.name,
        email: data.email,
        phoneCode: data.phoneCode,
        phoneNumber: data.phoneNumber,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2 || undefined,
        consentAccepted: data.consentAccepted,
        state: data.state,
        postcode: data.postcode,
        country: data.country,
        password: data.password,
        inviteToken: inviteToken || undefined,
      })

      setIsSuccess(true)
      router.push('/auth/login?registered=true')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('registrationFailed')
      const isNetwork = message.includes('Network') || message.includes('fetch')
      setIsNetworkError(isNetwork)
      setError(isNetwork ? t('networkError') : message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ocean-50 py-8 relative">
      {/* Language switcher */}
      <div className="absolute top-4 right-4" ref={langRef}>
        <button
          onClick={() => setLangOpen(!langOpen)}
          className="flex items-center gap-1.5 rounded-lg hover:bg-gray-100 transition-colors px-2.5 py-1.5 text-sm font-medium text-gray-600 bg-white shadow-sm border"
          title={t('languageSwitch')}
          aria-label={t('languageSwitch')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016 4a9.728 9.728 0 006.75 2.98C15.072 6.975 16.5 7 18 7c-1.5 0-2.925-.025-4.25-.075A18.022 18.022 0 0118 14c-2.625 0-4.75-.05-6.452-.145M12 21l-2-2m4 0l2-2" />
          </svg>
          {locale === 'en' ? 'EN' : 'BM'}
          <svg
            className={`w-3.5 h-3.5 text-gray-400 transition-transform ${langOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {langOpen && (
          <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            {(['en', 'ms'] as const).map((l) => (
              <a
                key={l}
                href={`/${l}${pathname.replace(/^\/(en|ms)(?=\/|$)/, '') || ''}`}
                onClick={() => setLangOpen(false)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  l === locale
                    ? 'bg-ocean-50 text-ocean-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="flex-1">{l === 'en' ? 'English' : 'Bahasa Melayu'}</span>
                {l === locale && (
                  <svg className="w-4 h-4 text-ocean-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-bold text-ocean-900 mb-6 text-center">
          {t('title')}
        </h1>

        {validatingInvite && (
          <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
            {t('inviteValidating')}
          </div>
        )}

        {inviteEmail && inviteRole && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
            <p className="font-medium">{t('invitedAs', { role: inviteRole.toUpperCase() })}</p>
            <p>{t('emailLabel')}: {inviteEmail}</p>
          </div>
        )}

        {error && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${isNetworkError ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>
            {error}
          </div>
        )}

        {isSuccess && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
            {t('accountCreated')}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              {t('name')} <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              {...register('name', { required: t('nameRequired') })}
              className="input-field"
              placeholder={t('namePlaceholder')}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-1">
              {t('email')} <span className="text-red-500">*</span>
            </label>
            <input
              id="reg-email"
              {...register('email', { required: t('emailRequired') })}
              type="email"
              className="input-field"
              placeholder={t('emailPlaceholder')}
              disabled={!!inviteEmail}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div className="flex gap-3">
            <div className="w-20">
              <label htmlFor="reg-phoneCode" className="block text-sm font-medium text-gray-700 mb-1">
                {t('code')} <span className="text-red-500">*</span>
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
                {t('phone')} <span className="text-red-500">*</span>
              </label>
              <input
                id="reg-phoneNumber"
                {...register('phoneNumber', {
                  required: t('phoneRequired'),
                  minLength: { value: 7, message: t('phoneMin') },
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
              {t('addressLine1')} <span className="text-red-500">*</span>
            </label>
            <input
              id="reg-addressLine1"
              {...register('addressLine1', { required: t('addressLine1Required') })}
              className="input-field"
              placeholder="Street address"
            />
          </div>

          <div>
            <label htmlFor="reg-addressLine2" className="block text-sm font-medium text-gray-700 mb-1">
              {t('addressLine2')} <span className="text-gray-400">{t('addressLine2Optional')}</span>
            </label>
            <input
              id="reg-addressLine2"
              {...register('addressLine2')}
              className="input-field"
              placeholder="Apartment, suite, etc."
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="reg-state" className="block text-sm font-medium text-gray-700 mb-1">
                {t('state')} <span className="text-red-500">*</span>
              </label>
              <input
                id="reg-state"
                {...register('state', { required: t('stateRequired') })}
                className="input-field"
                placeholder={t('state')}
              />
            </div>
            <div className="w-28">
              <label htmlFor="reg-postcode" className="block text-sm font-medium text-gray-700 mb-1">
                {t('postcode')} <span className="text-red-500">*</span>
              </label>
              <input
                id="reg-postcode"
                {...register('postcode', { required: t('postcodeRequired') })}
                className="input-field"
                placeholder={t('postcode')}
              />
            </div>
          </div>

          <div>
            <label htmlFor="reg-country" className="block text-sm font-medium text-gray-700 mb-1">
              {t('country')} <span className="text-red-500">*</span>
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
              {t('password')} <span className="text-red-500">*</span>
            </label>
            <input
              id="reg-password"
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
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
              {t('confirmPassword')} <span className="text-red-500">*</span>
            </label>
            <input
              id="confirm-password"
              {...register('confirmPassword', { required: t('confirmPasswordRequired') })}
              type="password"
              className="input-field"
              placeholder={t('confirmPasswordPlaceholder')}
            />
           {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              id="consentAccepted"
              type="checkbox"
              {...register('consentAccepted', { required: t('consentRequired') })}
              className="w-4 h-4 rounded border-gray-300 text-ocean-600 focus:ring-ocean-500"
            />
            <label htmlFor="consentAccepted" className="text-sm text-gray-700">
              {t('consentPrefix')}{' '}
              <Link href="/terms" className="text-ocean-600 hover:underline">{t('termsOfService')}</Link>
              {' '}
              {t('consentAnd')}
              {' '}
              <Link href="/privacy" className="text-ocean-600 hover:underline">{t('privacyPolicy')}</Link>
              {t('consentSuffix')}
              <span className="text-red-500">*</span>
            </label>
          </div>
          {errors.consentAccepted && (
            <p className="text-sm text-red-600">{errors.consentAccepted.message}</p>
          )}

          <button type="submit" disabled={isSubmitting || validatingInvite} className="btn-primary w-full">
            {isSubmitting ? t('createAccountLoading') : t('createAccount')}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          {t('haveAccount')}{' '}
          <Link href="/auth/login" className="text-ocean-600 hover:underline">
            {t('signIn')}
          </Link>
        </p>
      </div>
    </div>
  )
}
