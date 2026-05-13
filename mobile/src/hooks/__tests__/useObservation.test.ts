import { renderHook, act } from '@testing-library/react'
import { useObservation } from '../../hooks/useObservation'
import { api } from '@/services/api'
import { useObservationStore } from '@/store/observationStore'

jest.mock('@/services/api', () => ({
  api: {
    createObservation: jest.fn(),
  },
}))

jest.mock('@/store/observationStore', () => ({
  useObservationStore: jest.fn(),
}))

describe('useObservation', () => {
  const mockAddObservation = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useObservationStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        addObservation: mockAddObservation,
        syncStatus: 'idle',
        pendingObservations: [],
        removeObservation: jest.fn(),
        clearPending: jest.fn(),
        setSyncStatus: jest.fn(),
      })
    )
  })

  describe('initial state', () => {
    it('returns submitting as false', () => {
      const { result } = renderHook(() => useObservation())
      expect(result.current.submitting).toBe(false)
    })

    it('returns error as null', () => {
      const { result } = renderHook(() => useObservation())
      expect(result.current.error).toBeNull()
    })

    it('returns syncStatus from store', () => {
      const { result } = renderHook(() => useObservation())
      expect(result.current.syncStatus).toBe('idle')
    })

    it('returns submitObservation function', () => {
      const { result } = renderHook(() => useObservation())
      expect(typeof result.current.submitObservation).toBe('function')
    })
  })

  describe('submitObservation success', () => {
    it('calls api.createObservation with input', async () => {
      const mockResult = { id: 'obs-1', speciesId: 'sp-1', carapaceWidth: 10, status: 'pending' }
      ;(api.createObservation as jest.Mock).mockResolvedValue(mockResult)

      const { result } = renderHook(() => useObservation())
      const input = {
        speciesId: 'sp-1',
        cw: 10,
        bw: 200,
        gender: 'male' as const,
        maturationStatus: 'unknown' as const,
        lat: 3.139,
        lng: 101.687,
        locationMethod: 'gps' as const,
        photos: [],
      }

      let returnedValue: unknown = null
      await act(async () => {
        returnedValue = await result.current.submitObservation(input)
      })

      expect(api.createObservation).toHaveBeenCalledWith(input)
      expect(returnedValue).toEqual(mockResult)
    })

    it('sets submitting to true then false', async () => {
      (api.createObservation as jest.Mock).mockResolvedValue({ id: '1' })

      const { result } = renderHook(() => useObservation())

      await act(async () => {
        result.current.submitObservation({
          speciesId: 'sp-1',
          cw: 10,
          bw: 200,
          gender: 'male' as const,
          maturationStatus: 'unknown' as const,
          lat: 3.139,
          lng: 101.687,
          locationMethod: 'gps' as const,
          photos: [],
        })
      })

      expect(result.current.submitting).toBe(false)
    })

    it('clears error on successful submission', async () => {
      (api.createObservation as jest.Mock).mockResolvedValue({ id: '1' })

      const { result } = renderHook(() => useObservation())
      expect(result.current.error).toBeNull()

      await act(async () => {
        await result.current.submitObservation({
          speciesId: 'sp-1',
          cw: 10,
          bw: 200,
          gender: 'male' as const,
          maturationStatus: 'unknown' as const,
          lat: 3.139,
          lng: 101.687,
          locationMethod: 'gps' as const,
          photos: [],
        })
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('submitObservation failure', () => {
    it('catches error and sets error message', async () => {
      (api.createObservation as jest.Mock).mockRejectedValue(new Error('Network failed'))

      const { result } = renderHook(() => useObservation())

      let returnedValue: unknown = null
      await act(async () => {
        returnedValue = await result.current.submitObservation({
          speciesId: 'sp-1',
          cw: 10,
          bw: 200,
          gender: 'male' as const,
          maturationStatus: 'unknown' as const,
          lat: 3.139,
          lng: 101.687,
          locationMethod: 'gps' as const,
          photos: [],
        })
      })

      expect(result.current.error).toBe('Network failed')
      expect(returnedValue).toBeNull()
    })

    it('adds observation to pending queue on failure', async () => {
      (api.createObservation as jest.Mock).mockRejectedValue(new Error('Offline'))

      const { result } = renderHook(() => useObservation())
      const input = {
        speciesId: 'sp-1',
        cw: 10,
        bw: 200,
        gender: 'male' as const,
        maturationStatus: 'unknown' as const,
        lat: 3.139,
        lng: 101.687,
        locationMethod: 'gps' as const,
        photos: [],
      }

      await act(async () => {
        await result.current.submitObservation(input)
      })

      expect(mockAddObservation).toHaveBeenCalledWith(input)
    })

    it('handles non-Error throwables', async () => {
      (api.createObservation as jest.Mock).mockRejectedValue('Something went wrong')

      const { result } = renderHook(() => useObservation())

      await act(async () => {
        await result.current.submitObservation({
          speciesId: 'sp-1',
          cw: 10,
          bw: 200,
          gender: 'male' as const,
          maturationStatus: 'unknown' as const,
          lat: 3.139,
          lng: 101.687,
          locationMethod: 'gps' as const,
          photos: [],
        })
      })

      expect(result.current.error).toBe('Failed to submit observation')
    })
  })
})
