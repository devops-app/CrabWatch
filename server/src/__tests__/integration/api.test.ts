import request from 'supertest'
import app from './test-app'
import prisma from '../../config/database'
import {
  seedTestUser,
  cleanupTestUsers,
  cleanupTestSpecies,
  seedTestSpecies,
  cleanupBySpeciesId,
} from './db'

describe('Auth Integration', () => {
  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials and return JWT token', async () => {
      const user = await seedTestUser({
        email: 'auth-test@test.com',
        password: 'password123',
        name: 'Auth Test',
        role: 'USER',
      })

      try {
        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: user.email, password: user.password })
          .expect(200)

        expect(res.body.success).toBe(true)
        expect(res.body.data.token).toBeDefined()
        expect(res.body.data.user.email).toBe(user.email)
        expect(res.body.data.user.role).toBe('user')
      } finally {
        await cleanupTestUsers([user.email])
      }
    })

    it('should return 401 for non-existent user (prevents enumeration)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'password123' })
        .expect(401)

      expect(res.body.success).toBe(false)
      expect(res.body.error).toBe('Invalid credentials')
    })

    it('should return 401 for wrong password', async () => {
      const user = await seedTestUser({
        email: 'wrong-pass@test.com',
        password: 'password123',
      })

      try {
        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: user.email, password: 'wrongpassword' })
          .expect(401)

        expect(res.body.success).toBe(false)
        expect(res.body.error).toBe('Invalid credentials')
      } finally {
        await cleanupTestUsers([user.email])
      }
    })

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'not-an-email', password: 'password123' })
        .expect(400)

      expect(res.body.success).toBe(false)
    })

    it('should reject short password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@test.com', password: 'short' })
        .expect(400)

      expect(res.body.success).toBe(false)
    })
  })

  describe('POST /api/v1/auth/verify', () => {
    it('should verify a valid token', async () => {
      const user = await seedTestUser({
        email: 'verify-test@test.com',
        password: 'password123',
      })

      try {
        const loginRes = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: user.email, password: user.password })

        const token = loginRes.body.data.token

        const verifyRes = await request(app)
          .post('/api/v1/auth/verify')
          .send({ token })
          .expect(200)

        expect(verifyRes.body.success).toBe(true)
        expect(verifyRes.body.data.uid).toBeDefined()
      } finally {
        await cleanupTestUsers([user.email])
      }
    })

    it('should reject an invalid token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify')
        .send({ token: 'invalid.token.here' })
        .expect(401)

      expect(res.body.success).toBe(false)
      expect(res.body.error).toBe('Invalid token')
    })
  })
})

