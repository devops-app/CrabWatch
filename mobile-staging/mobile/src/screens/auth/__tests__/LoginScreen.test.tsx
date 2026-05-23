import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { LoginScreen } from '../LoginScreen'
import { authService } from '@/services/authService'
import { Alert } from 'react-native'

jest.mock('@/services/authService', () => ({
  authService: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    getToken: jest.fn(() => null),
  },
}))

jest.mock('@/store/authStore', () => ({
  useAuthStore: jest.fn((selector) =>
    selector({
      user: null,
      token: null,
      isAuthenticated: false,
      login: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn(),
      setToken: jest.fn(),
    })
  ),
}))

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(authService.login as jest.Mock).mockResolvedValue({})
  })

  it('renders title and subtitle', () => {
    const { getByText } = render(<LoginScreen />)
    expect(getByText('CrabWatch')).toBeTruthy()
    expect(getByText(/Citizen Science/)).toBeTruthy()
  })

  it('renders email and password inputs', () => {
    const { getByPlaceholderText } = render(<LoginScreen />)
    expect(getByPlaceholderText('your@email.com')).toBeTruthy()
    expect(getByPlaceholderText('Enter your password')).toBeTruthy()
  })

  it('renders sign in button', () => {
    const { getByText } = render(<LoginScreen />)
    expect(getByText('Sign In')).toBeTruthy()
  })

  it('renders register navigation link', () => {
    const { getByText } = render(<LoginScreen />)
    expect(getByText('Create one')).toBeTruthy()
  })

  it('renders footer text', () => {
    const { getByText } = render(<LoginScreen />)
    expect(getByText(/Don't have an account/)).toBeTruthy()
  })

  it('calls authService.login on submit', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />)
    fireEvent.change(getByPlaceholderText('your@email.com'), {
      target: { value: 'test@test.com' },
    })
    fireEvent.change(getByPlaceholderText('Enter your password'), {
      target: { value: 'password123' },
    })
    fireEvent.click(getByText('Sign In'))

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith('test@test.com', 'password123')
    })
  })

  it('shows error alert on login failure', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn())
    ;(authService.login as jest.Mock).mockRejectedValue(new Error('Invalid credentials'))

    const { getByPlaceholderText, getByText } = render(<LoginScreen />)
    fireEvent.change(getByPlaceholderText('your@email.com'), {
      target: { value: 'test@test.com' },
    })
    fireEvent.change(getByPlaceholderText('Enter your password'), {
      target: { value: 'wrong' },
    })
    fireEvent.click(getByText('Sign In'))

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Login Failed', expect.any(String))
    })
  })
})
