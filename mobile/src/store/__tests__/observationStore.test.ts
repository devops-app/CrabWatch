import { useObservationStore } from '../../store/observationStore'

describe('observationStore', () => {
  beforeEach(() => {
    useObservationStore.getState().clearPending()
    useObservationStore.getState().setSyncStatus('idle')
  })

  describe('initial state', () => {
    it('has empty pending observations', () => {
      expect(useObservationStore.getState().pendingObservations).toEqual([])
    })

    it('has idle sync status', () => {
      expect(useObservationStore.getState().syncStatus).toBe('idle')
    })
  })

  describe('addObservation', () => {
    it('adds an observation to pending list', () => {
      const observation = {
        speciesId: 'species-1',
        cw: 10,
        bw: 500,
        gender: 'male' as const,
        maturationStatus: 'mature' as const,
        lat: 3.139,
        lng: 101.6869,
        locationMethod: 'gps' as const,
        photos: ['photo1.jpg'],
      }

      useObservationStore.getState().addObservation(observation)

      expect(useObservationStore.getState().pendingObservations).toHaveLength(1)
    })

    it('assigns a localId to the observation', () => {
      const observation = {
        speciesId: 'species-1',
        cw: 10,
        bw: 500,
        gender: 'male' as const,
        maturationStatus: 'mature' as const,
        lat: 3.139,
        lng: 101.6869,
        locationMethod: 'gps' as const,
        photos: ['photo1.jpg'],
      }

      useObservationStore.getState().addObservation(observation)
      const pending = useObservationStore.getState().pendingObservations[0]

      expect(pending.localId).toBeDefined()
      expect(pending.localId).toMatch(/^local_/)
    })

    it('assigns a queuedAt timestamp', () => {
      const observation = {
        speciesId: 'species-1',
        cw: 10,
        bw: 500,
        gender: 'male' as const,
        maturationStatus: 'mature' as const,
        lat: 3.139,
        lng: 101.6869,
        locationMethod: 'gps' as const,
        photos: ['photo1.jpg'],
      }

      useObservationStore.getState().addObservation(observation)
      const pending = useObservationStore.getState().pendingObservations[0]

      expect(pending.queuedAt).toBeDefined()
      expect(new Date(pending.queuedAt)).toBeInstanceOf(Date)
    })

    it('accumulates multiple observations', () => {
      const observation = {
        speciesId: 'species-1',
        cw: 10,
        bw: 500,
        gender: 'male' as const,
        maturationStatus: 'mature' as const,
        lat: 3.139,
        lng: 101.6869,
        locationMethod: 'gps' as const,
        photos: ['photo1.jpg'],
      }

      useObservationStore.getState().addObservation(observation)
      useObservationStore.getState().addObservation(observation)

      expect(useObservationStore.getState().pendingObservations).toHaveLength(2)
    })
  })

  describe('removeObservation', () => {
    it('removes an observation by localId', () => {
      const observation = {
        speciesId: 'species-1',
        cw: 10,
        bw: 500,
        gender: 'male' as const,
        maturationStatus: 'mature' as const,
        lat: 3.139,
        lng: 101.6869,
        locationMethod: 'gps' as const,
        photos: ['photo1.jpg'],
      }

      useObservationStore.getState().addObservation(observation)
      const localId = useObservationStore.getState().pendingObservations[0].localId

      useObservationStore.getState().removeObservation(localId)

      expect(useObservationStore.getState().pendingObservations).toHaveLength(0)
    })

    it('does not remove other observations', () => {
      const observation = {
        speciesId: 'species-1',
        cw: 10,
        bw: 500,
        gender: 'male' as const,
        maturationStatus: 'mature' as const,
        lat: 3.139,
        lng: 101.6869,
        locationMethod: 'gps' as const,
        photos: ['photo1.jpg'],
      }

      useObservationStore.getState().addObservation(observation)
      useObservationStore.getState().addObservation(observation)

      const [first, second] = useObservationStore.getState().pendingObservations
      useObservationStore.getState().removeObservation(first.localId)

      expect(useObservationStore.getState().pendingObservations).toHaveLength(1)
      expect(useObservationStore.getState().pendingObservations[0].localId).toBe(second.localId)
    })

    it('handles removing non-existent localId gracefully', () => {
      useObservationStore.getState().removeObservation('non-existent-id')
      expect(useObservationStore.getState().pendingObservations).toHaveLength(0)
    })
  })

  describe('clearPending', () => {
    it('clears all pending observations', () => {
      const observation = {
        speciesId: 'species-1',
        cw: 10,
        bw: 500,
        gender: 'male' as const,
        maturationStatus: 'mature' as const,
        lat: 3.139,
        lng: 101.6869,
        locationMethod: 'gps' as const,
        photos: ['photo1.jpg'],
      }

      useObservationStore.getState().addObservation(observation)
      useObservationStore.getState().addObservation(observation)
      useObservationStore.getState().clearPending()

      expect(useObservationStore.getState().pendingObservations).toEqual([])
    })
  })

  describe('setSyncStatus', () => {
    it('sets sync status to syncing', () => {
      useObservationStore.getState().setSyncStatus('syncing')
      expect(useObservationStore.getState().syncStatus).toBe('syncing')
    })

    it('sets sync status to error', () => {
      useObservationStore.getState().setSyncStatus('error')
      expect(useObservationStore.getState().syncStatus).toBe('error')
    })

    it('sets sync status back to idle', () => {
      useObservationStore.getState().setSyncStatus('syncing')
      useObservationStore.getState().setSyncStatus('idle')
      expect(useObservationStore.getState().syncStatus).toBe('idle')
    })
  })
})