describe('Observations Integration', () => {
  let userToken: string
  let researcherToken: string
  let speciesId: string
  let userEmail: string
  let researcherEmail: string

  beforeAll(async () => {
    const species = await seedTestSpecies({
      scientificName: `TestSpecies_${Date.now()}`,
      commonName: 'Integration Test Crab',
    })
    speciesId = species.id

    const user = await seedTestUser({
      email: `obs-user-${Date.now()}@test.com`,
      password: 'password123',
      role: 'USER',
    })
    userEmail = user.email

    const userLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: user.password })
    userToken = userLogin.body.data.token

    const researcher = await seedTestUser({
      email: `obs-researcher-${Date.now()}@test.com`,
      password: 'password123',
      role: 'RESEARCHER',
    })
    researcherEmail = researcher.email

    const researcherLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: researcher.email, password: researcher.password })
    researcherToken = researcherLogin.body.data.token
  })

  afterAll(async () => {
    await cleanupTestUsers([userEmail, researcherEmail])
    await cleanupBySpeciesId(speciesId)
  })

  describe('POST /api/v1/observations', () => {
    it('should create observation with valid data', async () => {
      const res = await request(app)
        .post('/api/v1/observations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          speciesId,
          cw: 5.5,
          bw: 100,
          gender: 'MALE',
          maturationStatus: 'MATURE',
          lat: 4.2,
          lng: 101.9,
          locationMethod: 'GPS',
          photos: ['https://example.com/photo.jpg'],
          notes: 'Test observation',
        })
        .expect(201)

      expect(res.body.success).toBe(true)
      expect(res.body.data.species.scientificName).toContain('TestSpecies_')
      expect(res.body.data.status).toBe('pending')
    })

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/v1/observations')
        .send({ speciesId: 'test' })
        .expect(401)

      expect(res.body.success).toBe(false)
    })

    it('should reject invalid speciesId', async () => {
      const res = await request(app)
        .post('/api/v1/observations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          speciesId: 'not-a-uuid',
          cw: 5.5,
          bw: 100,
          gender: 'MALE',
          maturationStatus: 'MATURE',
          lat: 4.2,
          lng: 101.9,
          locationMethod: 'GPS',
          photos: [],
        })
        .expect(400)

      expect(res.body.success).toBe(false)
    })
  })

  describe('GET /api/v1/observations', () => {
    it('should list user observations', async () => {
      const res = await request(app)
        .get('/api/v1/observations')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.observations).toBeDefined()
      expect(res.body.data.total).toBeDefined()
    })

    it('should filter by speciesId', async () => {
      const res = await request(app)
        .get(`/api/v1/observations?speciesId=${speciesId}`)
        .set('Authorization', `Bearer ${researcherToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
    })
  })

  describe('GET /api/v1/observations/pending', () => {
    it('should require researcher or admin role', async () => {
      const res = await request(app)
        .get('/api/v1/observations/pending')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403)

      expect(res.body.success).toBe(false)
    })

    it('should return pending observations for researcher', async () => {
      const res = await request(app)
        .get('/api/v1/observations/pending')
        .set('Authorization', `Bearer ${researcherToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
    })
  })

  describe('PATCH /api/v1/observations/:id/validate', () => {
    it('should approve observation', async () => {
      const observation = await prisma.observation.findFirst({
        where: { speciesId },
        include: { user: true, species: true },
      })

      if (!observation) {
        return
      }

      const res = await request(app)
        .patch(`/api/v1/observations/${observation.id}/validate`)
        .set('Authorization', `Bearer ${researcherToken}`)
        .send({ status: 'APPROVED' })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.status).toBe('approved')
    })
  })
})

describe('Species Integration', () => {
  let adminToken: string
  let adminEmail: string

  beforeAll(async () => {
    const admin = await seedTestUser({
      email: `species-admin-${Date.now()}@test.com`,
      password: 'password123',
      role: 'ADMIN',
    })
    adminEmail = admin.email

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: admin.email, password: admin.password })
    adminToken = loginRes.body.data.token
  })

  afterAll(async () => {
    await cleanupTestUsers([adminEmail])
  })

  describe('GET /api/v1/species', () => {
    it('should list all species without auth', async () => {
      const res = await request(app).get('/api/v1/species').expect(200)

      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data)).toBe(true)
    })
  })

  describe('POST /api/v1/species', () => {
    it('should create species as admin', async () => {
      const scientificName = `TestGenus_${Date.now()}`

      const res = await request(app)
        .post('/api/v1/species')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          scientificName,
          commonName: 'Test Species',
          description: 'A test species for integration tests',
          keyFeatures: [{ trait: 'color', value: 'blue' }],
          images: ['https://example.com/species.jpg'],
          distributionZones: [{ name: 'Test Zone', polygon: [[0, 0], [1, 0], [1, 1], [0, 1]] }],
        })
        .expect(201)

      expect(res.body.success).toBe(true)
      expect(res.body.data.scientificName).toBe(scientificName)

      await cleanupTestSpecies([scientificName])
    })

    it('should reject non-admin user', async () => {
      const user = await seedTestUser({
        email: `species-user-${Date.now()}@test.com`,
        password: 'password123',
        role: 'USER',
      })

      try {
        const loginRes = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: user.email, password: user.password })

        await request(app)
          .post('/api/v1/species')
          .set('Authorization', `Bearer ${loginRes.body.data.token}`)
          .send({
            scientificName: 'ShouldFail',
            commonName: 'Fail',
            description: 'Fail',
            keyFeatures: [],
            images: [],
            distributionZones: [],
          })
          .expect(403)
      } finally {
        await cleanupTestUsers([user.email])
      }
    })
  })
})

