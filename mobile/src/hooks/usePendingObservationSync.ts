import { useCallback, useEffect, useRef } from 'react'
import { AppState } from 'react-native'
import * as Network from 'expo-network'
import { api } from '../services/api'
import { useObservationStore, type PendingObservation } from '../store/observationStore'

const SYNC_INTERVAL_MS = 30000

function toCreateObservationInput(pending: PendingObservation) {
  const { localId: _localId, queuedAt: _queuedAt, ...input } = pending
  return input
}

export function usePendingObservationSync() {
  const pendingObservations = useObservationStore((state) => state.pendingObservations)
  const removeObservation = useObservationStore((state) => state.removeObservation)
  const setSyncStatus = useObservationStore((state) => state.setSyncStatus)
  const isSyncingRef = useRef(false)
  const isConnectedRef = useRef(true)

  useEffect(() => {
    const checkConnectivity = async () => {
      const state = await Network.getNetworkStateAsync()
      isConnectedRef.current = state.isInternetReachable ?? state.isConnected ?? false
      if (isConnectedRef.current && pendingObservations.length > 0) {
        void syncPending()
      }
    }
    void checkConnectivity()

    const subscription = Network.addNetworkStateListener((state) => {
      isConnectedRef.current = state.isInternetReachable ?? state.isConnected ?? false
      if (isConnectedRef.current && pendingObservations.length > 0) {
        void syncPending()
      }
    })

    return () => {
      subscription.remove()
    }
  }, [pendingObservations.length])

  const syncPending = useCallback(async () => {
    if (isSyncingRef.current || pendingObservations.length === 0) {
      return
    }

    const state = await Network.getNetworkStateAsync()
    if (!(state.isInternetReachable ?? state.isConnected ?? false)) {
      return
    }

    isSyncingRef.current = true
    setSyncStatus('syncing')

    try {
      for (const pending of pendingObservations) {
        await api.createObservation(toCreateObservationInput(pending))
        removeObservation(pending.localId)
      }
      setSyncStatus('idle')
    } catch {
      setSyncStatus('error')
    } finally {
      isSyncingRef.current = false
    }
  }, [pendingObservations, removeObservation, setSyncStatus])

  useEffect(() => {
    const intervalId = setInterval(() => {
      void syncPending()
    }, SYNC_INTERVAL_MS)

    const appSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void syncPending()
      }
    })

    return () => {
      clearInterval(intervalId)
      appSubscription.remove()
    }
  }, [syncPending])
}
