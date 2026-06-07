import * as SecureStore from 'expo-secure-store'
import { api } from '../api'

jest.mock('expo-secure-store')

const mockFetch = fetch as jest.MockedFunction<typeof fetch>

beforeEach(() => {
  jest.clearAllMocks()
  mockFetch.mockReset()
  jest.spyOn(SecureStore, 'getItemAsync').mockResolvedValue(null)
})

function mockResponse(data: unknown, status = 200) {
  mockFetch.mockResolvedValue({
    ok: status < 400,
    status,
    json: async () => ({ success: status < 400, data }),
  } as Response)
}

function mockError(message: string, status = 400) {
  mockFetch.mockResolvedValue({
    ok: false,
    status,
    json: async () => ({ success: false, error: message }),
  } as Response)
}

describe('api', () => {
  describe('register', () => {
    it('registers a new user', async () => {
      const user = { id: '1', name: 'Test', email: 'test@test.com',    role: 'user' }
      mockResponse(user)

      const result = await api.register('Test', 'test@test.com', 'password123')
      expect(result).toEqual(user)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/users/register',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'Test', email: 'test@test.com', password: 'password123' }),
        })
      )
    })
  })

  describe('getProfile', () => {
    it('gets current user profile', async () => {
      const user = { id: '1', name: 'Test', email: 'test@test.com',    role: 'user' }
      mockResponse(user)

      const result = await api.getProfile()
      expect(result).toEqual(user)
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/api/users/me', expect.any(Object))
    })
  })

  describe('updateProfile', () => {
    it('updates user profile', async () => {
      const user = { id: '1', name: 'Updated', email: 'test@test.com',    role: 'user' }
      mockResponse(user)

      const result = await api.updateProfile({ name: 'Updated' })
      expect(result).toEqual(user)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/users/me',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ name: 'Updated' }),
        })
      )
    })
  })

  describe('listSpecies', () => {
    it('lists all species', async () => {
      const species = [
        { id: '1', scientificName: 'Scylla serrata', commonName: 'Blue swimmer crab' },
        { id: '2', scientificName: 'Scylla paramamosain', commonName: 'Mud crab' },
      ]
      mockResponse(species)

      const result = await api.listSpecies()
      expect(result).toEqual(species)
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/api/species', expect.any(Object))
    })
  })

  describe('getSpecies', () => {
    it('gets a species by ID', async () => {
      const species = { id: '1', scientificName: 'Scylla serrata', commonName: 'Blue swimmer crab' }
      mockResponse(species)

      const result = await api.getSpecies('1')
      expect(result).toEqual(species)
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/api/species/1', expect.any(Object))
    })
  })

  describe('createObservation', () => {
    it('creates an observation', async () => {
      const obs = { id: '1', speciesId: '1', carapaceWidth: 10, status: 'pending' }
      mockResponse(obs)

      const result = await api.createObservation({
        speciesId: '1',
        cw: 10,
        bw: 100,
gender: 'male',
        maturationStatus: 'unknown',
        lat: 3.139,
        lng: 101.687,
        locationMethod: 'gps',
        photos: [],
      })
      expect(result).toEqual(obs)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/observations',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  describe('listObservations', () => {
    it('lists observations with filters', async () => {
      const result = { observations: [], total: 0, page: 1, totalPages: 1 }
      mockResponse(result)

      await api.listObservations({ speciesId: '1', page: 2, limit: 10 })
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/observations?'),
        expect.any(Object)
      )
    })

    it('lists observations without filters', async () => {
      const result = { observations: [], total: 0, page: 1, totalPages: 1 }
      mockResponse(result)

      await api.listObservations()
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/api/observations', expect.any(Object))
    })
  })

  describe('getObservation', () => {
    it('gets an observation by ID', async () => {
      const obs = { id: '1', speciesId: '1', carapaceWidth: 10 }
      mockResponse(obs)

      const result = await api.getObservation('1')
      expect(result).toEqual(obs)
    })
  })

  describe('getPendingObservations', () => {
    it('gets pending observations', async () => {
      const result = { observations: [], total: 0, page: 1, totalPages: 1 }
      mockResponse(result)

      await api.getPendingObservations()
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('status=pending'),
        expect.any(Object)
      )
    })

    it('gets pending observations with page', async () => {
      const result = { observations: [], total: 0, page: 2, totalPages: 1 }
      mockResponse(result)

      await api.getPendingObservations(2)
      const callUrl = (mockFetch.mock.calls[0][0] as string)
      expect(callUrl).toContain('status=pending')
      expect(callUrl).toContain('page=2')
    })
  })

  describe('validateObservation', () => {
    it('validates an observation', async () => {
      const obs = { id: '1', speciesId: '1', status: 'approved' }
      mockResponse(obs)

      const result = await api.validateObservation('1', { status: 'approved', rejectionReason: 'Valid' })
      expect(result).toEqual(obs)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/observations/1/validate',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'approved', rejectionReason: 'Valid' }),
        })
      )
    })
  })

  describe('error handling', () => {
    it('throws error on API failure', async () => {
      mockError('Not found', 404)

      await expect(api.getProfile()).rejects.toThrow('Not found')
    })

    it('throws error with status code', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ success: false }),
      } as Response)

      await expect(api.getProfile()).rejects.toThrow('API error: 500')
    })
  })

  describe('authentication', () => {
    it('includes auth token in request headers', async () => {
      jest.spyOn(SecureStore, 'getItemAsync').mockResolvedValue('test-token')
      mockResponse({ id: '1' })

      await api.getProfile()
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      )
    })
  })

  describe('analytics endpoints', () => {
    it('gets dashboard stats', async () => {
      const stats = { totalObservations: 100, totalSpecies: 3, totalUsers: 10 }
      mockResponse(stats)

      const result = await api.getDashboardStats()
      expect(result).toEqual(stats)
    })

    it('gets size frequency data', async () => {
      const data = [{ size: 10, count: 5 }]
      mockResponse(data)

      const result = await api.getSizeFrequency({ speciesId: '1' })
      expect(result).toEqual(data)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('speciesId=1'),
        expect.any(Object)
      )
    })

    it('gets sex ratio data', async () => {
      const data = [{ sex: 'male', count: 30 }]
      mockResponse(data)

      const result = await api.getGenderRatio()
      expect(result).toEqual(data)
    })

    it('gets CW50 data', async () => {
      const data = [{ speciesId: '1', cw50: 80 }]
      mockResponse(data)

      const result = await api.getCW50('1')
      expect(result).toEqual(data)
    })

    it('gets temporal trends', async () => {
      const data = [{ month: '01', count: 10 }]
      mockResponse(data)

      const result = await api.getTemporalTrends({ year: '2024' })
      expect(result).toEqual(data)
    })
  })

  describe('upload endpoint', () => {
    it('gets upload URL', async () => {
      const upload = { uploadUrl: 'https://example.com/upload', imageUrl: 'https://example.com/image.jpg' }
      mockResponse(upload)

      const result = await api.getUploadUrl('test.jpg', 'image/jpeg')
      expect(result).toEqual(upload)
    })
  })

  describe('admin endpoints', () => {
    it('lists users', async () => {
      const result = { users: [], total: 0 }
      mockResponse(result)

      await api.listUsers(1, 10)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=1&limit=10'),
        expect.any(Object)
      )
    })

    it('updates user role', async () => {
      const user = { id: '1', name: 'Test', role: 'RESEARCHER' }
      mockResponse(user)

      const result = await api.updateUserRole('1', 'RESEARCHER')
      expect(result).toEqual(user)
    })
  })

  describe('analysis endpoints', () => {
    it('preserves crabCoveragePct from analyzeCrab response', async () => {
      const analysis = {
        speciesId: 'unknown',
        speciesName: 'Unknown Species',
        confidence: 0.7,
        estimatedCW: null,
        estimatedBW: null,
        gender: 'unknown',
        maturationStatus: 'unknown',
        detectedCoin: null,
        coinConfidence: 0,
        crabCount: 1,
        crabCoveragePct: 18.75,
        suggestions: ['Coverage low'],
        rawAnalysis: '',
      }
      mockResponse(analysis)

      const result = await api.analyzeCrab({
        photoUrls: ['https://example.com/a.jpg'],
        views: ['dorsal'],
      })

      expect(result.crabCoveragePct).toBe(18.75)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/analyze/crab',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })
})
