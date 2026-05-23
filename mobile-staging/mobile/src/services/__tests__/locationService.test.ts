import { locationService } from '../locationService'
import * as Location from 'expo-location'

jest.mock('expo-location')

const mockLocation = Location as jest.Mocked<typeof Location & { requestForegroundPermissionsAsync: jest.Mock }>

beforeEach(() => {
  jest.clearAllMocks()
})

describe('locationService', () => {
  describe('requestLocationPermission', () => {
    it('returns true when permission is granted', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' })

      const result = await locationService.requestLocationPermission()
      expect(result).toBe(true)
    })

    it('returns false when permission is denied', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' })

      const result = await locationService.requestLocationPermission()
      expect(result).toBe(false)
    })

    it('returns false when permission is undetermined', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'undetermined' })

      const result = await locationService.requestLocationPermission()
      expect(result).toBe(false)
    })
  })

  describe('getCurrentLocation', () => {
    it('returns location coordinates when permission granted', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' })
      mockLocation.getCurrentPositionAsync.mockResolvedValue({
        timestamp: Date.now(),
        coords: {
          latitude: 3.139,
          longitude: 101.6869,
          accuracy: 5,
          altitude: 10,
          altitudeAccuracy: 1,
          speed: 0,
          heading: 0,
        },
      })

      const result = await locationService.getCurrentLocation()

      expect(result).toEqual({
        latitude: 3.139,
        longitude: 101.6869,
        accuracy: 5,
        altitude: 10,
      })
    })

    it('throws error when permission denied', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' })

      await expect(locationService.getCurrentLocation()).rejects.toThrow('Location permission not granted')
    })

    it('handles null altitude', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' })
      mockLocation.getCurrentPositionAsync.mockResolvedValue({
        timestamp: Date.now(),
        coords: {
          latitude: 3.139,
          longitude: 101.6869,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: 1,
          speed: 0,
          heading: 0,
        },
      })

      const result = await locationService.getCurrentLocation()

      expect(result.altitude).toBeNull()
    })

    it('handles undefined accuracy', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' })
      mockLocation.getCurrentPositionAsync.mockResolvedValue({
        timestamp: Date.now(),
        coords: {
          latitude: 3.139,
          longitude: 101.6869,
          accuracy: 0,
          altitude: null,
          altitudeAccuracy: 1,
          speed: 0,
          heading: 0,
        },
      })

      const result = await locationService.getCurrentLocation()

      expect(result.accuracy).toBe(0)
    })
  })

  describe('watchLocation', () => {
    it('starts watching location with default interval', async () => {
      const mockSubscription = { remove: jest.fn() }
      const mockCallback = jest.fn()
      let savedCallback: ((loc: unknown) => void) | null = null

      mockLocation.watchPositionAsync.mockImplementation(((_options, callback) => {
          savedCallback = callback as unknown as (loc: unknown) => void
          return Promise.resolve(mockSubscription)
        }) as typeof Location.watchPositionAsync)

      const subscription = await locationService.watchLocation(mockCallback)

      expect(subscription).toBe(mockSubscription)
      expect(mockLocation.watchPositionAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          accuracy: 0,
          distanceInterval: 10,
          timeInterval: 5000,
        }),
        expect.any(Function)
      )

      savedCallback!({
        coords: { latitude: 3.1, longitude: 101.6, accuracy: 8, altitude: 5 },
      })
      expect(mockCallback).toHaveBeenCalledWith({
        latitude: 3.1,
        longitude: 101.6,
        accuracy: 8,
        altitude: 5,
      })
    })

    it('starts watching location with custom interval', async () => {
      const mockSubscription = { remove: jest.fn() }
      const mockCallback = jest.fn()

      mockLocation.watchPositionAsync.mockImplementation(
        (_options, _callback) => Promise.resolve(mockSubscription)
      )

      await locationService.watchLocation(mockCallback, 50)

      expect(mockLocation.watchPositionAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          distanceInterval: 50,
        }),
        expect.any(Function)
      )
    })

    it('handles null altitude in watch callback', async () => {
      const mockCallback = jest.fn()
      let savedCallback: ((loc: unknown) => void) | null = null

      mockLocation.watchPositionAsync.mockImplementation(((_options, callback) => {
          savedCallback = callback as unknown as (loc: unknown) => void
          return Promise.resolve({ remove: jest.fn() })
        }) as typeof Location.watchPositionAsync)

      await locationService.watchLocation(mockCallback)
      savedCallback!({
        coords: { latitude: 3.1, longitude: 101.6, accuracy: 5, altitude: null },
      })
      expect(mockCallback).toHaveBeenCalledWith({
        latitude: 3.1,
        longitude: 101.6,
        accuracy: 5,
        altitude: null,
      })
    })
  })
})
