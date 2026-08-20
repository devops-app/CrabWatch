import * as Network from 'expo-network'

/**
 * @deprecated useNetworkState was removed in expo-network v5.
 * Use isOnline() or Network.getNetworkStateAsync() directly instead.
 */
export const useNetworkState = undefined

export async function isOnline(): Promise<boolean> {
  const state = await Network.getNetworkStateAsync()
  return state.isInternetReachable ?? state.isConnected ?? false
}
