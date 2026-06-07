import { api } from '../api'

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('api', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
  })

  const mockResponse = (data: unknown, status = 200) => {
    mockFetch.mockResolvedValue({
      ok: status < 400,
      status,
      json: async () => ({ success: status < 400, data }),
    } as Response)
  }

  describe('request', () => {
    it('should make GET request with correct URL', async () => {
      mockResponse({ id: '1', name: 'Test' })

      await api.getSpecies('1')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/species/1',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('should make POST request with body', async () => {
      mockResponse({ id: '1', name: 'New Species' })

      await api.createSpecies({
        scientificName: 'Test',
        commonName: 'Test Crab',
        description: 'Test',
        keyFeatures: [],
        images: [],
        distributionZones: [],
      })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/species',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            scientificName: 'Test',
            commonName: 'Test Crab',
            description: 'Test',
            keyFeatures: [],
            images: [],
            distributionZones: [],
          }),
        })
      )
    })

    it('should include credentials for cookie-based auth', async () => {
      mockResponse({ id: '1' })

      await api.getSpecies('1')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'include',
        })
      )
    })

    it('should throw on non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ success: false, error: 'Not found' }),
      } as Response)

      await expect(api.getSpecies('1')).rejects.toThrow('Not found')
    })

    it('should throw on server error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ success: false, error: 'Server error' }),
      } as Response)

      await expect(api.getSpecies('1')).rejects.toThrow('Server error')
    })
  })

  describe('auth endpoints', () => {
    it('should register user', async () => {
      mockResponse({ id: '1', name: 'Test' })

      await api.register({
        name: 'Test',
        email: 'test@example.com',
        password: 'password123',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/users/register',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'Test',
            email: 'test@example.com',
            password: 'password123',
          }),
        })
      )
    })

    it('should get profile', async () => {
      mockResponse({ id: '1', name: 'Test' })

      await api.getProfile()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/users/me',
        expect.any(Object)
      )
    })

    it('should update profile', async () => {
      mockResponse({ id: '1', name: 'Updated' })

      await api.updateProfile({ name: 'Updated' })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/users/me',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ name: 'Updated' }),
        })
      )
    })
  })

  describe('species endpoints', () => {
    it('should list species', async () => {
      mockResponse([{ id: '1', scientificName: 'Test' }])

      await api.listSpecies()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/species',
        expect.any(Object)
      )
    })

    it('should get species by id', async () => {
      mockResponse({ id: '1', scientificName: 'Test' })

      await api.getSpecies('1')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/species/1',
        expect.any(Object)
      )
    })

    it('should delete species', async () => {
      mockResponse({ id: '1', deleted: true })

      await api.deleteSpecies('1')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/species/1',
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  describe('observation endpoints', () => {
    it('should create observation', async () => {
      mockResponse({ id: '1', status: 'pending' })

      await api.createObservation({
        speciesId: '1',
        cw: 100,
        bw: 80,
gender: 'M',
        maturationStatus: 'A1',
        lat: 3.139,
        lng: 101.687,
        locationMethod: 'auto',
        photos: ['photo1.jpg'],
        notes: 'Test observation',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/observations',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    it('should list observations with query params', async () => {
      mockResponse({ observations: [], total: 0, page: 1, limit: 10 })

      await api.listObservations({ page: 2, limit: 20, status: 'APPROVED' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/observations?page=2&limit=20&status=APPROVED'),
        expect.any(Object)
      )
    })

    it('should get pending observations', async () => {
      mockResponse({ observations: [], total: 0, page: 1, limit: 10 })

      await api.getPendingObservations({ page: 1, limit: 10 })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/observations/pending?page=1&limit=10'),
        expect.any(Object)
      )
    })

    it('should validate observation', async () => {
      mockResponse({ id: '1', status: 'approved' })

      await api.validateObservation('1', { status: 'approved' })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/observations/1/validate',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'approved' }),
        })
      )
    })
  })

  describe('analytics endpoints', () => {
    it('should get dashboard stats', async () => {
      mockResponse({ totalObservations: 100, totalSpecies: 3 })

      await api.getDashboardStats()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/analytics/stats',
        expect.any(Object)
      )
    })

    it('should get size frequency with species filter', async () => {
      mockResponse([{ sizeBin: '80-90', count: 10 }])

      await api.getSizeFrequency({ speciesId: '1', gender: 'M' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/analytics/size-frequency?speciesId=1&gender=M'),
        expect.any(Object)
      )
    })

    it('should get gender ratio', async () => {
      mockResponse([{ gender: 'M', count: 50, percentage: 50 }])

      await api.getGenderRatio({ speciesId: '1' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/analytics/gender-ratio?speciesId=1'),
        expect.any(Object)
      )
    })

    it('should get condition indices', async () => {
      mockResponse([{ month: '2024-01', index: 0.8 }])

      await api.getConditionIndices({ speciesId: '1' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/analytics/condition-indices?speciesId=1'),
        expect.any(Object)
      )
    })

    it('should get CW50', async () => {
      mockResponse([{ cw50: 90 }])

      await api.getCW50({ speciesId: '1' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/analytics/cw50?speciesId=1'),
        expect.any(Object)
      )
    })

    it('should get temporal trends', async () => {
      mockResponse([{ month: '2024-01', count: 50 }])

      await api.getTemporalTrends({ speciesId: '1' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/analytics/temporal-trends?speciesId=1'),
        expect.any(Object)
      )
    })
  })

  describe('analysis endpoints', () => {
    it('preserves crabCoveragePct from analyzeCrab response', async () => {
      const analysis = {
        speciesId: 'unknown',
        speciesName: 'Unknown Species',
        confidence: 0.72,
        estimatedCW: null,
        estimatedBW: null,
        gender: 'unknown',
        maturationStatus: 'unknown',
        detectedCoin: null,
        coinConfidence: 0,
        crabCount: 1,
        crabCoveragePct: 22.5,
        suggestions: ['Crab appears too small in frame (22.5%)'],
        rawAnalysis: '',
      }
      mockResponse(analysis)

      const result = await api.analyzeCrab({
        photoUrls: ['https://example.com/a.jpg'],
        views: ['dorsal'],
      })

      expect(result.crabCoveragePct).toBe(22.5)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/analyze/crab'),
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  describe('user admin endpoints', () => {
    it('should list users with filters', async () => {
      mockResponse({ users: [], total: 0, page: 1, limit: 20 })

      await api.listUsers({ page: 1, limit: 10, role: 'admin' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/users?page=1&limit=10&role=admin'),
        expect.any(Object)
      )
    })

    it('should update user role', async () => {
      mockResponse({ id: '1', role: 'admin' })

      await api.updateUserRole('1', 'admin')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/users/1/role',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ role: 'admin' }),
        })
      )
    })
  })

  describe('upload endpoints', () => {
    it('should get upload URL', async () => {
      mockResponse({ url: 'https://example.com/upload' })

      await api.getUploadUrl('test.jpg', 'image/jpeg')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/upload/url',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ fileName: 'test.jpg', contentType: 'image/jpeg' }),
        })
      )
    })
  })
})
