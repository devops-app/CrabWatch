import { useState, useEffect, useCallback } from 'react'
import { locationService, type LocationCoords } from '../services/locationService'

export function useLocation() {
  const [location, setLocation] = useState<LocationCoords | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState(false)

  const fetchLocation = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const coords = await locationService.getCurrentLocation()
      setLocation(coords)
      setHasPermission(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get location')
      setHasPermission(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLocation()
  }, [fetchLocation])

  const requestPermission = useCallback(async () => {
    const granted = await locationService.requestLocationPermission()
    setHasPermission(granted)
    return granted
  }, [])

  return {
    location,
    loading,
    error,
    hasPermission,
    refresh: fetchLocation,
    requestPermission,
  }
}
