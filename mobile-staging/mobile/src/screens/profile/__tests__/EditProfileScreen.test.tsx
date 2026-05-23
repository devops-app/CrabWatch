import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { EditProfileScreen } from '../EditProfileScreen'
import { useNavigation } from '@react-navigation/native'
import { api } from '@/services/api'
import { Alert } from 'react-native'

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: {
      name: 'Test User',
      email: 'test@test.com',
      role: 'user',
      avatar: null,
    },
    token: 'mock-token',
    isAuthenticated: true,
    logout: jest.fn(),
    updateUser: jest.fn(),
  })),
}))

jest.mock('@/services/api', () => ({
  api: {
    getDashboardStats: jest.fn(),
    listSpecies: jest.fn(),
    getSpecies: jest.fn(),
    createObservation: jest.fn(),
    listObservations: jest.fn(),
    updateProfile: jest.fn(),
  },
}))

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}))

describe('EditProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useNavigation as jest.Mock).mockReturnValue({
      navigate: jest.fn(),
      goBack: jest.fn(),
    })
    ;(api.updateProfile as jest.Mock).mockResolvedValue({
      name: 'Updated Name',
      email: 'test@test.com',
      role: 'user',
      avatar: null,
    })
  })

  it('renders avatar section with hint text', () => {
    const { getByText } = render(<EditProfileScreen />)
    expect(getByText('Tap to change photo')).toBeTruthy()
  })

  it('renders display name input', () => {
    const { getByPlaceholderText } = render(<EditProfileScreen />)
    expect(getByPlaceholderText('Your name')).toBeTruthy()
  })

  it('renders email info card', () => {
    const { getByText } = render(<EditProfileScreen />)
    expect(getByText('Email')).toBeTruthy()
    expect(getByText('test@test.com')).toBeTruthy()
    expect(getByText('Email cannot be changed')).toBeTruthy()
  })

  it('renders save and cancel buttons', () => {
    const { getByText } = render(<EditProfileScreen />)
    expect(getByText('Save Changes')).toBeTruthy()
    expect(getByText('Cancel')).toBeTruthy()
  })

  it('calls goBack when cancel is pressed', () => {
    const goBackMock = jest.fn()
    ;(useNavigation as jest.Mock).mockReturnValue({
      navigate: jest.fn(),
      goBack: goBackMock,
    })
    const { getByText } = render(<EditProfileScreen />)
    fireEvent.click(getByText('Cancel'))
    expect(goBackMock).toHaveBeenCalled()
  })

  it('calls api.updateProfile on save', async () => {
    const { getByPlaceholderText, getByText } = render(<EditProfileScreen />)
    fireEvent.change(getByPlaceholderText('Your name'), {
      target: { value: 'Updated Name' },
    })
    fireEvent.click(getByText('Save Changes'))

    await waitFor(() => {
      expect(api.updateProfile).toHaveBeenCalled()
    })
  })

  it('shows success alert on profile update', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn())
    const { getByPlaceholderText, getByText } = render(<EditProfileScreen />)
    fireEvent.change(getByPlaceholderText('Your name'), {
      target: { value: 'Updated Name' },
    })
    fireEvent.click(getByText('Save Changes'))

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Success', 'Profile updated successfully')
    })
  })

  it('shows error alert on profile update failure', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn())
    ;(api.updateProfile as jest.Mock).mockRejectedValue(new Error('Network error'))
    const { getByPlaceholderText, getByText } = render(<EditProfileScreen />)
    fireEvent.change(getByPlaceholderText('Your name'), {
      target: { value: 'Updated Name' },
    })
    fireEvent.click(getByText('Save Changes'))

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', expect.any(String))
    })
  })
})
