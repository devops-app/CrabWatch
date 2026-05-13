import { useState, useCallback } from 'react'
import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'

interface UseApiResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  execute: (...args: unknown[]) => Promise<T | null>
  reset: () => void
}

export function useApi<T>(): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(async (...args: unknown[]): Promise<T | null> => {
    setLoading(true)
    setError(null)
    try {
      const result = await (args[0] as (...a: unknown[]) => Promise<T>)(...args.slice(1))
      setData(result)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setData(null)
    setLoading(false)
    setError(null)
  }, [])

  return { data, loading, error, execute, reset }
}

export async function authenticatedFetch(endpoint: string, options: RequestInit = {}) {
  type ExpoConfigExtra = {
    apiUrl?: string
  }
  const expoExtra = Constants.expoConfig?.extra as ExpoConfigExtra | undefined
  const apiUrl = expoExtra?.apiUrl ?? 'http://localhost:3001/api/v1'

  const token = await SecureStore.getItemAsync('auth_token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${apiUrl}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `HTTP ${response.status}`)
  }

  const data = await response.json()
  return data.data || data
}
