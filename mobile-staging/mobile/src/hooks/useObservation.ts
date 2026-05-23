import { useState, useCallback } from 'react'
import { api } from '../services/api'
import { useObservationStore } from '../store/observationStore'
import type { CreateObservationInput } from '@crabwatch/shared'

export function useObservation() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const addPending = useObservationStore((state) => state.addObservation)
  const syncStatus = useObservationStore((state) => state.syncStatus)

  const submitObservation = useCallback(async (input: CreateObservationInput) => {
    setSubmitting(true)
    setError(null)
    try {
      const result = await api.createObservation(input)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit observation'
      setError(message)
      addPending(input)
      return null
    } finally {
      setSubmitting(false)
    }
  }, [addPending])

  return {
    submitObservation,
    submitting,
    error,
    syncStatus,
  }
}
