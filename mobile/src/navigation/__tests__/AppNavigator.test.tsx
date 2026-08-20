import React from 'react'
import { render, screen } from '@testing-library/react'
import { AppNavigator } from '../../navigation/AppNavigator'
import { useAuthStore } from '@/store/authStore'

jest.mock('@/store/authStore', () => ({
  useAuthStore: jest.fn(),
}))

jest.mock('@/navigation/MainTabs', () => ({
  MainTabs: () => 'MainTabs',
}))

jest.mock('@/screens/auth/LoginScreen', () => ({
  LoginScreen: () => 'LoginScreen',
}))

jest.mock('@/screens/auth/RegisterScreen', () => ({
  RegisterScreen: () => 'RegisterScreen',
}))

jest.mock('@/screens/auth/ForgotPasswordScreen', () => ({
  ForgotPasswordScreen: () => 'ForgotPasswordScreen',
}))

jest.mock('@/screens/auth/ResetPasswordScreen', () => ({
  ResetPasswordScreen: () => 'ResetPasswordScreen',
}))

jest.mock('@/screens/common/ConsentScreen', () => ({
  ConsentScreen: () => 'ConsentScreen',
}))

jest.mock('@/screens/species/SpeciesListScreen', () => ({
  SpeciesListScreen: () => 'SpeciesListScreen',
}))

jest.mock('@/screens/species/SpeciesDetailScreen', () => ({
  SpeciesDetailScreen: () => 'SpeciesDetailScreen',
}))

jest.mock('@/screens/species/SpeciesFormScreen', () => ({
  SpeciesFormScreen: () => 'SpeciesFormScreen',
}))

jest.mock('@/screens/observation/ObservationDetailScreen', () => ({
  ObservationDetailScreen: () => 'ObservationDetailScreen',
}))

jest.mock('@/screens/observation/EditObservationScreen', () => ({
  EditObservationScreen: () => 'EditObservationScreen',
}))

jest.mock('@/screens/profile/EditProfileScreen', () => ({
  EditProfileScreen: () => 'EditProfileScreen',
}))

jest.mock('@/screens/observation/AnalysisLoadingScreen', () => ({
  AnalysisLoadingScreen: () => 'AnalysisLoadingScreen',
}))

jest.mock('@/screens/observation/AIReviewScreen', () => ({
  AIReviewScreen: () => 'AIReviewScreen',
}))

jest.mock('@/screens/common/AboutScreen', () => ({
  AboutScreen: () => 'AboutScreen',
}))

jest.mock('@/screens/gamification/LeaderboardScreen', () => ({
  LeaderboardScreen: () => 'LeaderboardScreen',
}))

jest.mock('@/screens/gamification/MissionsScreen', () => ({
  MissionsScreen: () => 'MissionsScreen',
}))

jest.mock('@/screens/gamification/AchievementsScreen', () => ({
  AchievementsScreen: () => 'AchievementsScreen',
}))

jest.mock('@/screens/profile/NotificationSettingsScreen', () => ({
  NotificationSettingsScreen: () => 'NotificationSettingsScreen',
}))

jest.mock('@/screens/profile/ProfileSettingsScreen', () => ({
  ProfileSettingsScreen: () => 'ProfileSettingsScreen',
}))

function mockAuthState(overrides: Record<string, unknown>) {
  const mockState = {
    user: null,
    token: null,
    isAuthenticated: false,
    login: jest.fn(),
    logout: jest.fn(),
    updateUser: jest.fn(),
    setToken: jest.fn(),
    ...overrides,
  }
  ;(useAuthStore as unknown as jest.Mock).mockImplementation((selector) =>
    selector ? selector(mockState) : mockState,
  )
}

describe('AppNavigator', () => {
  describe('unauthenticated user', () => {
    beforeEach(() => {
      mockAuthState({ isAuthenticated: false, user: null, token: null })
    })

    it('renders the stack navigator', () => {
      render(<AppNavigator />)
      expect(screen.getByTestId('stack-navigator')).toBeTruthy()
    })

    it('renders the MainTabs screen', () => {
      render(<AppNavigator />)
      expect(screen.getByText('MainTabs')).toBeTruthy()
    })
  })

  describe('authenticated user', () => {
    beforeEach(() => {
      mockAuthState({
        isAuthenticated: true,
        user: { id: '1', name: 'Test', email: 'test@test.com', role: 'user' as const },
        token: 'test-token',
      })
    })

    it('renders the stack navigator', () => {
      render(<AppNavigator />)
      expect(screen.getByTestId('stack-navigator')).toBeTruthy()
    })

    it('renders the MainTabs screen', () => {
      render(<AppNavigator />)
      expect(screen.getByText('MainTabs')).toBeTruthy()
    })
  })

  describe('deep link token', () => {
    beforeEach(() => {
      mockAuthState({ isAuthenticated: false, user: null, token: null })
    })

    it('renders the stack navigator when a deep link token is present', () => {
      render(<AppNavigator deepLinkToken="reset-token-123" />)
      expect(screen.getByTestId('stack-navigator')).toBeTruthy()
    })
  })
})
