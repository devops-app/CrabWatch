import {
  formatDate,
  formatDateTime,
  formatNumber,
  formatCoordinates,
  formatConditionFactor,
  formatGender,
  formatMaturationStatus,
  formatStatus,
} from '../../utils/formatters'

describe('formatters', () => {
  describe('formatDate', () => {
    it('formats a Date object', () => {
      const date = new Date(2024, 5, 15)
      const result = formatDate(date)
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
    })

    it('formats a date string', () => {
      const result = formatDate('2024-06-15')
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
    })

    it('includes year, month, and day', () => {
      const result = formatDate('2024-06-15')
      expect(result).toMatch(/\d{4}/)
    })
  })

  describe('formatDateTime', () => {
    it('includes time information', () => {
      const result = formatDateTime('2024-06-15T10:30:00Z')
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
    })

    it('formats a Date object', () => {
      const date = new Date(2024, 5, 15, 10, 30)
      const result = formatDateTime(date)
      expect(result).toBeDefined()
    })
  })

  describe('formatNumber', () => {
    it('formats with default 1 decimal', () => {
      expect(formatNumber(12.345)).toBe('12.3')
    })

    it('formats with specified decimals', () => {
      expect(formatNumber(12.345, 2)).toBe('12.35')
    })

    it('formats with 0 decimals', () => {
      expect(formatNumber(12.345, 0)).toBe('12')
    })

    it('handles zero', () => {
      expect(formatNumber(0, 2)).toBe('0.00')
    })
  })

  describe('formatCoordinates', () => {
    it('formats latitude and longitude', () => {
      expect(formatCoordinates(3.139, 101.6869)).toBe('3.1390, 101.6869')
    })

    it('handles negative coordinates', () => {
      expect(formatCoordinates(-33.8688, 151.2093)).toBe('-33.8688, 151.2093')
    })

    it('handles zero coordinates', () => {
      expect(formatCoordinates(0, 0)).toBe('0.0000, 0.0000')
    })
  })

  describe('formatConditionFactor', () => {
    it('calculates condition factor from CW and BW', () => {
      const result = formatConditionFactor(10, 100)
      expect(result).toBe('10.00')
    })

    it('handles different values', () => {
      const result = formatConditionFactor(5, 50)
      expect(result).toBe('40.00')
    })

    it('returns 2 decimal places', () => {
      const result = formatConditionFactor(7, 100)
      expect(result).toMatch(/^\d+\.\d{2}$/)
    })
  })

 describe('formatGender', () => {
    it('formats male correctly', () => {
      expect(formatGender('male')).toBe('Male')
      expect(formatGender('female')).toBe('Female')
      expect(formatGender('unknown')).toBe('Unknown')
    })

    it('handles uppercase values', () => {
      expect(formatGender('MALE')).toBe('Male')
      expect(formatGender('FEMALE')).toBe('Female')
      expect(formatGender('UNKNOWN')).toBe('Unknown')
    })

    it('returns unknown for invalid values', () => {
      expect(formatGender('other')).toBe('other')
    })
  })

  describe('formatMaturationStatus', () => {
    it('formats lowercase values', () => {
      expect(formatMaturationStatus('mature')).toBe('Mature')
      expect(formatMaturationStatus('immature')).toBe('Immature')
      expect(formatMaturationStatus('unknown')).toBe('Unknown')
    })

    it('formats uppercase values', () => {
      expect(formatMaturationStatus('MATURE')).toBe('Mature')
      expect(formatMaturationStatus('IMMATURE')).toBe('Immature')
      expect(formatMaturationStatus('UNKNOWN')).toBe('Unknown')
    })

    it('returns unknown value as-is', () => {
      expect(formatMaturationStatus('other')).toBe('other')
    })
  })

  describe('formatStatus', () => {
    it('formats known statuses', () => {
      expect(formatStatus('pending')).toBe('Pending')
      expect(formatStatus('approved')).toBe('Approved')
      expect(formatStatus('rejected')).toBe('Rejected')
    })

    it('returns unknown value as-is', () => {
      expect(formatStatus('other')).toBe('other')
    })
  })
})
