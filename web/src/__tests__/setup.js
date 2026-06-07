/* eslint-disable */
const React = require('react')
const IdentityObjProxy = require('identity-obj-proxy')

require('@testing-library/jest-dom')
global.IdentityObjProxy = IdentityObjProxy

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/dashboard',
}))

// Mock i18n navigation wrapper used by app components
jest.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }) => React.createElement('a', props, children),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/dashboard',
}))

// Mock next-intl hooks used by client components
jest.mock('next-intl', () => ({
  useTranslations: () => (key, values) => {
    if (values && typeof values === 'object') {
      return String(key)
    }
    return String(key)
  },
  useLocale: () => 'en',
  useFormatter: () => ({
    dateTime: () => '',
    number: () => '',
    relativeTime: () => '',
  }),
}))

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ children, ...props }) {
    return React.createElement('a', props, children)
  }
})

// Mock fetch
global.fetch = jest.fn()

// Mock Notification API (not available in jsdom)
global.Notification = {
  permission: 'default',
  requestPermission: jest.fn().mockResolvedValue('default'),
}
