import {
  API_URL,
  MAX_PHOTOS,
  CW_MAX,
  BW_MAX,
  NOTES_MAX_LENGTH,
  COLORS,
  GENDER_OPTIONS,
  MATURATION_OPTIONS,
  STATUS_COLORS,
} from '../../utils/constants'

describe('constants', () => {
  describe('API_URL', () => {
    it('is defined', () => {
      expect(API_URL).toBeDefined()
    })

    it('contains localhost', () => {
      expect(API_URL).toContain('localhost')
    })

    it('contains port 3001', () => {
      expect(API_URL).toContain('3001')
    })

    it('contains /api path', () => {
      expect(API_URL).toContain('/api')
    })
  })

  describe('limits', () => {
    it('sets MAX_PHOTOS to 5', () => {
      expect(MAX_PHOTOS).toBe(5)
    })

    it('sets CW_MAX to 50', () => {
      expect(CW_MAX).toBe(50)
    })

    it('sets BW_MAX to 5000', () => {
      expect(BW_MAX).toBe(5000)
    })

    it('sets NOTES_MAX_LENGTH to 1000', () => {
      expect(NOTES_MAX_LENGTH).toBe(1000)
    })
  })

  describe('COLORS', () => {
    it('defines primary color', () => {
      expect(COLORS.primary).toBe('#0284c7')
    })

    it('defines secondary color', () => {
      expect(COLORS.secondary).toBe('#0f766e')
    })

    it('defines accent color', () => {
      expect(COLORS.accent).toBe('#f59e0b')
    })

    it('defines error color', () => {
      expect(COLORS.error).toBe('#ef4444')
    })

    it('defines success color', () => {
      expect(COLORS.success).toBe('#22c55e')
    })

    it('defines warning color', () => {
      expect(COLORS.warning).toBe('#f59e0b')
    })

    it('defines all expected color keys', () => {
      const expectedKeys = [
        'primary', 'primaryDark', 'primaryLight',
        'secondary', 'secondaryLight',
        'accent', 'background', 'surface',
        'text', 'textSecondary', 'textLight',
        'border', 'error', 'errorLight',
        'success', 'successLight',
        'warning', 'warningLight',
        'pending', 'approved', 'rejected',
      ]
      expectedKeys.forEach((key) => {
        expect(COLORS).toHaveProperty(key)
        expect(typeof COLORS[key as keyof typeof COLORS]).toBe('string')
      })
    })
  })

 describe('GENDER_OPTIONS', () => {
    it('has three options', () => {
      expect(GENDER_OPTIONS).toHaveLength(3)
    })

    it('contains male option', () => {
      expect(GENDER_OPTIONS).toContainEqual({ label: 'Male', value: 'male' })
    })

    it('contains female option', () => {
      expect(GENDER_OPTIONS).toContainEqual({ label: 'Female', value: 'female' })
    })

    it('contains unknown option', () => {
      expect(GENDER_OPTIONS).toContainEqual({ label: 'Unknown', value: 'unknown' })
    })
  })

  describe('MATURATION_OPTIONS', () => {
    it('has 3 options', () => {
      expect(MATURATION_OPTIONS).toHaveLength(3)
    })

    it('includes mature option', () => {
      expect(MATURATION_OPTIONS).toContainEqual({ label: 'Mature', value: 'mature' })
    })

    it('includes immature option', () => {
      expect(MATURATION_OPTIONS).toContainEqual({ label: 'Immature', value: 'immature' })
    })

    it('includes unknown option', () => {
      expect(MATURATION_OPTIONS).toContainEqual({ label: 'Unknown', value: 'unknown' })
    })
  })

  describe('STATUS_COLORS', () => {
    it('maps pending to warning color', () => {
      expect(STATUS_COLORS.pending).toBe(COLORS.pending)
    })

    it('maps approved to success color', () => {
      expect(STATUS_COLORS.approved).toBe(COLORS.approved)
    })

    it('maps rejected to error color', () => {
      expect(STATUS_COLORS.rejected).toBe(COLORS.rejected)
    })
  })
})