describe('Users Integration', () => {
  let userToken: string
  let userEmail: string

  beforeAll(async () => {
    const user = await seedTestUser({
      email: `user-profile-${Date.now()}@test.com`,
      password: 'password123',
      name: 'Profile Test User',
    })
    userEmail = user.email

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: user.password })
    userToken = loginRes.body.data.token
  })

  afterAll(async () => {
    await cleanupTestUsers([userEmail])
  })

  describe('GET /api/v1/users/me', () => {
    it('should return user profile', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.email).toBe(userEmail)
    })

    it('should reject without auth', async () => {
      await request(app).get('/api/v1/users/me').expect(401)
    })
  })

  describe('PATCH /api/v1/users/me', () => {
    it('should update user name', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Updated Name' })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.name).toBe('Updated Name')
    })
  })

  describe('POST /api/v1/users/register', () => {
    it('should register a new user', async () => {
      const email = `register-${Date.now()}@test.com`

      const res = await request(app)
        .post('/api/v1/users/register')
        .send({
          name: 'New User',
          email,
          password: 'password123',
        })
        .expect(201)

      expect(res.body.success).toBe(true)
      expect(res.body.data.email).toBe(email)

      await cleanupTestUsers([email])
    })

    it('should reject duplicate email', async () => {
      const email = `dup-${Date.now()}@test.com`

      await request(app)
        .post('/api/v1/users/register')
        .send({ name: 'First', email, password: 'password123' })

      await request(app)
        .post('/api/v1/users/register')
        .send({ name: 'Second', email, password: 'password123' })
        .expect(400)

      await cleanupTestUsers([email])
    })
  })
})

describe('Health Check', () => {
  it('should return ok status', async () => {
    const res = await request(app).get('/health').expect(200)

    expect(res.body.status).toBe('ok')
    expect(res.body.timestamp).toBeDefined()
  })
})

