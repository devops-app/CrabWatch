import { create } from 'zustand'
import type { SpeciesResponse } from '@crabwatch/shared'
import { api } from '../services/api'

interface SpeciesState {
  species: SpeciesResponse[]
  selectedSpecies: SpeciesResponse | null
  loading: boolean
  error: string | null
  loadSpecies: () => Promise<void>
  selectSpecies: (species: SpeciesResponse | null) => void
  getSpeciesById: (id: string) => SpeciesResponse | undefined
}

export const useSpeciesStore = create<SpeciesState>((set, get) => ({
  species: [],
  selectedSpecies: null,
  loading: false,
  error: null,

  loadSpecies: async () => {
    set({ loading: true, error: null })
    try {
      const data = await api.listSpecies()
      set({ species: data, loading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load species',
        loading: false,
      })
    }
  },

  selectSpecies: (species) => {
    set({ selectedSpecies: species })
  },

  getSpeciesById: (id) => {
    return get().species.find((s) => s.id === id)
  },
}))
