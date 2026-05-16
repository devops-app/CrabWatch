import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { UserRole } from '@crabwatch/shared'

interface User {
  id: string
  name: string
  email: string
  phoneCode?: string | null
  phoneNumber?: string | null
  addressLine1?: string | null
  addressLine2?: string | null
  addressLine3?: string | null
  state?: string | null
  postcode?: string | null
  country?: string | null
  role: UserRole
  avatar?: string | null
  // Engagement fields
  totalXP?: number
  level?: number
  title?: string
  currentStreak?: number
  longestStreak?: number
  approvedCount?: number
  totalSubmissions?: number
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  isHydrated: boolean
  login: (user: User, token?: string) => void
  logout: () => void
  updateUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, _get) => ({
      user: null,
      token: null,
      isLoading: false,
      isHydrated: false,
      login: (user, token) => {
        set({ user, token: token ?? null, isLoading: false })
      },
      logout: () => set({ user: null, token: null }),
      updateUser: (user) => set({ user }),
    }),
    {
      name: 'crabwatch-auth',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true
        }
      },
    }
  )
)
