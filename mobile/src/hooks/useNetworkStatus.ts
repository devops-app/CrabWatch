import * as Network from 'expo-network'

export { useNetworkState } from 'expo-network'

export async function isOnline(): Promise<boolean> {
  const state = await Network.getNetworkStateAsync()
  return state.isInternetReachable ?? state.isConnected ?? false
}
