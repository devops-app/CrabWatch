'use client'

import Link from 'next/link'
import { useAuthStore } from '@/lib/authStore'
import { api } from '@/lib/api'
import { useNotifications } from '@/hooks/useNotifications'

interface HeaderProps {
  onSidebarToggle: () => void
}

export default function Header({ onSidebarToggle }: HeaderProps): React.JSX.Element {
  const { user, logout } = useAuthStore()
  const { isSupported, permission, isRegistered, requestPermission, registerToken } = useNotifications()

  const handleNotificationClick = async () => {
    if (permission === 'default') {
      const granted = await requestPermission()
      if (granted) {
        await registerToken()
      }
    } else if (permission === 'granted' && !isRegistered) {
      await registerToken()
    }
  }

  const handleLogout = async () => {
    try {
      await api.logout()
    } catch {
      // ignore server logout errors
    }
    logout()
  }

  return (
    <header className="sticky top-0 z-20 h-16 bg-white shadow-sm border-b flex items-center px-4 gap-4">
      <button
        onClick={onSidebarToggle}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <svg className="w-5 h-5 text-ocean-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <Link href="/" className="text-xl font-bold text-ocean-700">
        CrabWatch
      </Link>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        {isSupported && permission !== 'granted' && (
          <button
            onClick={handleNotificationClick}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-amber-600"
            title="Enable notifications"
            aria-label="Enable push notifications"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
        )}
        {isRegistered && (
          <div className="p-2 rounded-lg bg-green-50 text-green-600" title="Notifications enabled">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
        )}
        <div className="w-8 h-8 rounded-full bg-ocean-100 flex items-center justify-center text-ocean-700 font-semibold text-sm">
          {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-medium text-gray-800 leading-tight">
            {user?.name ?? 'User'}
          </p>
          <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="ml-2 text-sm text-gray-500 hover:text-red-600 transition-colors"
          title="Logout"
          aria-label="Logout"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3 3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  )
}
