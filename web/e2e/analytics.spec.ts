import { test, expect, request as playwrightRequest } from '@playwright/test'
import { LoginPage } from './pages/LoginPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
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

test.describe('Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'researcher')
  })

  test('analytics page loads with all tabs', async ({ page }) => {
    const analytics = new AnalyticsPage(page)
    await analytics.goto()

    await analytics.expectToBeVisible()
    await analytics.expectTabsLoaded()
  })

  test('size frequency tab shows heading', async ({ page }) => {
    const analytics = new AnalyticsPage(page)
    await analytics.goto()

    await analytics.expectSizeFrequencyTabVisible()
  })

  test('sex ratio tab switches correctly', async ({ page }) => {
    const analytics = new AnalyticsPage(page)
    await analytics.goto()
    await analytics.switchToGenderRatio()
  })

  test('CW50 tab switches correctly', async ({ page }) => {
    const analytics = new AnalyticsPage(page)
    await analytics.goto()
    await analytics.switchToCW50()
  })

  test('temporal trends tab switches correctly', async ({ page }) => {
    const analytics = new AnalyticsPage(page)
    await analytics.goto()
    await analytics.switchToTemporalTrends()
  })

  test('analytics API returns valid data', async ({ request }) => {
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

    const statsRes = await apiRequest.get('/api/v1/analytics/stats', {
      headers: { Cookie: `auth_token=${token}` },
    })
    expect(statsRes.ok()).toBe(true)

    const body = await statsRes.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveProperty('totalObservations')
    expect(body.data).toHaveProperty('approvedObservations')
    expect(body.data).toHaveProperty('pendingObservations')
  })

  test('regular user cannot access analytics API', async ({ request }) => {
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

    const statsRes = await apiRequest.get('/api/v1/analytics/stats', {
      headers: { Cookie: `auth_token=${token}` },
    })

    expect(statsRes.ok()).toBe(false)
  })
})
