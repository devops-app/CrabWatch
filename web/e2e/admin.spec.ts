import { test, expect, request as playwrightRequest } from '@playwright/test'
import { LoginPage } from './pages/LoginPage'
import { AdminPage } from './pages/AdminPage'
import { testUsers } from './fixtures/users'

const API_URL = process.env.API_URL || 'http://localhost:3001'

async function loginAsAdmin(page: import('@playwright/test').Page) {
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

test.describe('Admin Panel', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('admin can access admin panel', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.goto()

    await admin.expectToBeVisible()
    await admin.expectSpeciesTabVisible()
    await admin.expectUsersTabVisible()
  })

  test('admin can view species management', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.goto()
    await admin.expectSpeciesLoaded()
  })

  test('admin can switch to user management tab', async ({ page }) => {
    const admin = new AdminPage(page)
    await admin.goto()
    await admin.switchToUsers()
    await admin.expectUsersLoaded()
  })

  test('researcher can access admin page but API calls fail', async ({ page, request }) => {
    const login = new LoginPage(page)
    await login.goto()
    await login.login(testUsers.researcher.email, testUsers.researcher.password)
    await page.waitForURL(/\/dashboard/)

    await page.goto('/dashboard/admin')

    await expect(page).toHaveURL(/\/dashboard\/admin/)

    const apiRequest = await playwrightRequest.newContext({
      baseURL: API_URL,
    })
    const loginRes = await apiRequest.post('/api/v1/auth/login', {
      data: {
        email: testUsers.researcher.email,
        password: testUsers.researcher.password,
      },
    })
    const { token } = await loginRes.json().then((d: any) => d.data)

    const createRes = await apiRequest.post('/api/v1/species', {
      headers: { Cookie: `auth_token=${token}` },
      data: {
        scientificName: 'Scylla unauthorized',
        commonName: 'Unauthorized Crab',
        description: 'Should fail',
        keyFeatures: [],
        images: [],
        distributionZones: [],
      },
    })
    expect(createRes.ok()).toBe(false)
  })

  test('regular user can access admin page but API calls fail', async ({
    page,
    request,
  }) => {
    const login = new LoginPage(page)
    await login.goto()
    await login.login(testUsers.user.email, testUsers.user.password)
    await page.waitForURL(/\/dashboard/)

    await page.goto('/dashboard/admin')

    await expect(page).toHaveURL(/\/dashboard\/admin/)

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

    const createRes = await apiRequest.post('/api/v1/species', {
      headers: { Cookie: `auth_token=${token}` },
      data: {
        scientificName: 'Scylla unauthorized',
        commonName: 'Unauthorized Crab',
        description: 'Should fail',
        keyFeatures: [],
        images: [],
        distributionZones: [],
      },
    })
    expect(createRes.ok()).toBe(false)
  })

  test('admin can manage user roles via API', async ({ request }) => {
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

    const usersRes = await apiRequest.get('/api/v1/users', {
      headers: { Cookie: `auth_token=${token}` },
    })
    const users = (await usersRes.json()).data.users
    const targetUser = users.find((u: any) => u.role === 'user')

    if (targetUser) {
      const updateRes = await apiRequest.patch(
        `/api/v1/users/${targetUser.id}/role`,
        {
          headers: { Cookie: `auth_token=${token}` },
          data: { role: 'RESEARCHER' },
        }
      )
      expect(updateRes.ok()).toBe(true)

      const checkRes = await apiRequest.get('/api/v1/users/me', {
        headers: { Cookie: `auth_token=${token}` },
      })
      expect(checkRes.ok()).toBe(true)

      const revertRes = await apiRequest.patch(
        `/api/v1/users/${targetUser.id}/role`,
        {
          headers: { Cookie: `auth_token=${token}` },
          data: { role: 'USER' },
        }
      )
      expect(revertRes.ok()).toBe(true)
    }
  })

  test('non-admin cannot change user roles', async ({ request }) => {
    const apiRequest = await playwrightRequest.newContext({
      baseURL: API_URL,
    })
    const loginRes = await apiRequest.post('/api/v1/auth/login', {
      data: {
        email: testUsers.researcher.email,
        password: testUsers.researcher.password,
      },
    })
    const { token } = await loginRes.json().then((d: any) => d.data)

    const usersRes = await apiRequest.get('/api/v1/users', {
      headers: { Cookie: `auth_token=${token}` },
    })

    if (usersRes.ok()) {
      const users = (await usersRes.json()).data.users
      const targetUser = users.find((u: any) => u.role === 'user')

      if (targetUser) {
        const updateRes = await apiRequest.patch(
          `/api/v1/users/${targetUser.id}/role`,
          {
            headers: { Cookie: `auth_token=${token}` },
            data: { role: 'ADMIN' },
          }
        )
        expect(updateRes.ok()).toBe(false)
      }
    }
  })

  test('admin can manage species via API', async ({ request }) => {
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

    const newSpecies = {
      scientificName: `Scylla e2e_${Date.now()}`,
      commonName: 'E2E Test Crab',
      description: 'Created by E2E test',
      keyFeatures: [{ trait: 'Test', value: 'Feature' }],
      images: [],
      distributionZones: [],
    }

    const createRes = await apiRequest.post('/api/v1/species', {
      headers: { Cookie: `auth_token=${token}` },
      data: newSpecies,
    })
    expect(createRes.ok()).toBe(true)
    const created = (await createRes.json()).data

    const updateRes = await apiRequest.patch(`/api/v1/species/${created.id}`, {
      headers: { Cookie: `auth_token=${token}` },
      data: { commonName: 'Updated Test Crab' },
    })
    expect(updateRes.ok()).toBe(true)

    const deleteRes = await apiRequest.delete(`/api/v1/species/${created.id}`, {
      headers: { Cookie: `auth_token=${token}` },
    })
    expect(deleteRes.ok()).toBe(true)
  })

  test('non-admin cannot create species', async ({ request }) => {
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

    const createRes = await apiRequest.post('/api/v1/species', {
      headers: { Cookie: `auth_token=${token}` },
      data: {
        scientificName: 'Scylla unauthorized',
        commonName: 'Unauthorized Crab',
        description: 'Should fail',
        keyFeatures: [],
        images: [],
        distributionZones: [],
      },
    })
    expect(createRes.ok()).toBe(false)
  })
})
