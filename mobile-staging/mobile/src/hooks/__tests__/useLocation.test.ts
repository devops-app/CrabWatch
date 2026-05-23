import { renderHook, act, waitFor } from '@testing-library/react'
import { useLocation } from '../../hooks/useLocation'
import { locationService } from '@/services/locationService'

jest.mock('@/services/locationService', () => ({
  locationService: {
    getCurrentLocation: jest.fn(),
    requestLocationPermission: jest.fn(),
    watchLocation: jest.fn(),
  },
}))

describe('useLocation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('initial state', () => {
    it('returns null location', async () => {
      (locationService.getCurrentLocation as jest.Mock).mockResolvedValue({
        latitude: 3.139,
        longitude: 101.687,
        accuracy: 5,
        altitude: 10,
      })

      const { result } = renderHook(() => useLocation())
      expect(result.current.location).toBeNull()
    })

    it('returns loading as true initially', async () => {
      (locationService.getCurrentLocation as jest.Mock).mockResolvedValue({
        latitude: 3.139,
        longitude: 101.687,
        accuracy: 5,
        altitude: 10,
      })

      const { result } = renderHook(() => useLocation())
      expect(result.current.loading).toBe(true)
    })

    it('returns error as null initially', async () => {
      (locationService.getCurrentLocation as jest.Mock).mockResolvedValue({
        latitude: 3.139,
        longitude: 101.687,
        accuracy: 5,
        altitude: 10,
      })

      const { result } = renderHook(() => useLocation())
      expect(result.current.error).toBeNull()
    })

    it('returns hasPermission as false initially', async () => {
      (locationService.getCurrentLocation as jest.Mock).mockResolvedValue({
        latitude: 3.139,
        longitude: 101.687,
        accuracy: 5,
        altitude: 10,
      })

      const { result } = renderHook(() => useLocation())
      expect(result.current.hasPermission).toBe(false)
    })
  })

  describe('auto-fetch on mount', () => {
    it('fetches location on mount', async () => {
      const mockCoords = {
        latitude: 3.139,
        longitude: 101.687,
        accuracy: 5,
        altitude: 10,
      }
      ;(locationService.getCurrentLocation as jest.Mock).mockResolvedValue(mockCoords)

      const { result } = renderHook(() => useLocation())

      await waitFor(() => {
        expect(result.current.location).toEqual(mockCoords)
      })

      expect(result.current.location).toEqual(mockCoords)
      expect(result.current.loading).toBe(false)
      expect(result.current.hasPermission).toBe(true)
    })

    it('sets error when location fetch fails', async () => {
      (locationService.getCurrentLocation as jest.Mock).mockRejectedValue(
        new Error('Permission denied')
      )

      const { result } = renderHook(() => useLocation())

      await waitFor(() => {
        expect(result.current.error).toBe('Permission denied')
      })

      expect(result.current.loading).toBe(false)
      expect(result.current.hasPermission).toBe(false)
      expect(result.current.location).toBeNull()
    })

    it('handles non-Error throwables', async () => {
      (locationService.getCurrentLocation as jest.Mock).mockRejectedValue('Unknown error')

      const { result } = renderHook(() => useLocation())

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to get location')
      })
    })
  })

  describe('refresh', () => {
    it('calls fetchLocation when refresh is called', async () => {
      (locationService.getCurrentLocation as jest.Mock)
        .mockResolvedValue({
          latitude: 3.139,
          longitude: 101.687,
          accuracy: 5,
          altitude: 10,
        })
        .mockResolvedValue({
          latitude: 4.0,
          longitude: 102.0,
          accuracy: 3,
          altitude: 20,
        })

      const { result } = renderHook(() => useLocation())

      await waitFor(() => {
        expect(result.current.location).not.toBeNull()
      })

      await act(async () => {
        await result.current.refresh()
      })

      expect(result.current.location).toEqual({
        latitude: 4.0,
        longitude: 102.0,
        accuracy: 3,
        altitude: 20,
      })
    })

    it('sets loading during refresh', async () => {
      let callCount = 0
      const deferredResolve = { call: null as ((v: unknown) => void) | null }

      ;(locationService.getCurrentLocation as jest.Mock)
        .mockImplementation(() => {
          callCount++
          if (callCount === 1) {
            return Promise.resolve({
              latitude: 3.139,
              longitude: 101.687,
              accuracy: 5,
              altitude: 10,
            })
          }
          return new Promise((resolve) => {
            deferredResolve.call = resolve
          })
        })

      const { result } = renderHook(() => useLocation())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.refresh()
      })
      expect(result.current.loading).toBe(true)

      await act(async () => {
        deferredResolve.call!({
          latitude: 4.0,
          longitude: 102.0,
          accuracy: 3,
          altitude: 20,
        })
      })

      expect(result.current.loading).toBe(false)
      expect(result.current.location).toEqual({
        latitude: 4.0,
        longitude: 102.0,
        accuracy: 3,
        altitude: 20,
      })
    })
  })

  describe('requestPermission', () => {
    it('calls locationService.requestLocationPermission', async () => {
      (locationService.getCurrentLocation as jest.Mock).mockResolvedValue({
        latitude: 3.139,
        longitude: 101.687,
        accuracy: 5,
        altitude: 10,
      })
      ;(locationService.requestLocationPermission as jest.Mock).mockResolvedValue(true)

      const { result } = renderHook(() => useLocation())

      let granted: boolean = false
      await act(async () => {
        granted = await result.current.requestPermission()
      })

      expect(locationService.requestLocationPermission).toHaveBeenCalled()
      expect(granted).toBe(true)
    })

    it('updates hasPermission based on result', async () => {
      (locationService.getCurrentLocation as jest.Mock).mockRejectedValue(
        new Error('No permission')
      )
      ;(locationService.requestLocationPermission as jest.Mock).mockResolvedValue(true)

      const { result } = renderHook(() => useLocation())

      await waitFor(() => {
        expect(result.current.hasPermission).toBe(false)
      })

      await act(async () => {
        await result.current.requestPermission()
      })

      expect(result.current.hasPermission).toBe(true)
    })

    it('returns false when permission denied', async () => {
      (locationService.getCurrentLocation as jest.Mock).mockResolvedValue({
        latitude: 3.139,
        longitude: 101.687,
        accuracy: 5,
        altitude: 10,
      })
      ;(locationService.requestLocationPermission as jest.Mock).mockResolvedValue(false)

      const { result } = renderHook(() => useLocation())

      let granted: boolean = false
      await act(async () => {
        granted = await result.current.requestPermission()
      })

      expect(granted).toBe(false)
      expect(result.current.hasPermission).toBe(false)
    })
  })
})
