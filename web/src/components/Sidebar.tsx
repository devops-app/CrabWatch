'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { Link, usePathname } from '@/i18n/navigation'
import { useAuthStore } from '@/lib/authStore'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

interface NavItem {
  href: string
  labelKey: string
  icon: string
  roles?: string[]
}

const primaryNavItems: NavItem[] = [
  { href: '/dashboard', labelKey: 'dashboard', icon: '📋' },
  { href: '/dashboard/capture', labelKey: 'capture', icon: '📷' },
  { href: '/dashboard/species', labelKey: 'species', icon: '🦀' },
  { href: '/dashboard/analytics', labelKey: 'analytics', icon: '📈' },
]

const communityHubItems: NavItem[] = [
  { href: '/dashboard/leaderboard', labelKey: 'leaderboard', icon: '🏆' },
  { href: '/dashboard/missions', labelKey: 'missions', icon: '🎯' },
  { href: '/dashboard/achievements', labelKey: 'achievements', icon: '🎖️' },
  { href: '/dashboard/community', labelKey: 'community', icon: '👥' },
]

const secondaryNavItems: NavItem[] = [
  { href: '/dashboard/researcher', labelKey: 'researcher', icon: '🔬', roles: ['researcher', 'admin'] },
  { href: '/dashboard/admin', labelKey: 'admin', icon: '⚙️', roles: ['admin'] },
  { href: '/dashboard/about', labelKey: 'about', icon: 'ℹ️' },
]

export default function Sidebar({ isOpen, onToggle }: SidebarProps): React.JSX.Element {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const { user } = useAuthStore()
  const isCommunitySectionActive = communityHubItems.some(item => pathname.startsWith(item.href))
  const [isCommunityHubOpen, setIsCommunityHubOpen] = useState(isCommunitySectionActive)

  useEffect(() => {
    if (isCommunitySectionActive) {
      setIsCommunityHubOpen(true)
    }
  }, [isCommunitySectionActive])

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const canViewItem = (item: NavItem) => {
    if (!item.roles) return true
    return Boolean(user && item.roles.includes(user.role))
  }

  const visiblePrimaryNavItems = primaryNavItems
  const visibleSecondaryNavItems = secondaryNavItems.filter(canViewItem)

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href)
    const label = t(item.labelKey)

    return (
      <li key={item.href}>
        <Link
          href={item.href}
          onClick={() => {
            if (window.innerWidth < 1024) onToggle()
          }}
          className={`flex items-center gap-3 rounded-lg transition-colors ${
            isOpen ? 'px-3 py-2.5' : 'justify-center p-2.5'
          } ${
            active
              ? 'bg-ocean-600 text-white'
              : 'text-ocean-200 hover:bg-ocean-700 hover:text-white'
          }`}
          aria-label={!isOpen ? label : undefined}
          aria-current={active ? 'page' : undefined}
        >
          <span className="text-xl flex-shrink-0" aria-hidden="true">
            {item.icon}
          </span>
          {isOpen && (
            <span className="font-medium whitespace-nowrap">
              {label}
            </span>
          )}
        </Link>
      </li>
    )
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-40 h-full bg-gradient-to-b from-ocean-800 to-ocean-900 text-white transition-all duration-300 flex flex-col
          ${isOpen ? 'w-64' : 'w-0 lg:w-20'}`}
      >
        <div className={`flex items-center h-16 border-b border-ocean-700 ${isOpen ? 'px-4 justify-between' : 'justify-center px-3'}`}>
          {isOpen ? (
            <span className="text-xl font-bold text-white">CrabWatch</span>
          ) : (
            <span className="text-xl font-bold text-white">CW</span>
          )}
          <button
            onClick={onToggle}
            className="lg:hidden p-1 rounded hover:bg-ocean-700"
            aria-label={isOpen ? t('closeSidebar') : t('openSidebar')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {visiblePrimaryNavItems.map(renderNavItem)}

            <li>
              {isOpen ? (
                <button
                  type="button"
                  onClick={() => setIsCommunityHubOpen(prev => !prev)}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                    isCommunitySectionActive
                      ? 'bg-ocean-600 text-white'
                      : 'text-ocean-200 hover:bg-ocean-700 hover:text-white'
                  }`}
                  aria-expanded={isCommunityHubOpen}
                >
                  <span className="text-xl flex-shrink-0" aria-hidden="true">🌊</span>
                  <span className="font-medium whitespace-nowrap flex-1 text-left">{t('communityHub')}</span>
                  <span aria-hidden="true" className="text-sm">{isCommunityHubOpen ? '▾' : '▸'}</span>
                </button>
              ) : (
                <Link
                  href="/dashboard/community"
                  onClick={() => {
                    if (window.innerWidth < 1024) onToggle()
                  }}
                  className={`flex items-center justify-center p-2.5 rounded-lg transition-colors ${
                    isCommunitySectionActive
                      ? 'bg-ocean-600 text-white'
                      : 'text-ocean-200 hover:bg-ocean-700 hover:text-white'
                  }`}
                  aria-label={t('communityHub')}
                  aria-current={isCommunitySectionActive ? 'page' : undefined}
                >
                  <span className="text-xl flex-shrink-0" aria-hidden="true">🌊</span>
                </Link>
              )}
            </li>

            {isOpen && isCommunityHubOpen && communityHubItems.map((item) => {
              const active = isActive(item.href)
              const label = t(item.labelKey)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => {
                      if (window.innerWidth < 1024) onToggle()
                    }}
                    className={`flex items-center gap-3 rounded-lg ml-2 px-3 py-2 text-sm transition-colors ${
                      active
                        ? 'bg-ocean-500/80 text-white'
                        : 'text-ocean-200 hover:bg-ocean-700 hover:text-white'
                    }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span className="text-base flex-shrink-0" aria-hidden="true">{item.icon}</span>
                    <span className="font-medium whitespace-nowrap">{label}</span>
                  </Link>
                </li>
              )
            })}

            {visibleSecondaryNavItems.map(renderNavItem)}
          </ul>
        </nav>

        <div className={`border-t border-ocean-700 p-3 ${isOpen ? '' : 'hidden'}`}>
          <p className="text-xs text-ocean-300 text-center">
            {t('crabConservation')}
          </p>
        </div>
      </aside>
    </>
  )
}