describe('Swagger Endpoints', () => {
  describe('GET /api/v1/docs-json', () => {
    it('should return OpenAPI JSON spec', async () => {
      const res = await request(app).get('/api/v1/docs-json').expect(200)

      expect(res.header['content-type']).toMatch(/json/)
      expect(res.body.openapi).toBe('3.0.0')
      expect(res.body.info.title).toBe('CrabWatch API')
      expect(res.body.info.version).toBe('1.0.0')
      expect(res.body.info.description).toContain('Malaysian Crab Population Monitoring System')
    })

    it('should include server definition', async () => {
      const res = await request(app).get('/api/v1/docs-json').expect(200)

      expect(Array.isArray(res.body.servers)).toBe(true)
      expect(res.body.servers.length).toBeGreaterThan(0)
      expect(res.body.servers[0].url).toContain('localhost')
    })

    it('should define security schemes', async () => {
      const res = await request(app).get('/api/v1/docs-json').expect(200)

      expect(res.body.components.securitySchemes.bearerAuth).toBeDefined()
      expect(res.body.components.securitySchemes.bearerAuth.type).toBe('http')
      expect(res.body.components.securitySchemes.bearerAuth.scheme).toBe('bearer')
      expect(res.body.components.securitySchemes.bearerAuth.bearerFormat).toBe('JWT')
    })

    it('should define component schemas', async () => {
      const res = await request(app).get('/api/v1/docs-json').expect(200)

      expect(res.body.components.schemas.User).toBeDefined()
      expect(res.body.components.schemas.Species).toBeDefined()
      expect(res.body.components.schemas.Observation).toBeDefined()
      expect(res.body.components.schemas.Pagination).toBeDefined()
      expect(res.body.components.schemas.Error).toBeDefined()
    })

    it('should include all API paths', async () => {
      const res = await request(app).get('/api/v1/docs-json').expect(200)

      const paths = Object.keys(res.body.paths)

      expect(paths).toContain('/api/auth/login')
      expect(paths).toContain('/api/auth/verify')
      expect(paths).toContain('/api/users/me')
      expect(paths).toContain('/api/users/register')
      expect(paths).toContain('/api/species')
      expect(paths).toContain('/api/species/{id}')
      expect(paths).toContain('/api/observations')
      expect(paths).toContain('/api/observations/pending')
      expect(paths).toContain('/api/observations/{id}')
      expect(paths).toContain('/api/observations/{id}/validate')
      expect(paths).toContain('/api/analytics/stats')
      expect(paths).toContain('/api/analytics/size-frequency')
      expect(paths).toContain('/api/analytics/gender-ratio')
      expect(paths).toContain('/api/analytics/condition-indices')
      expect(paths).toContain('/api/analytics/cw50')
      expect(paths).toContain('/api/analytics/temporal-trends')
      expect(paths).toContain('/api/upload/url')
      expect(paths).toContain('/api/upload')
    })

    it('should have correct path count', async () => {
      const res = await request(app).get('/api/v1/docs-json').expect(200)

      const pathCount = Object.keys(res.body.paths).length
      expect(pathCount).toBeGreaterThanOrEqual(15)
    })

    it('should define User schema with required fields', async () => {
      const res = await request(app).get('/api/v1/docs-json').expect(200)

      const userSchema = res.body.components.schemas.User
      expect(userSchema.required).toContain('id')
      expect(userSchema.required).toContain('name')
      expect(userSchema.required).toContain('email')
      expect(userSchema.required).toContain('role')
      expect(userSchema.properties.role.enum).toEqual(['user', 'researcher', 'admin'])
    })

    it('should define Observation schema with required fields', async () => {
      const res = await request(app).get('/api/v1/docs-json').expect(200)

      const obsSchema = res.body.components.schemas.Observation
      expect(obsSchema.required).toContain('id')
      expect(obsSchema.required).toContain('userId')
      expect(obsSchema.required).toContain('speciesId')
      expect(obsSchema.required).toContain('cw')
      expect(obsSchema.required).toContain('bw')
      expect(obsSchema.required).toContain('gender')
      expect(obsSchema.required).toContain('maturationStatus')
      expect(obsSchema.required).toContain('lat')
      expect(obsSchema.required).toContain('lng')
    })
  })

  describe('GET /api/v1/docs/', () => {
    it('should return Swagger UI HTML page', async () => {
      const res = await request(app).get('/api/v1/docs/').expect(200)

      expect(res.header['content-type']).toMatch(/html/)
      expect(res.text).toContain('CrabWatch API Docs')
      expect(res.text).toContain('swagger-ui')
    })

    it('should include custom CSS to hide topbar', async () => {
      const res = await request(app).get('/api/v1/docs/').expect(200)

      expect(res.text).toContain('.swagger-ui .topbar')
      expect(res.text).toContain('display: none')
    })

    it('should include swagger-ui initialization script', async () => {
      const res = await request(app).get('/api/v1/docs/').expect(200)

      expect(res.text).toContain('swagger-ui-init.js')
      expect(res.text).toContain('swagger-ui-bundle.js')
      expect(res.text).toContain('swagger-ui-standalone-preset.js')
    })

    it('should redirect /api/v1/docs to /api/v1/docs/', async () => {
      await request(app).get('/api/v1/docs').expect(301)
    })
  })

  describe('Swagger path details', () => {
    let swaggerSpec: Record<string, unknown>

    beforeAll(async () => {
      const res = await request(app).get('/api/v1/docs-json')
      swaggerSpec = res.body
    })

    it('should define login endpoint with POST', () => {
      expect(swaggerSpec.paths['/api/auth/login'].post).toBeDefined()
      expect(swaggerSpec.paths['/api/auth/login'].post.tags).toEqual(['Auth'])
      expect(swaggerSpec.paths['/api/auth/login'].post.summary).toMatch(/login/i)
    })

    it('should define create observation with POST', () => {
      expect(swaggerSpec.paths['/api/observations'].post).toBeDefined()
      expect(swaggerSpec.paths['/api/observations'].post.tags).toEqual(['Observations'])
    })

    it('should define list observations with GET', () => {
      expect(swaggerSpec.paths['/api/observations'].get).toBeDefined()
      expect(swaggerSpec.paths['/api/observations'].get.tags).toEqual(['Observations'])
    })

    it('should define pending observations with role requirement', () => {
      const pending = swaggerSpec.paths['/api/observations/pending'].get
      expect(pending).toBeDefined()
      expect(pending.responses['403'].description).toContain('Researcher/Admin')
    })

    it('should define validate observation with PATCH', () => {
      expect(swaggerSpec.paths['/api/observations/{id}/validate'].patch).toBeDefined()
      expect(swaggerSpec.paths['/api/observations/{id}/validate'].patch.tags).toEqual(['Observations'])
    })

    it('should define analytics endpoints with Researcher/Admin requirement', () => {
      const analyticsPaths = [
        '/api/analytics/stats',
        '/api/analytics/size-frequency',
        '/api/analytics/gender-ratio',
        '/api/analytics/condition-indices',
        '/api/analytics/cw50',
        '/api/analytics/temporal-trends',
      ]

      analyticsPaths.forEach(path => {
        expect(swaggerSpec.paths[path].get).toBeDefined()
        expect(swaggerSpec.paths[path].get.tags).toEqual(['Analytics'])
        expect(swaggerSpec.paths[path].get.responses['403'].description).toContain('Researcher/Admin')
      })
    })

    it('should define species CRUD endpoints', () => {
      expect(swaggerSpec.paths['/api/species'].get).toBeDefined()
      expect(swaggerSpec.paths['/api/species'].post).toBeDefined()
      expect(swaggerSpec.paths['/api/species/{id}'].get).toBeDefined()
      expect(swaggerSpec.paths['/api/species/{id}'].patch).toBeDefined()
      expect(swaggerSpec.paths['/api/species/{id}'].delete).toBeDefined()

      expect(swaggerSpec.paths['/api/species'].post.responses['403'].description).toBe('Admin only')
      expect(swaggerSpec.paths['/api/species/{id}'].patch.responses['403'].description).toBe('Admin only')
      expect(swaggerSpec.paths['/api/species/{id}'].delete.responses['403'].description).toBe('Admin only')
    })

    it('should define upload endpoints', () => {
      expect(swaggerSpec.paths['/api/upload/url'].post).toBeDefined()
      expect(swaggerSpec.paths['/api/upload'].post).toBeDefined()
      expect(swaggerSpec.paths['/api/upload/url'].post.tags).toEqual(['Upload'])
    })

    it('should have security disabled for public species endpoints', () => {
      expect(swaggerSpec.paths['/api/species'].get.security).toEqual([])
      expect(swaggerSpec.paths['/api/species/{id}'].get.security).toEqual([])
    })

    it('should define observation request body schema', () => {
      const createObs = swaggerSpec.paths['/api/observations'].post.requestBody
      expect(createObs.required).toBe(true)
      const schema = createObs.content['application/json'].schema
      expect(schema.required).toContain('speciesId')
      expect(schema.required).toContain('cw')
      expect(schema.required).toContain('bw')
      expect(schema.required).toContain('gender')
      expect(schema.required).toContain('maturationStatus')
      expect(schema.required).toContain('lat')
      expect(schema.required).toContain('lng')
      expect(schema.required).toContain('locationMethod')
    })

    it('should define correct response codes for endpoints', () => {
      expect(swaggerSpec.paths['/api/auth/login'].post.responses['200']).toBeDefined()
      expect(swaggerSpec.paths['/api/auth/login'].post.responses['401']).toBeDefined()
      expect(swaggerSpec.paths['/api/auth/login'].post.responses['404']).toBeDefined()

      expect(swaggerSpec.paths['/api/observations'].post.responses['201']).toBeDefined()
      expect(swaggerSpec.paths['/api/observations'].post.responses['400']).toBeDefined()

      expect(swaggerSpec.paths['/api/species'].post.responses['201']).toBeDefined()
      expect(swaggerSpec.paths['/api/species'].post.responses['400']).toBeDefined()
      expect(swaggerSpec.paths['/api/species'].post.responses['403']).toBeDefined()
    })

    it('should define query parameters for list observations', () => {
      const params = swaggerSpec.paths['/api/observations'].get.parameters
      const paramNames = params.map((p: { name: string }) => p.name)
      expect(paramNames).toContain('page')
      expect(paramNames).toContain('limit')
      expect(paramNames).toContain('speciesId')
      expect(paramNames).toContain('status')
    })

    it('should define query parameters for analytics endpoints', () => {
      const sizeFreqParams = swaggerSpec.paths['/api/analytics/size-frequency'].get.parameters
      const sizeFreqNames = sizeFreqParams.map((p: { name: string }) => p.name)
      expect(sizeFreqNames).toContain('speciesId')
      expect(sizeFreqNames).toContain('gender')

      const genderRatioParams = swaggerSpec.paths['/api/analytics/gender-ratio'].get.parameters
      const genderRatioNames = genderRatioParams.map((p: { name: string }) => p.name)
      expect(genderRatioNames).toContain('speciesId')
      expect(genderRatioNames).toContain('dateFrom')
      expect(genderRatioNames).toContain('dateTo')
    })
  })
})
