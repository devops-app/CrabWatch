import { useAuthStore } from '../store/authStore'
import { api } from './api'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  name: string
  email: string
  phoneCode?: string
  phoneNumber?: string
  addressLine1?: string
  addressLine2?: string
 consentAccepted?: boolean
  state?: string
  postcode?: string
  country?: string
  password: string
}

export const authService = {
  async login(email: string, password: string) {
    const result = await api.login({ email, password })
    const user = result.user
    await useAuthStore.getState().login(user, result.token)
    return user
  },

  async register(name: string, email: string, password: string, phoneCode?: string, phoneNumber?: string, addressLine1?: string, addressLine2?: string, state?: string, postcode?: string, country?: string, consentAccepted?: boolean) {
    const user = await api.register(name, email, password, phoneCode, phoneNumber, addressLine1, addressLine2, state, postcode, country, consentAccepted)
    const result = await api.login({ email, password })
    await useAuthStore.getState().login(user, result.token)
    return user
  },

  async logout() {
    await useAuthStore.getState().logout()
  },

  async refreshToken() {
    const token = useAuthStore.getState().token
    return token || null
  },
}
