import { renderHook } from '@testing-library/react'
import { AuthStack } from '../../navigation/AuthStack'

jest.mock('@/screens/auth/LoginScreen', () => ({
  LoginScreen: () => 'LoginScreen',
}))

jest.mock('@/screens/auth/RegisterScreen', () => ({
  RegisterScreen: () => 'RegisterScreen',
}))

describe('AuthStack', () => {
  it('renders stack navigator', () => {
    const { result } = renderHook(() => <AuthStack />)
    expect(result.current).toBeTruthy()
  })
})
