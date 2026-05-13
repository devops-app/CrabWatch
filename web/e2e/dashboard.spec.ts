import { test, expect, request as playwrightRequest } from '@playwright/test'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { testUsers } from './fixtures/users'

const API_URL = process.env.API_URL || 'http://localhost:3001'

async function loginAs(page: import('@playwright/test').Page, role: 'admin' | 'researcher' | 'user') {
  const user = testUsers[role]
  const apiRequest = await playwrightRequest.newContext({
    baseURL: API_URL,
  })
  const res = await apiRequest.post('/api/v1/auth/login', {
    data: { email: user.email, password: user.password },
  })
  expect(res.ok()).toBe(true)
  const { token } = await res.json().then((d: any) => d.data)

  await page.context().addCookies([{
    name: 'auth_token',
    value: token,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'Strict',
  }])

  await page.goto('/dashboard')
  await page.waitForURL(/\/dashboard/)
}

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin')
  })

  test('dashboard loads with stat cards', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.expectToBeVisible()
    await dashboard.expectStatsLoaded()
  })

  test('dashboard shows analytics card for all roles', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.expectAnalyticsCardVisible()
  })

  test('dashboard shows map card for all roles', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.expectMapCardVisible()
  })

  test('admin sees validation queue card', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.expectValidationQueueVisible()
  })

  test('admin sees admin panel card', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.expectAdminPanelVisible()
  })

  test('researcher sees validation queue but not admin panel', async ({ page }) => {
    await loginAs(page, 'researcher')

    const dashboard = new DashboardPage(page)
    await dashboard.expectValidationQueueVisible()
    await dashboard.expectAdminPanelHidden()
  })

  test('regular user sees neither validation queue nor admin panel', async ({
    page,
  }) => {
    await loginAs(page, 'user')

    const dashboard = new DashboardPage(page)
    await dashboard.expectValidationQueueHidden()
    await dashboard.expectAdminPanelHidden()
  })

  test('analytics card navigates to analytics page', async ({ page }) => {
    await page.getByRole('link', { name: 'Analytics View population' }).click()
    await page.waitForURL(/\/dashboard\/analytics/, { timeout: 10000 })
  })
})
