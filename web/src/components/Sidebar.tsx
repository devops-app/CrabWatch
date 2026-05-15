'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/authStore'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📋' },
  { href: '/dashboard/capture', label: 'Capture', icon: '📷' },
  { href: '/dashboard/species', label: 'Species', icon: '🦀' },
  { href: '/dashboard/analytics', label: 'Analytics', icon: '📈' },
  { href: '/dashboard/researcher', label: 'Researcher', icon: '🔬', roles: ['researcher', 'admin'] },
  { href: '/dashboard/admin', label: 'Admin', icon: '⚙️', roles: ['admin'] },
  { href: '/dashboard/about', label: 'About', icon: 'ℹ️' },
]

export default function Sidebar({ isOpen, onToggle }: SidebarProps): React.JSX.Element {
  const pathname = usePathname()
  const { user } = useAuthStore()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const visibleItems = navItems.filter(item => {
    if (!item.roles) return true
    return user && item.roles.includes(user.role)
  })

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
            aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {visibleItems.map((item) => {
              const active = isActive(item.href)
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
                    aria-label={!isOpen ? item.label : undefined}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span className="text-xl flex-shrink-0" aria-hidden="true">
                      {item.icon}
                    </span>
                    {isOpen && (
                      <span className="font-medium whitespace-nowrap">
                        {item.label}
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className={`border-t border-ocean-700 p-3 ${isOpen ? '' : 'hidden'}`}>
          <p className="text-xs text-ocean-300 text-center">
            Crab Conservation
          </p>
        </div>
      </aside>
    </>
  )
}
