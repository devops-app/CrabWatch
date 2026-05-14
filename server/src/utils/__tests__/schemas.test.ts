import * as schemas from '../../utils/schemas'

describe('Zod Schemas', () => {
  describe('registerSchema', () => {
    it('should validate valid registration data', () => {
      const result = schemas.registerSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      })
      expect(result.success).toBe(true)
    })

    it('should validate with optional phone and address', () => {
      const result = schemas.registerSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+60123456789',
        address: '123 Street, Kuala Lumpur',
        password: 'password123',
      })
      expect(result.success).toBe(true)
    })

    it('should fail when name is empty', () => {
      const result = schemas.registerSchema.safeParse({
        name: '',
        email: 'john@example.com',
        password: 'password123',
      })
      expect(result.success).toBe(false)
    })

    it('should fail when email is invalid', () => {
      const result = schemas.registerSchema.safeParse({
        name: 'John Doe',
        email: 'not-an-email',
        password: 'password123',
      })
      expect(result.success).toBe(false)
    })

    it('should fail when password is too short', () => {
      const result = schemas.registerSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        password: '123',
      })
      expect(result.success).toBe(false)
    })

    it('should fail when phone is too short', () => {
      const result = schemas.registerSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '12345',
        password: 'password123',
      })
      expect(result.success).toBe(false)
    })

    it('should not accept role field (prevents privilege escalation)', () => {
      const result = schemas.registerSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('role')
      }
    })
  })

  describe('loginSchema', () => {
    it('should validate valid login data', () => {
      const result = schemas.loginSchema.safeParse({
        email: 'john@example.com',
        password: 'password123',
      })
      expect(result.success).toBe(true)
    })

    it('should fail when password is too short', () => {
      const result = schemas.loginSchema.safeParse({
        email: 'john@example.com',
        password: '12345',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateUserSchema', () => {
    it('should validate name update', () => {
      const result = schemas.updateUserSchema.safeParse({ name: 'New Name' })
      expect(result.success).toBe(true)
    })

    it('should validate phone and address update', () => {
      const result = schemas.updateUserSchema.safeParse({ phone: '+60123456789', address: '123 Street' })
      expect(result.success).toBe(true)
    })

    it('should validate null phone and address', () => {
      const result = schemas.updateUserSchema.safeParse({ phone: null, address: null })
      expect(result.success).toBe(true)
    })

    it('should validate avatar update', () => {
      const result = schemas.updateUserSchema.safeParse({ avatar: 'https://example.com/avatar.jpg' })
      expect(result.success).toBe(true)
    })

    it('should validate null avatar', () => {
      const result = schemas.updateUserSchema.safeParse({ avatar: null })
      expect(result.success).toBe(true)
    })

    it('should fail with invalid avatar URL', () => {
      const result = schemas.updateUserSchema.safeParse({ avatar: 'not-a-url' })
      expect(result.success).toBe(false)
    })
  })

  describe('updateRoleSchema', () => {
    it('should validate valid role', () => {
      const result = schemas.updateRoleSchema.safeParse({ role: 'ADMIN' })
      expect(result.success).toBe(true)
    })

    it('should fail with invalid role', () => {
      const result = schemas.updateRoleSchema.safeParse({ role: 'MODERATOR' })
      expect(result.success).toBe(false)
    })
  })

  describe('createObservationSchema', () => {
    const validObservation = {
      speciesId: '550e8400-e29b-41d4-a716-446655440000',
      cw: 5.5,
      bw: 100,
      gender: 'MALE',
      maturationStatus: 'MATURE',
      lat: 4.21,
      lng: 101.97,
      locationMethod: 'GPS',
      photos: ['https://example.com/photo.jpg'],
      notes: 'Test observation',
    }

    it('should validate valid observation data', () => {
      const result = schemas.createObservationSchema.safeParse(validObservation)
      expect(result.success).toBe(true)
    })

    it('should fail when cw is negative', () => {
      const result = schemas.createObservationSchema.safeParse({
        ...validObservation,
        cw: -1,
      })
      expect(result.success).toBe(false)
    })

    it('should fail when lat is out of range', () => {
      const result = schemas.createObservationSchema.safeParse({
        ...validObservation,
        lat: 91,
      })
      expect(result.success).toBe(false)
    })

    it('should fail when lng is out of range', () => {
      const result = schemas.createObservationSchema.safeParse({
        ...validObservation,
        lng: 181,
      })
      expect(result.success).toBe(false)
    })

    it('should accept lowercase gender values', () => {
      const result = schemas.createObservationSchema.safeParse({
        ...validObservation,
        gender: 'female',
      })
      expect(result.success).toBe(true)
    })

    it('should accept optional notes', () => {
      const result = schemas.createObservationSchema.safeParse({
        ...validObservation,
        notes: undefined,
      })
      expect(result.success).toBe(true)
    })

    it('should fail when speciesId is not a valid UUID', () => {
      const result = schemas.createObservationSchema.safeParse({
        ...validObservation,
        speciesId: 'not-a-uuid',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('validateObservationSchema', () => {
    it('should validate approval', () => {
      const result = schemas.validateObservationSchema.safeParse({ status: 'APPROVED' })
      expect(result.success).toBe(true)
    })

    it('should validate rejection with reason', () => {
      const result = schemas.validateObservationSchema.safeParse({
        status: 'REJECTED',
        rejectionReason: 'Invalid data',
      })
      expect(result.success).toBe(true)
    })

    it('should fail with invalid status', () => {
      const result = schemas.validateObservationSchema.safeParse({ status: 'PENDING' })
      expect(result.success).toBe(false)
    })
  })

  describe('createSpeciesSchema', () => {
    it('should validate valid species data', () => {
      const result = schemas.createSpeciesSchema.safeParse({
        scientificName: 'Scylla serrata',
        commonName: 'Blue Mud Crab',
        description: 'A large mud crab species',
        keyFeatures: [{ trait: 'Color', value: 'Blue' }],
        images: ['https://example.com/image.jpg'],
        distributionZones: [
          { name: 'Zone A', polygon: [[4.0, 101.0], [4.5, 101.0], [4.5, 101.5], [4.0, 101.5]] },
        ],
      })
      expect(result.success).toBe(true)
    })

    it('should fail when scientificName is empty', () => {
      const result = schemas.createSpeciesSchema.safeParse({
        scientificName: '',
        commonName: 'Blue Mud Crab',
        description: 'A large mud crab species',
        keyFeatures: [],
        images: ['https://example.com/image.jpg'],
        distributionZones: [],
      })
      expect(result.success).toBe(false)
    })
  })
})
