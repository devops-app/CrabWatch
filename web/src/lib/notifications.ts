export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications')
    return false
  }

  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

export async function subscribeToPushNotifications(): Promise<string | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const existingSubscription = await registration.pushManager.getSubscription()

    if (existingSubscription) {
      const token = btoa(JSON.stringify(existingSubscription))
      return token
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(getVapidPublicKey()) as BufferSource,
    })

    const token = btoa(JSON.stringify(subscription))
    return token
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error)
    return null
  }
}

export function getVapidPublicKey(): string {
  return process.env.NEXT_PUBLIC_FCM_VAPID_KEY || ''
}

export async function registerTokenWithServer(token: string): Promise<boolean> {
  try {
    const response = await fetch('/api/v1/fcm/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ fcmToken: token }),
    })

    return response.ok
  } catch (error) {
    console.error('Failed to register token with server:', error)
    return false
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}
