import { test, expect, request as playwrightRequest } from '@playwright/test'
import { LoginPage } from './pages/LoginPage'
import { testUsers } from './fixtures/users'

const API_URL = process.env.API_URL || 'http://localhost:3001'

async function loginAs(page: import('@playwright/test').Page, role: 'admin' | 'researcher' | 'user') {
  const user = testUsers[role]
  const apiRequest = await playwrightRequest.newContext({
    baseURL: API_URL,
  })
  const loginRes = await apiRequest.post('/api/v1/auth/login', {
    data: { email: user.email, password: user.password },
  })
  const { token } = await loginRes.json().then((d: any) => d.data)

  await page.context().addCookies([{
    name: 'auth_token',
    value: token,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'Strict',
  }])

  await page.goto('http://localhost:3000/')
  await page.goto('/dashboard')
  await page.waitForURL(/\/dashboard/)
}

async function getCookieToken(page: import('@playwright/test').Page) {
  const cookies = await page.context().cookies()
  const authCookie = cookies.find(c => c.name === 'auth_token')
  return authCookie?.value
}

test.describe('Public API', () => {
  test('public species list is accessible without auth', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/v1/species`)
    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThan(0)

    const first = body.data[0]
    expect(first).toHaveProperty('id')
    expect(first).toHaveProperty('scientificName')
    expect(first).toHaveProperty('commonName')
  })

  test('public species detail is accessible without auth', async ({ request }) => {
    const listRes = await request.get(`${API_URL}/api/v1/species`)
    const species = (await listRes.json()).data[0]

    const detailRes = await request.get(`${API_URL}/api/v1/species/${species.id}`)
    expect(detailRes.ok()).toBe(true)

    const body = await detailRes.json()
    expect(body.success).toBe(true)
    expect(body.data.scientificName).toBe(species.scientificName)
  })

  test('health endpoint is accessible', async ({ request }) => {
    const res = await request.get(`${API_URL}/health`)
    expect(res.ok()).toBe(true)
  })

  test('swagger JSON spec is IP-restricted', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/v1/docs-json`)
    expect(res.status()).toBe(403)
  })
})

test.describe('Observation CRUD', () => {
  test('user can list their observations', async ({ request, page }) => {
    await loginAs(page, 'user')
    const token = await getCookieToken(page)
    expect(token).toBeDefined()

    const res = await request.get(`${API_URL}/api/v1/observations`, {
      headers: { Cookie: `auth_token=${token}` },
    })
    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveProperty('observations')
  })

  test('user can get observation by ID', async ({ request }) => {
    const apiRequest = await playwrightRequest.newContext({
      baseURL: API_URL,
    })
    const loginRes = await apiRequest.post('/api/v1/auth/login', {
      data: {
        email: testUsers.user.email,
        password: testUsers.user.password,
      },
    })
    const { token } = await loginRes.json().then((d: any) => d.data)

    const listRes = await apiRequest.get('/api/v1/observations', {
      headers: { Cookie: `auth_token=${token}` },
    })
    const observations = (await listRes.json()).data.observations

    if (observations.length > 0) {
      const obsId = observations[0].id
      const detailRes = await apiRequest.get(`/api/v1/observations/${obsId}`, {
        headers: { Cookie: `auth_token=${token}` },
      })
      expect(detailRes.ok()).toBe(true)

      const body = await detailRes.json()
      expect(body.data.id).toBe(obsId)
    }
  })

  test('user can create observation with valid data', async ({ request }) => {
    const apiRequest = await playwrightRequest.newContext({
      baseURL: API_URL,
    })
    const loginRes = await apiRequest.post('/api/v1/auth/login', {
      data: {
        email: testUsers.user.email,
        password: testUsers.user.password,
      },
    })
    const { token } = await loginRes.json().then((d: any) => d.data)

    const speciesRes = await apiRequest.get('/api/v1/species')
    const species = (await speciesRes.json()).data[0]

    const createRes = await apiRequest.post('/api/v1/observations', {
      headers: { Cookie: `auth_token=${token}` },
      data: {
        speciesId: species.id,
        cw: 12.3,
        bw: 450,
        sex: 'FEMALE',
        maturationStatus: 'MATURE',
        lat: 5.75,
        lng: 100.85,
        locationMethod: 'GPS',
        photos: [],
        notes: 'Created via E2E test',
      },
    })
    expect(createRes.ok()).toBe(true)

    const body = await createRes.json()
    expect(body.data.status).toBe('pending')
    expect(body.data.cw).toBe(12.3)
    expect(body.data.sex).toBe('female')
  })

  test('create observation with missing required fields fails', async ({
    request,
  }) => {
    const apiRequest = await playwrightRequest.newContext({
      baseURL: API_URL,
    })
    const loginRes = await apiRequest.post('/api/v1/auth/login', {
      data: {
        email: testUsers.user.email,
        password: testUsers.user.password,
      },
    })
    const { token } = await loginRes.json().then((d: any) => d.data)

    const createRes = await apiRequest.post('/api/v1/observations', {
      headers: { Cookie: `auth_token=${token}` },
      data: {
        speciesId: 'test',
        cw: 10,
      },
    })
    expect(createRes.ok()).toBe(false)
  })

  test('user profile can be retrieved', async ({ request }) => {
    const apiRequest = await playwrightRequest.newContext({
      baseURL: API_URL,
    })
    const loginRes = await apiRequest.post('/api/v1/auth/login', {
      data: {
        email: testUsers.admin.email,
        password: testUsers.admin.password,
      },
    })
    const { token } = await loginRes.json().then((d: any) => d.data)

    const profileRes = await apiRequest.get('/api/v1/users/me', {
      headers: { Cookie: `auth_token=${token}` },
    })
    expect(profileRes.ok()).toBe(true)

    const body = await profileRes.json()
    expect(body.data.email).toBe(testUsers.admin.email)
    expect(body.data.role).toBe('admin')
  })

  test('user profile can be updated', async ({ request }) => {
    const apiRequest = await playwrightRequest.newContext({
      baseURL: API_URL,
    })
    const loginRes = await apiRequest.post('/api/v1/auth/login', {
      data: {
        email: testUsers.user.email,
        password: testUsers.user.password,
      },
    })
    const { token } = await loginRes.json().then((d: any) => d.data)

    const newName = `Updated User ${Date.now()}`
    const updateRes = await apiRequest.patch('/api/v1/users/me', {
      headers: { Cookie: `auth_token=${token}` },
      data: { name: newName },
    })
    expect(updateRes.ok()).toBe(true)

    const body = await updateRes.json()
    expect(body.data.name).toBe(newName)
  })

  test('unauthenticated requests to protected endpoints return 401', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/v1/observations`)
    expect(res.status()).toBe(401)
  })

  test('invalid token returns 401', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/v1/observations`, {
      headers: { Cookie: 'auth_token=invalid-token' },
    })
    expect(res.status()).toBe(401)
  })
})
