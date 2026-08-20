import {
  loginSchema,
  registerSchema,
  observationSchema,
  profileSchema,
} from '../../utils/validators'

describe('validators', () => {
  describe('loginSchema', () => {
    it('validates correct login data', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid email', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'password123',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email')
      }
    })

    it('rejects empty password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: '',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('registerSchema', () => {
    const validRegistration = {
      name: 'John Doe',
      email: 'john@example.com',
      phoneCode: '+60',
      phoneNumber: '123456789',
      addressLine1: '123 Jalan Test',
      state: 'Selangor',
      postcode: '40000',
      country: 'Malaysia',
      password: 'password123',
      confirmPassword: 'password123',
      consentAccepted: true,
    }

    it('validates correct registration data', () => {
      const result = registerSchema.safeParse(validRegistration)
      expect(result.success).toBe(true)
    })

    it('rejects name that is too long', () => {
      const result = registerSchema.safeParse({
        ...validRegistration,
        name: 'a'.repeat(101),
      })
      expect(result.success).toBe(false)
    })

    it('rejects password shorter than 8 characters', () => {
      const result = registerSchema.safeParse({
        ...validRegistration,
        password: 'short',
        confirmPassword: 'short',
      })
      expect(result.success).toBe(false)
    })

    it('rejects mismatched passwords', () => {
      const result = registerSchema.safeParse({
        ...validRegistration,
        password: 'password123',
        confirmPassword: 'different',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.message === 'Passwords do not match')).toBe(true)
      }
    })

    it('rejects missing consent', () => {
      const result = registerSchema.safeParse({
        ...validRegistration,
        consentAccepted: false,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('observationSchema', () => {
    const validObservation = {
      speciesId: 'species-1',
      cw: 10,
      bw: 500,
      gender: 'male' as const,
      maturationStatus: 'mature' as const,
      lat: 3.139,
      lng: 101.6869,
      locationMethod: 'gps' as const,
      photos: ['photo1.jpg'],
    }

    it('validates correct observation data', () => {
      const result = observationSchema.safeParse(validObservation)
      expect(result.success).toBe(true)
    })

    it('rejects missing speciesId', () => {
      const data = { ...validObservation, speciesId: '' }
      const result = observationSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('rejects negative carapace width', () => {
      const data = { ...validObservation, cw: -5 }
      const result = observationSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('rejects carapace width over maximum', () => {
      const data = { ...validObservation, cw: 51 }
      const result = observationSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('rejects body weight over maximum', () => {
      const data = { ...validObservation, bw: 5001 }
      const result = observationSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('rejects invalid gender', () => {
      const data = { ...validObservation, gender: 'other' as unknown as 'male' }
      const result = observationSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('rejects latitude out of range', () => {
      const data = { ...validObservation, lat: 91 }
      const result = observationSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('rejects longitude out of range', () => {
      const data = { ...validObservation, lng: 181 }
      const result = observationSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('rejects empty photos array', () => {
      const data = { ...validObservation, photos: [] }
      const result = observationSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('rejects more than 5 photos', () => {
      const data = { ...validObservation, photos: ['a', 'b', 'c', 'd', 'e', 'f'] }
      const result = observationSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('accepts optional notes', () => {
      const data = { ...validObservation, notes: 'Some notes about the crab' }
      const result = observationSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('rejects notes over 1000 characters', () => {
      const data = { ...validObservation, notes: 'a'.repeat(1001) }
      const result = observationSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('profileSchema', () => {
    it('validates correct profile data', () => {
      const result = profileSchema.safeParse({
        name: 'John Doe',
      })
      expect(result.success).toBe(true)
    })

    it('accepts valid avatar URL', () => {
      const result = profileSchema.safeParse({
        name: 'John',
        avatar: 'https://example.com/avatar.jpg',
      })
      expect(result.success).toBe(true)
    })

    it('accepts null avatar', () => {
      const result = profileSchema.safeParse({
        name: 'John',
        avatar: null,
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid avatar URL', () => {
      const result = profileSchema.safeParse({
        name: 'John',
        avatar: 'not-a-url',
      })
      expect(result.success).toBe(false)
    })

    it('rejects empty name', () => {
      const result = profileSchema.safeParse({
        name: '',
      })
      expect(result.success).toBe(false)
    })
  })
})
