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