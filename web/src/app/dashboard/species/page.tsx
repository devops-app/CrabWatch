import { SpeciesClient } from './client'
import type { SpeciesResponse } from '@crabwatch/shared'

async function fetchSpecies(): Promise<SpeciesResponse[]> {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001'
  try {
    const res = await fetch(`${backendUrl}/api/v1/species`, {
      cache: 'no-store',
    })
    if (!res.ok) return []
    const json = await res.json()
    return json?.data ?? json
  }
  catch {
    return []
  }
}

export default async function SpeciesPage() {
  const species = await fetchSpecies()

  return <SpeciesClient initialSpecies={species} />
}
