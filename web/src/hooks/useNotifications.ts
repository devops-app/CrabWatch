import { useEffect, useCallback, useRef, useState } from 'react'
import { api } from '@/lib/api'

export function useNotifications(): {
  isSupported: boolean
  permission: NotificationPermission
  isRegistered: boolean
  requestPermission: () => Promise<boolean>
  registerToken: () => Promise<boolean>
} {
  const isSupported = typeof window !== 'undefined' && 'Notification' in window && typeof Notification !== 'undefined'
  const getPermission = (): NotificationPermission => {
    if (typeof window === 'undefined' || !('Notification' in window) || typeof Notification === 'undefined') {
      return 'default'
    }
    return Notification.permission
  }

  const [permission, setPermission] = useState<NotificationPermission>(getPermission())
  const isRegisteredRef = useRef(false)

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported || typeof Notification === 'undefined') return false

    const perm = await Notification.requestPermission()
    setPermission(perm)
    return perm === 'granted'
  }, [isSupported])

  const registerToken = useCallback(async (): Promise<boolean> => {
    if (permission !== 'granted') return false
    if (isRegisteredRef.current) return true

    try {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.register('/service-worker.js')
        const subscription = await registration.pushManager.getSubscription()

        if (subscription) {
          const token = btoa(JSON.stringify(subscription))
          await api.registerFcmToken(token)
          isRegisteredRef.current = true
          return true
        }
      }
    } catch (error) {
      console.error('Failed to register notification token:', error)
    }

    return false
  }, [permission])

  useEffect(() => {
    if (permission === 'granted' && !isRegisteredRef.current) {
      registerToken()
    }
  }, [permission, registerToken])

  return {
    isSupported,
    permission,
    isRegistered: isRegisteredRef.current,
    requestPermission,
    registerToken,
  }
}
