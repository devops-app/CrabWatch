import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { RegisterScreen } from '../RegisterScreen'
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

describe('RegisterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(authService.register as jest.Mock).mockResolvedValue({})
  })

  it('renders title and subtitle', () => {
    const { getByText } = render(<RegisterScreen />)
    expect(getByText('Join CrabWatch')).toBeTruthy()
    expect(getByText(/Help conserve/)).toBeTruthy()
  })

  it('renders all four input fields', () => {
    const { getByPlaceholderText } = render(<RegisterScreen />)
    expect(getByPlaceholderText('Your name')).toBeTruthy()
    expect(getByPlaceholderText('your@email.com')).toBeTruthy()
    expect(getByPlaceholderText('At least 8 characters')).toBeTruthy()
    expect(getByPlaceholderText('Re-enter your password')).toBeTruthy()
  })

  it('renders create account button', () => {
    const { getByText } = render(<RegisterScreen />)
    expect(getByText('Create Account')).toBeTruthy()
  })

  it('renders login navigation link', () => {
    const { getByText } = render(<RegisterScreen />)
    expect(getByText('Sign in')).toBeTruthy()
    expect(getByText(/Already have an account/)).toBeTruthy()
  })

  it('calls authService.register on submit', async () => {
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />)
    fireEvent.change(getByPlaceholderText('Your name'), {
      target: { value: 'Test User' },
    })
    fireEvent.change(getByPlaceholderText('your@email.com'), {
      target: { value: 'test@test.com' },
    })
    fireEvent.change(getByPlaceholderText('At least 8 characters'), {
      target: { value: 'password123' },
    })
    fireEvent.change(getByPlaceholderText('Re-enter your password'), {
      target: { value: 'password123' },
    })
    fireEvent.click(getByText('Create Account'))

    await waitFor(() => {
      expect(authService.register).toHaveBeenCalledWith(
        'Test User',
        'test@test.com',
        'password123'
      )
    })
  })

  it('shows error alert on registration failure', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn())
    ;(authService.register as jest.Mock).mockRejectedValue(new Error('Email already in use'))

    const { getByPlaceholderText, getByText } = render(<RegisterScreen />)
    fireEvent.change(getByPlaceholderText('Your name'), {
      target: { value: 'Test User' },
    })
    fireEvent.change(getByPlaceholderText('your@email.com'), {
      target: { value: 'test@test.com' },
    })
    fireEvent.change(getByPlaceholderText('At least 8 characters'), {
      target: { value: 'password123' },
    })
    fireEvent.change(getByPlaceholderText('Re-enter your password'), {
      target: { value: 'password123' },
    })
    fireEvent.click(getByText('Create Account'))

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Registration Failed', expect.any(String))
    })
  })
})
