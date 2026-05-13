import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { UserRole } from '@crabwatch/shared'

interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string | null
}

interface AuthState {
  user: User | null
  isLoading: boolean
  isHydrated: boolean
  login: (user: User) => void
  logout: () => void
  updateUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, _get) => ({
      user: null,
      isLoading: false,
      isHydrated: false,
      login: (user) => {
        set({ user, isLoading: false })
      },
      logout: () => set({ user: null }),
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
