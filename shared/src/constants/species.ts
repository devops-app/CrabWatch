/**
 * @deprecated Use dynamic species from API (GET /api/v1/species) instead.
 * The AI can identify any crab species; unknown species are auto-created in the database.
 * This constant is kept for backward compatibility and testing only.
 */
export interface MudCrabSpecies {
  id: string
  scientificName: string
  commonName: string
  shortName: string
}

/**
 * @deprecated Use dynamic species from API (GET /api/v1/species) instead.
 * Species are now detected dynamically by AI and auto-created via server upsert.
 */
export const MUD_CRAB_SPECIES: MudCrabSpecies[] = [
  {
    id: 'scylla-serrata',
    scientificName: 'Scylla serrata',
    commonName: 'Blue Mud Crab',
    shortName: 'S. serrata',
  },
  {
    id: 'scylla-olivacea',
    scientificName: 'Scylla olivacea',
    commonName: 'Olive Mud Crab',
    shortName: 'S. olivacea',
  },
  {
    id: 'scylla-paramamosain',
    scientificName: 'Scylla paramamosain',
    commonName: 'Green Mud Crab',
    shortName: 'S. paramamosain',
  },
  {
    id: 'scylla-tranquebarica',
    scientificName: 'Scylla tranquebarica',
    commonName: 'Tamil Mud Crab',
    shortName: 'S. tranquebarica',
  },
]

export const DEFAULT_PAGE_LIMIT = 20
export const MAX_PAGE_LIMIT = 100
