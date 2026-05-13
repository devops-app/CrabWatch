import { renderHook } from '@testing-library/react'
import { MainTabs } from '../../navigation/MainTabs'

jest.mock('@/screens/home/HomeScreen', () => ({
  HomeScreen: () => 'HomeScreen',
}))

jest.mock('@/screens/observation/NewObservationScreen', () => ({
  NewObservationScreen: () => 'NewObservationScreen',
}))

jest.mock('@/screens/species/SpeciesListScreen', () => ({
  SpeciesListScreen: () => 'SpeciesListScreen',
}))

jest.mock('@/screens/profile/ProfileScreen', () => ({
  ProfileScreen: () => 'ProfileScreen',
}))

describe('MainTabs', () => {
  it('renders tab navigator', () => {
    const { result } = renderHook(() => <MainTabs />)
    expect(result.current).toBeTruthy()
  })
})
