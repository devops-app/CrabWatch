import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import { api } from './api'

export type PushPermissionState = 'granted' | 'denied' | 'undetermined'

export interface PushSyncResult {
  permission: PushPermissionState
  registered: boolean
  tokenType?: string
  reason?: string
}

function normalizePermission(status: Notifications.PermissionStatus): PushPermissionState {
  if (status === Notifications.PermissionStatus.GRANTED) {
    return 'granted'
  }
  if (status === Notifications.PermissionStatus.DENIED) {
    return 'denied'
  }
  return 'undetermined'
}

export async function getPushPermissionStatus(): Promise<PushPermissionState> {
  const permissions = await Notifications.getPermissionsAsync()
  return normalizePermission(permissions.status)
}

async function ensureAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return
  }

  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.DEFAULT,
  })
}

async function getNativePushToken(): Promise<{ token: string; type: string } | null> {
  const token = await Notifications.getDevicePushTokenAsync()
  if (!token?.data) {
    return null
  }
  return {
    token: token.data,
    type: token.type ?? 'unknown',
  }
}

export async function syncPushTokenWithServer(options?: {
  requestPermission?: boolean
}): Promise<PushSyncResult> {
  await ensureAndroidNotificationChannel()

  let permission = await getPushPermissionStatus()
  if (permission !== 'granted' && options?.requestPermission) {
    const requested = await Notifications.requestPermissionsAsync()
    permission = normalizePermission(requested.status)
  }

  if (permission !== 'granted') {
    return {
      permission,
      registered: false,
      reason: 'Permission not granted',
    }
  }

  const nativeToken = await getNativePushToken()
  if (!nativeToken) {
    return {
      permission,
      registered: false,
      reason: 'No push token available on this device',
    }
  }

  if (nativeToken.type !== 'fcm') {
    return {
      permission,
      registered: false,
      tokenType: nativeToken.type,
      reason: 'Only FCM tokens are supported by this backend',
    }
  }

  await api.registerFcmToken(nativeToken.token)

  return {
    permission,
    registered: true,
    tokenType: nativeToken.type,
  }
}

export async function unregisterPushTokenFromServer(): Promise<void> {
  await api.unregisterFcmToken()
}
