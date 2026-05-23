import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { CreateObservationInput } from '@crabwatch/shared'

export interface PendingObservation extends CreateObservationInput {
  localId: string
  queuedAt: string
}

interface ObservationState {
  pendingObservations: PendingObservation[]
  syncStatus: 'idle' | 'syncing' | 'error'
  addObservation: (observation: CreateObservationInput) => void
  removeObservation: (localId: string) => void
  clearPending: () => void
  setSyncStatus: (status: 'idle' | 'syncing' | 'error') => void
}

export const useObservationStore = create<ObservationState>()(
  persist(
    (set) => ({
      pendingObservations: [],
      syncStatus: 'idle',

      addObservation: (observation) => {
        const pending: PendingObservation = {
          ...observation,
          localId: `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          queuedAt: new Date().toISOString(),
        }
        set((state) => ({
          pendingObservations: [...state.pendingObservations, pending],
        }))
      },

      removeObservation: (localId) => {
        set((state) => ({
          pendingObservations: state.pendingObservations.filter(
            (obs) => obs.localId !== localId
          ),
        }))
      },

      clearPending: () => {
        set({ pendingObservations: [] })
      },

      setSyncStatus: (status) => {
        set({ syncStatus: status })
      },
    }),
    {
      name: 'observation-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        pendingObservations: state.pendingObservations,
      }),
    }
  )
)
