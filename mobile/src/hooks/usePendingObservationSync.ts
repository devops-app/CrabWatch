import { useCallback, useEffect, useRef } from 'react'
import { AppState, Platform } from 'react-native'
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

    // expo-network v5 removed addNetworkStateListener.
    // Use AppState changes + periodic polling as fallback for connectivity monitoring.
    const appSub = AppState.addEventListener('change', async (state) => {
      if (state === 'active') {
        const netState = await Network.getNetworkStateAsync()
        isConnectedRef.current = netState.isInternetReachable ?? netState.isConnected ?? false
        if (isConnectedRef.current && pendingObservations.length > 0) {
          void syncPending()
        }
      }
    })

    // On iOS, NetworkInformation API isn't available via expo-network listeners,
    // so poll periodically when app is in background with pending observations.
    let pollInterval: ReturnType<typeof setInterval> | null = null
    if (Platform.OS === 'ios' && pendingObservations.length > 0) {
      pollInterval = setInterval(async () => {
        const netState = await Network.getNetworkStateAsync()
        isConnectedRef.current = netState.isInternetReachable ?? netState.isConnected ?? false
        if (isConnectedRef.current && pendingObservations.length > 0) {
          void syncPending()
        }
      }, SYNC_INTERVAL_MS)
    }

    return () => {
      appSub.remove()
      if (pollInterval) {
        clearInterval(pollInterval)
      }
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
