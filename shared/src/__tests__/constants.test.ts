import { USER_ROLES, ROLE_HIERARCHY } from '../constants/roles'
import { OBSERVATION_STATUSES } from '../constants/statuses'
import { MUD_CRAB_SPECIES, DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from '../constants/species'
import { MALAYSIAN_STATES, COASTAL_STATES, MALAYSIA_BOUNDS } from '../constants/regions'

describe('Shared Constants', () => {
  describe('USER_ROLES', () => {
    it('should have all three roles defined', () => {
      expect(Object.keys(USER_ROLES)).toHaveLength(3)
      expect(USER_ROLES).toHaveProperty('user')
      expect(USER_ROLES).toHaveProperty('researcher')
      expect(USER_ROLES).toHaveProperty('admin')
    })

    it('should have descriptive role values', () => {
      expect(USER_ROLES.user).toContain('User')
      expect(USER_ROLES.researcher).toContain('Researcher')
      expect(USER_ROLES.admin).toContain('Admin')
    })
  })

  describe('ROLE_HIERARCHY', () => {
    it('should define correct hierarchy order', () => {
      expect(ROLE_HIERARCHY.user).toBe(0)
      expect(ROLE_HIERARCHY.researcher).toBe(1)
      expect(ROLE_HIERARCHY.admin).toBe(2)
    })

    it('should have admin with highest hierarchy', () => {
      expect(ROLE_HIERARCHY.admin).toBeGreaterThan(ROLE_HIERARCHY.researcher)
      expect(ROLE_HIERARCHY.researcher).toBeGreaterThan(ROLE_HIERARCHY.user)
    })
  })

  describe('OBSERVATION_STATUSES', () => {
    it('should have all three statuses', () => {
      expect(Object.keys(OBSERVATION_STATUSES)).toHaveLength(3)
      expect(OBSERVATION_STATUSES).toHaveProperty('pending')
      expect(OBSERVATION_STATUSES).toHaveProperty('approved')
      expect(OBSERVATION_STATUSES).toHaveProperty('rejected')
    })
  })

  describe('MUD_CRAB_SPECIES', () => {
    it('should have four species', () => {
      expect(MUD_CRAB_SPECIES).toHaveLength(4)
    })

    it('should have all required fields for each species', () => {
      MUD_CRAB_SPECIES.forEach((species) => {
        expect(species).toHaveProperty('id')
        expect(species).toHaveProperty('scientificName')
        expect(species).toHaveProperty('commonName')
        expect(species).toHaveProperty('shortName')
        expect(typeof species.id).toBe('string')
        expect(typeof species.scientificName).toBe('string')
        expect(typeof species.commonName).toBe('string')
        expect(typeof species.shortName).toBe('string')
      })
    })

    it('should include all Scylla species', () => {
      const ids = MUD_CRAB_SPECIES.map((s) => s.id)
      expect(ids).toContain('scylla-serrata')
      expect(ids).toContain('scylla-olivacea')
      expect(ids).toContain('scylla-paramamosain')
      expect(ids).toContain('scylla-tranquebarica')
    })
  })

  describe('Pagination constants', () => {
    it('should have correct default and max page limits', () => {
      expect(DEFAULT_PAGE_LIMIT).toBe(20)
      expect(MAX_PAGE_LIMIT).toBe(100)
      expect(MAX_PAGE_LIMIT).toBeGreaterThan(DEFAULT_PAGE_LIMIT)
    })
  })

  describe('MALAYSIAN_STATES', () => {
    it('should have 16 states', () => {
      expect(MALAYSIAN_STATES).toHaveLength(16)
    })

    it('should include key states', () => {
      expect(MALAYSIAN_STATES).toContain('Selangor')
      expect(MALAYSIAN_STATES).toContain('Johor')
      expect(MALAYSIAN_STATES).toContain('Kedah')
      expect(MALAYSIAN_STATES).toContain('Sabah')
      expect(MALAYSIAN_STATES).toContain('Sarawak')
      expect(MALAYSIAN_STATES).toContain('Kuala Lumpur')
    })

    it('should have unique state names', () => {
      const unique = new Set(MALAYSIAN_STATES)
      expect(unique.size).toBe(MALAYSIAN_STATES.length)
    })
  })

  describe('COASTAL_STATES', () => {
    it('should be a subset of MALAYSIAN_STATES', () => {
      COASTAL_STATES.forEach((state) => {
        expect(MALAYSIAN_STATES).toContain(state)
      })
    })

    it('should have 15 coastal states', () => {
      expect(COASTAL_STATES).toHaveLength(15)
    })

    it('should include Perlis as a coastal state', () => {
      expect(COASTAL_STATES).toContain('Perlis')
    })
  })

  describe('MALAYSIA_BOUNDS', () => {
    it('should have valid geographic bounds', () => {
      expect(MALAYSIA_BOUNDS.north).toBeGreaterThan(MALAYSIA_BOUNDS.south)
      expect(MALAYSIA_BOUNDS.east).toBeGreaterThan(MALAYSIA_BOUNDS.west)
      expect(MALAYSIA_BOUNDS.center.lat).toBeGreaterThan(0)
      expect(MALAYSIA_BOUNDS.center.lng).toBeGreaterThan(0)
    })

    it('should have center within bounds', () => {
      const { center, north, south, east, west } = MALAYSIA_BOUNDS
      expect(center.lat).toBeGreaterThanOrEqual(south)
      expect(center.lat).toBeLessThanOrEqual(north)
      expect(center.lng).toBeGreaterThanOrEqual(west)
      expect(center.lng).toBeLessThanOrEqual(east)
    })
  })
})
