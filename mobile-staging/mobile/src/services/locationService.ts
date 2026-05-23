import * as Location from 'expo-location'

export interface LocationCoords {
  latitude: number
  longitude: number
  accuracy: number
  altitude: number | null
}

export const locationService = {
  async requestLocationPermission(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync()
    return status === 'granted'
  },

  async getCurrentLocation(): Promise<LocationCoords> {
    const hasPermission = await this.requestLocationPermission()
    if (!hasPermission) {
      throw new Error('Location permission not granted')
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    })

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy ?? 0,
      altitude: location.coords.altitude ?? null,
    }
  },

  async watchLocation(
    callback: (location: LocationCoords) => void,
    distanceInterval: number = 10
  ): Promise<Location.LocationSubscription> {
    return Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval,
        timeInterval: 5000,
      },
      (loc) => {
        callback({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy ?? 0,
          altitude: loc.coords.altitude ?? null,
        })
      }
    )
  },
}
