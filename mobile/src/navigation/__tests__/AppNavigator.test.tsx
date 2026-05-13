import React from 'react'
import { render } from '@testing-library/react'
import { AppNavigator } from '../../navigation/AppNavigator'
import { useAuthStore } from '@/store/authStore'

jest.mock('@/store/authStore', () => ({
  useAuthStore: jest.fn(),
}))

jest.mock('@/navigation/AuthStack', () => ({
  AuthStack: () => 'AuthStack',
}))

jest.mock('@/navigation/MainTabs', () => ({
  MainTabs: () => 'MainTabs',
}))

jest.mock('@/screens/species/SpeciesDetailScreen', () => ({
  SpeciesDetailScreen: () => 'SpeciesDetailScreen',
}))

jest.mock('@/screens/observation/ObservationDetailScreen', () => ({
  ObservationDetailScreen: () => 'ObservationDetailScreen',
}))

jest.mock('@/screens/profile/EditProfileScreen', () => ({
  EditProfileScreen: () => 'EditProfileScreen',
}))

describe('AppNavigator', () => {
  describe('unauthenticated user', () => {
    beforeEach(() => {
      (useAuthStore as unknown as jest.Mock).mockImplementation((selector) => {
        const mockState = {
          user: null,
          token: null,
          isAuthenticated: false,
          login: jest.fn(),
          logout: jest.fn(),
          updateUser: jest.fn(),
          setToken: jest.fn(),
        }
        return selector ? selector(mockState) : mockState
      })
    })

    it('renders AuthStack when not authenticated', () => {
      const { container } = render(<AppNavigator />)
      expect(container.textContent).toContain('AuthStack')
    })
  })

  describe('authenticated user', () => {
    beforeEach(() => {
      (useAuthStore as unknown as jest.Mock).mockImplementation((selector) => {
        const mockState = {
          user: { id: '1', name: 'Test', email: 'test@test.com', role: 'user' as const },
          token: 'test-token',
          isAuthenticated: true,
          login: jest.fn(),
          logout: jest.fn(),
          updateUser: jest.fn(),
          setToken: jest.fn(),
        }
        return selector ? selector(mockState) : mockState
      })
    })

    it('renders Stack.Navigator with MainTabs when authenticated', () => {
      const { container } = render(<AppNavigator />)
      expect(container.textContent).toContain('MainTabs')
    })
  })
})
