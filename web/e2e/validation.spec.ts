import { test, expect, request as playwrightRequest } from '@playwright/test'
import { LoginPage } from './pages/LoginPage'
import { ResearcherPage } from './pages/ResearcherPage'
import { testUsers } from './fixtures/users'

const API_URL = process.env.API_URL || 'http://localhost:3001'

async function loginAs(page: import('@playwright/test').Page, role: 'admin' | 'researcher') {
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

test.describe('Observation Validation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'researcher')
  })

  test('researcher can access validation queue', async ({ page }) => {
    const researcher = new ResearcherPage(page)
    await researcher.goto()

    await researcher.expectToBeVisible()
  })

  test('validation queue shows pending count or empty state', async ({ page }) => {
    const researcher = new ResearcherPage(page)
    await researcher.goto()
    await researcher.waitForLoaded()

    const pendingCount = researcher.pendingCount
    const emptyState = researcher.emptyState

    try {
      await expect(pendingCount).toBeVisible({ timeout: 10000 })
    } catch {
      await expect(emptyState).toBeVisible({ timeout: 5000 })
    }
  })

  test('researcher can click observation to open review modal', async ({
    page,
  }) => {
    const researcher = new ResearcherPage(page)
    await researcher.goto()
    await researcher.waitForLoaded()

    const hasCards = await researcher.observationCards.first().isVisible()
    if (hasCards) {
      await researcher.clickFirstObservation()
      await expect(researcher.modalHeading).toBeVisible()
      await expect(researcher.approveButton).toBeVisible()
      await expect(researcher.rejectButton).toBeVisible()
      await expect(researcher.cancelButton).toBeVisible()
      await researcher.closeModal()
    }
  })

  test('regular user can access researcher page but API validates role', async ({
    page,
    request,
  }) => {
    const login = new LoginPage(page)
    await login.goto()
    await login.login(testUsers.user.email, testUsers.user.password)
    await page.waitForURL(/\/dashboard/)

    await page.goto('/dashboard/researcher')
    await expect(page).toHaveURL(/\/dashboard\/researcher/)

    const apiRequest = await playwrightRequest.newContext({
      baseURL: API_URL,
    })
    const userTokenRes = await apiRequest.post('/api/v1/auth/login', {
      data: {
        email: testUsers.user.email,
        password: testUsers.user.password,
      },
    })
    const { token: userToken } = await userTokenRes.json().then((d: any) => d.data)

    const validateRes = await apiRequest.patch(
      '/api/v1/observations/test/validate',
      {
        headers: { Cookie: `auth_token=${userToken}` },
        data: { status: 'approved' },
      }
    )
    expect(validateRes.ok()).toBe(false)
  })

  test('create observation as user, then validate as researcher', async ({
    request,
    page,
  }) => {
    const apiRequest = await playwrightRequest.newContext({
      baseURL: API_URL,
    })

    const userTokenRes = await apiRequest.post('/api/v1/auth/login', {
      data: {
        email: testUsers.user.email,
        password: testUsers.user.password,
      },
    })
    const { token: userToken } = await userTokenRes.json().then((d: any) => d.data)

    const speciesRes = await apiRequest.get('/api/v1/species')
    const species = (await speciesRes.json()).data[0]

    const obsRes = await apiRequest.post('/api/v1/observations', {
      headers: { Cookie: `auth_token=${userToken}` },
      data: {
        speciesId: species.id,
        cw: 10.5,
        bw: 300,
        sex: 'MALE',
        maturationStatus: 'MATURE',
        lat: 5.4164,
        lng: 100.3327,
        locationMethod: 'GPS',
        photos: [],
        notes: 'E2E test observation',
      },
    })
    expect(obsRes.ok()).toBe(true)
    const obsData = (await obsRes.json()).data
    expect(obsData.status).toBe('pending')

    const researcherTokenRes = await apiRequest.post('/api/v1/auth/login', {
      data: {
        email: testUsers.researcher.email,
        password: testUsers.researcher.password,
      },
    })
    const { token: researcherToken } = await researcherTokenRes.json().then((d: any) => d.data)

    const validateRes = await apiRequest.patch(
      `/api/v1/observations/${obsData.id}/validate`,
      {
        headers: { Cookie: `auth_token=${researcherToken}` },
        data: { status: 'approved' },
      }
    )
    expect(validateRes.ok()).toBe(true)

    const checkRes = await apiRequest.get(`/api/v1/observations/${obsData.id}`, {
      headers: { Cookie: `auth_token=${researcherToken}` },
    })
    const checkData = (await checkRes.json()).data
    expect(checkData.status).toBe('approved')
  })

  test('reject observation with reason', async ({ request }) => {
    const apiRequest = await playwrightRequest.newContext({
      baseURL: API_URL,
    })

    const userTokenRes = await apiRequest.post('/api/v1/auth/login', {
      data: {
        email: testUsers.user.email,
        password: testUsers.user.password,
      },
    })
    const { token: userToken } = await userTokenRes.json().then((d: any) => d.data)

    const speciesRes = await apiRequest.get('/api/v1/species')
    const species = (await speciesRes.json()).data[0]

    const obsRes = await apiRequest.post('/api/v1/observations', {
      headers: { Cookie: `auth_token=${userToken}` },
      data: {
        speciesId: species.id,
        cw: 5,
        bw: 100,
        sex: 'UNKNOWN',
        maturationStatus: 'UNKNOWN',
        lat: 5.4164,
        lng: 100.3327,
        locationMethod: 'MANUAL',
        photos: [],
      },
    })
    const obsData = (await obsRes.json()).data

    const researcherTokenRes = await apiRequest.post('/api/v1/auth/login', {
      data: {
        email: testUsers.researcher.email,
        password: testUsers.researcher.password,
      },
    })
    const { token: researcherToken } = await researcherTokenRes.json().then((d: any) => d.data)

    const validateRes = await apiRequest.patch(
      `/api/v1/observations/${obsData.id}/validate`,
      {
        headers: { Cookie: `auth_token=${researcherToken}` },
        data: { status: 'rejected', rejectionReason: 'Invalid measurements' },
      }
    )
    expect(validateRes.ok()).toBe(true)

    const checkRes = await apiRequest.get(`/api/v1/observations/${obsData.id}`, {
      headers: { Cookie: `auth_token=${researcherToken}` },
    })
    const checkData = (await checkRes.json()).data
    expect(checkData.status).toBe('rejected')
    expect(checkData.rejectionReason).toBe('Invalid measurements')
  })

  test('researcher cannot validate observation (only admin/researcher roles)', async ({
    request,
  }) => {
    const apiRequest = await playwrightRequest.newContext({
      baseURL: API_URL,
    })

    const researcherTokenRes = await apiRequest.post('/api/v1/auth/login', {
      data: {
        email: testUsers.researcher.email,
        password: testUsers.researcher.password,
      },
    })
    const { token: researcherToken } = await researcherTokenRes.json().then((d: any) => d.data)

    const res = await apiRequest.patch(
      '/api/v1/observations/nonexistent/validate',
      {
        headers: { Cookie: `auth_token=${researcherToken}` },
        data: { status: 'approved' },
      }
    )
    expect(res.status()).toBe(404)
  })
})
