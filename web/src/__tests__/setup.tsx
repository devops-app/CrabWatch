import '@testing-library/jest-dom'

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
  return function MockLink({ children, ...props }: React.ComponentProps<'a'>) {
    return <a {...props}>{children}</a>
  }
})

// Mock zustand
jest.mock('@/lib/authStore', () => ({
  useAuthStore: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

// Mock Notification API (not available in jsdom)
global.Notification = class {
  static permission = 'default'
  static requestPermission = jest.fn().mockResolvedValue('default')
} as unknown as typeof Notification
