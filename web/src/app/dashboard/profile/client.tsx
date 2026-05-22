'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { api } from '@/lib/api'
import { COUNTRIES } from '@crabwatch/shared'
import { useAuthStore } from '@/lib/authStore'
import type { User } from '@crabwatch/shared'

interface FormValues {
  name: string
  phoneCode: string
  phoneNumber: string
  addressLine1: string
  addressLine2: string
  addressLine3: string
  state: string
  postcode: string
  country: string
}

interface MyStats {
  totalXP: number
  level: number
  title: string
  currentStreak: number
  longestStreak: number
  approvedCount: number
  totalSubmissions: number
  xpToNextLevel: number
}

interface ProfileClientProps {
  initialUser: User | null
  initialStats: MyStats | null
}

export function ProfileClient({
  initialUser,
  initialStats,
}: ProfileClientProps): React.JSX.Element {
  const router = useRouter()
  const { updateUser, logout } = useAuthStore()
  const [user, setUser] = useState<User | null>(initialUser)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialUser?.avatar || null)
  const [myStats, setMyStats] = useState<MyStats | null>(initialStats)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [loading, setLoading] = useState(!initialUser)

  useEffect(() => {
    if (initialUser) return
    let cancelled = false
    const loadData = async () => {
      try {
        const [u, s] = await Promise.all([
          api.getProfile(),
          api.getMyStats().catch(() => null),
        ])
        if (!cancelled) {
          setUser(u)
          updateUser(u)
          setMyStats(s?.stats ?? null)
          setValue('name', u.name)
          setValue('phoneCode', u.phoneCode || '+60')
          setValue('phoneNumber', u.phoneNumber || '')
          setValue('addressLine1', u.addressLine1 || '')
          setValue('addressLine2', u.addressLine2 || '')
          setValue('addressLine3', u.addressLine3 || '')
          setValue('state', u.state || '')
          setValue('postcode', u.postcode || '')
          setValue('country', u.country || 'MY')
          if (u.avatar) setAvatarUrl(u.avatar)
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          logout()
          router.replace('/auth/login')
        }
      }
    }
    void loadData()
    return () => { cancelled = true }
  }, [])

  const phoneCodes = useMemo(
    () => Array.from(new Set(COUNTRIES.map((c) => c.phoneCode))),
    []
  )

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<FormValues>({
    defaultValues: {
      name: initialUser?.name || '',
      phoneCode: initialUser?.phoneCode || '+60',
      phoneNumber: initialUser?.phoneNumber || '',
      addressLine1: initialUser?.addressLine1 || '',
      addressLine2: initialUser?.addressLine2 || '',
      addressLine3: initialUser?.addressLine3 || '',
      state: initialUser?.state || '',
      postcode: initialUser?.postcode || '',
      country: initialUser?.country || 'MY',
    },
  })

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setAvatarUrl(url)
    }
  }

  const onSubmit = async (data: FormValues) => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const updated = await api.updateProfile({
        name: data.name,
        phoneCode: data.phoneCode || null,
        phoneNumber: data.phoneNumber || null,
        addressLine1: data.addressLine1 || null,
        addressLine2: data.addressLine2 || null,
        addressLine3: data.addressLine3 || null,
        state: data.state || null,
        postcode: data.postcode || null,
        country: data.country || null,
        avatar: avatarUrl,
      })
      setUser(updated)
      updateUser(updated)
      setSuccess('Profile updated successfully')
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    setError('')
    setSuccess('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all password fields')
      return
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match')
      return
    }

    setPasswordSaving(true)
    try {
      await api.changePassword({ currentPassword, newPassword })
      try {
        await api.logout()
      } catch {
        // ignore server logout errors
      }
      logout()
      router.replace('/auth/login?reason=password-changed')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setPasswordSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-ocean-200 border-t-ocean-600 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="card max-w-2xl text-center py-12">
        <p className="text-gray-500">Unable to load profile. Please log in again.</p>
      </div>
    )
  }

  return (
    <div className="card max-w-2xl">
      <h1 className="text-2xl font-bold text-ocean-900 mb-6">Edit Profile</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center pb-6 border-b border-gray-200">
          <div className="relative group">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-2 border-ocean-200"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-ocean-600 flex items-center justify-center text-white text-3xl font-bold">
                {user?.name?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <label
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 w-8 h-8 bg-ocean-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-ocean-700 transition-colors"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">Tap camera to change photo</p>
        </div>

        {/* Engagement Stats */}
        {myStats && (
          <div className="bg-gradient-to-r from-ocean-50 to-amber-50 rounded-lg p-4 border border-ocean-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-ocean-600">Lv.{myStats.level}</div>
                <div className="text-xs text-gray-500">{myStats.title}</div>
                <div className="text-xs text-gray-400 mt-1">{myStats.totalXP.toLocaleString()} XP</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-500">🔥 {myStats.currentStreak}</div>
                <div className="text-xs text-gray-500">Day Streak</div>
                <div className="text-xs text-gray-400 mt-1">Best: {myStats.longestStreak}d</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{myStats.approvedCount}</div>
                <div className="text-xs text-gray-500">Approved</div>
                <div className="text-xs text-gray-400 mt-1">{myStats.totalSubmissions} total</div>
              </div>
            </div>
          </div>
        )}

        {/* Email (read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="text"
            value={user?.email || ''}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
          />
          <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
          <input
            {...register('name', { required: 'Name is required', minLength: { value: 1, message: 'Name is required' } })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-400"
            placeholder="Your name"
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
        </div>

        {/* Phone */}
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country Code</label>
            <select
              {...register('phoneCode')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-400 bg-white"
            >
              {phoneCodes.map((phoneCode) => (
                <option key={phoneCode} value={phoneCode}>{phoneCode}</option>
              ))}
            </select>
          </div>
          <div className="col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              {...register('phoneNumber')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-400"
              placeholder="123456789"
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
          <input
            {...register('addressLine1')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-400"
            placeholder="Street address"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
          <input
            {...register('addressLine2')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-400"
            placeholder="Apartment, suite, etc."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 3</label>
          <input
            {...register('addressLine3')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-400"
            placeholder="Additional address info"
          />
        </div>

        {/* State & Postcode */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <input
              {...register('state')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-400"
              placeholder="State"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
            <input
              {...register('postcode')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-400"
              placeholder="Postcode"
            />
          </div>
        </div>

        {/* Country */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
          <select
            {...register('country')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-400 bg-white"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>

        <div className="pt-4 border-t border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold text-ocean-900">Change Password</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-400"
              placeholder="Current password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-400"
              placeholder="New password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-400"
              placeholder="Confirm new password"
            />
          </div>
          <button
            type="button"
            onClick={handleChangePassword}
            disabled={passwordSaving}
            className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
          >
            {passwordSaving ? 'Updating Password...' : 'Update Password'}
          </button>
        </div>

        <div className="pt-4 border-t border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold text-red-700">Danger Zone</h2>
          <p className="text-sm text-gray-600">
            Deleting your account will remove all your data. You have 30 days to restore it by logging in again.
          </p>
          <button
            type="button"
            onClick={async () => {
              if (window.confirm('Are you sure you want to delete your account? This action has a 30-day retention period.')) {
                setDeletingAccount(true)
                try {
                  await api.deleteMyAccount()
                  try {
                    await api.logout()
                  } catch { /* ignore */ }
                  logout()
                  router.replace('/auth/login?reason=account-deleted')
                } catch (err: unknown) {
                  alert(err instanceof Error ? err.message : 'Failed to delete account')
                } finally {
                  setDeletingAccount(false)
                }
              }
            }}
            disabled={deletingAccount}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {deletingAccount ? 'Deleting...' : 'Delete Account'}
          </button>
        </div>
      </form>
    </div>
  )
}
