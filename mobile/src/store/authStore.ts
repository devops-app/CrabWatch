import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import type { UserResponse } from '@crabwatch/shared'
import { api } from '../services/api'
import { syncPushTokenWithServer, unregisterPushTokenFromServer } from '../services/pushNotificationService'
import { resetToLogin } from '../navigation/navRef'

interface AuthState {
  user: UserResponse | null
  token: string | null
  firebaseUid: string | null
  isAuthenticated: boolean
  login: (user: UserResponse, token: string, firebaseUid?: string) => Promise<void>
  logout: () => Promise<void>
  updateUser: (user: UserResponse) => void
  setToken: (token: string | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  firebaseUid: null,
  isAuthenticated: false,

  login: async (user, token, firebaseUid) => {
    await SecureStore.setItemAsync('auth_token', token)
    if (firebaseUid) {
      await SecureStore.setItemAsync('firebase_uid', firebaseUid)
    }
    set({ user, token, firebaseUid: firebaseUid ?? null, isAuthenticated: true })

    try {
      await syncPushTokenWithServer({ requestPermission: false })
    } catch (error) {
      console.warn('Push token sync skipped during login:', error)
    }
  },

  logout: async () => {
    try {
      await unregisterPushTokenFromServer()
    } catch (error) {
      console.warn('Push token unregister skipped during logout:', error)
    }

    await SecureStore.deleteItemAsync('auth_token')
    await SecureStore.deleteItemAsync('firebase_uid')
    set({ user: null, token: null, firebaseUid: null, isAuthenticated: false })
    resetToLogin()
  },

  updateUser: (user) => {
    set({ user })
  },

  setToken: (token) => {
    set({ token, isAuthenticated: !!token })
  },
}))

export async function initAuth() {
  const [token, firebaseUid] = await Promise.all([
    SecureStore.getItemAsync('auth_token'),
    SecureStore.getItemAsync('firebase_uid'),
  ])

  if (token) {
    useAuthStore.setState({
      token,
      firebaseUid: firebaseUid ?? null,
      isAuthenticated: true,
    })

    try {
      const user = await api.getProfile()
      useAuthStore.getState().updateUser(user)

      try {
        await syncPushTokenWithServer({ requestPermission: false })
      } catch (error) {
        console.warn('Push token sync skipped during init:', error)
      }
    } catch {
      await useAuthStore.getState().logout()
    }
  }
}
