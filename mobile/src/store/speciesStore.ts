import { create } from 'zustand'
import type { SpeciesResponse, CreateSpeciesInput, UpdateSpeciesInput } from '@crabwatch/shared'
import { api } from '../services/api'

interface SpeciesState {
  species: SpeciesResponse[]
  selectedSpecies: SpeciesResponse | null
  loading: boolean
  error: string | null
  loadSpecies: () => Promise<void>
  selectSpecies: (species: SpeciesResponse | null) => void
  getSpeciesById: (id: string) => SpeciesResponse | undefined
  createSpecies: (data: CreateSpeciesInput) => Promise<SpeciesResponse>
  updateSpecies: (id: string, data: UpdateSpeciesInput) => Promise<SpeciesResponse>
  deleteSpecies: (id: string) => Promise<void>
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

  createSpecies: async (data) => {
    const result = await api.createSpecies(data)
    set((state) => ({ species: [...state.species, result] }))
    return result
  },

  updateSpecies: async (id, data) => {
    const result = await api.updateSpecies(id, data)
    set((state) => ({
      species: state.species.map((s) => (s.id === id ? result : s)),
    }))
    return result
  },

  deleteSpecies: async (id) => {
    await api.deleteSpecies(id)
    set((state) => ({
      species: state.species.filter((s) => s.id !== id),
    }))
  },
}))
