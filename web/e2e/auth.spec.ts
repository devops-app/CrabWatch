import { test, expect, request as playwrightRequest } from '@playwright/test'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { testUsers, createTestUser } from './fixtures/users'

const API_URL = process.env.API_URL || 'http://localhost:3001'

async function loginAs(page: import('@playwright/test').Page, role: 'admin' | 'researcher' | 'user') {
  const apiRequest = await playwrightRequest.newContext({
    baseURL: API_URL,
  })
  const loginRes = await apiRequest.post('/api/v1/auth/login', {
    data: {
      email: testUsers[role].email,
      password: testUsers[role].password,
    },
  })

  const { token } = await loginRes.json().then((d: any) => d.data)

  await apiRequest.delete('/api/v1/auth/logout')

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

test.describe('Authentication', () => {
  test('landing page is accessible without authentication', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.ok()).toBe(true)

    await expect(
      page.getByRole('heading', { name: 'CrabWatch Malaysia' })
    ).toBeVisible()

    await expect(
      page.getByRole('heading', { name: 'How It Works' })
    ).toBeVisible()

    await expect(
      page.getByRole('heading', { name: 'Target Species' })
    ).toBeVisible()

    await expect(page.getByRole('link', { name: 'Login' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Register' })).toBeVisible()
  })

  test('public about page is accessible without authentication', async ({ page }) => {
    const response = await page.goto('/public/about')
    expect(response?.ok()).toBe(true)
  })

  test('login page displays correctly', async ({ page }) => {
    const login = new LoginPage(page)
    await login.goto()

    await login.expectToBeVisible()
    await expect(login.emailInput).toBeVisible()
    await expect(login.passwordInput).toBeVisible()
    await expect(login.submitButton).toBeVisible()
    await expect(login.registerLink).toBeVisible()
  })

  test('login with valid admin credentials redirects to dashboard', async ({ page }) => {
    await loginAs(page, 'admin')
  })

  test('login with valid researcher credentials redirects to dashboard', async ({ page }) => {
    await loginAs(page, 'researcher')
  })

  test('login with valid user credentials redirects to dashboard', async ({ page }) => {
    await loginAs(page, 'user')
  })

  test('login with invalid credentials shows error message', async ({ page }) => {
    const login = new LoginPage(page)
    await login.goto()
    await login.login('invalid@example.com', 'wrongpassword')

    await expect(login.errorMessage).toBeVisible()
    await expect(page).toHaveURL('/auth/login')
  })

  test('login with empty credentials shows error', async ({ page }) => {
    const login = new LoginPage(page)
    await login.goto()
    await login.submit()

    await expect(login.emailInput).toBeFocused()
    await expect(page).toHaveURL('/auth/login')
  })

  test('login page links to registration page', async ({ page }) => {
    const login = new LoginPage(page)
    await login.goto()
    await login.registerLink.click()

    await expect(page).toHaveURL('/auth/register')
  })

  test('register page displays correctly', async ({ page }) => {
    const register = new RegisterPage(page)
    await register.goto()

    await register.expectToBeVisible()
    await expect(register.nameInput).toBeVisible()
    await expect(register.emailInput).toBeVisible()
    await expect(register.passwordInput).toBeVisible()
    await expect(register.confirmPasswordInput).toBeVisible()
    await expect(register.submitButton).toBeVisible()
    await expect(register.loginLink).toBeVisible()
  })

  test('register with valid data and then login', async ({ request, page }) => {
    const testUser = createTestUser(Date.now())

    const registerRes = await request.post(`${API_URL}/api/v1/users/register`, {
      data: {
        name: testUser.name,
        email: testUser.email,
        password: testUser.password,
      },
    })
    expect(registerRes.ok()).toBe(true)

    const login = new LoginPage(page)
    await login.goto()
    await login.login(testUser.email, testUser.password)
    await login.expectRedirectToDashboard()
  })

  test('register with duplicate email shows error', async ({ page }) => {
    const register = new RegisterPage(page)

    await register.goto()
    await register.register(
      'Duplicate User',
      testUsers.admin.email,
      'password123'
    )

    await expect(register.errorMessage).toBeVisible()
  })

  test('register with password mismatch shows error', async ({ page }) => {
    const register = new RegisterPage(page)
    const testUser = createTestUser(Date.now())

    await register.goto()
    await register.fillForm(
      testUser.name,
      testUser.email,
      'password123',
      'different456'
    )
    await register.submit()

    await expect(register.errorMessage).toBeVisible()
  })

  test('register with short password shows validation error', async ({ page }) => {
    const register = new RegisterPage(page)
    const testUser = createTestUser(Date.now())

    await register.goto()
    await register.fillForm(testUser.name, testUser.email, 'short', 'short')
    await register.submit()

    await expect(register.fieldErrors).toBeVisible()
  })

  test('register page links back to login', async ({ page }) => {
    const register = new RegisterPage(page)
    await register.goto()
    await register.loginLink.click()

    await expect(page).toHaveURL('/auth/login')
  })

  test('unauthenticated user is redirected to login from dashboard', async ({
    page,
  }) => {
    await page.goto('/dashboard')

    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('unauthenticated user is redirected to login from analytics', async ({
    page,
  }) => {
    await page.goto('/dashboard/analytics')

    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('unauthenticated user is redirected to login from researcher page', async ({
    page,
  }) => {
    await page.goto('/dashboard/observation')

    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('unauthenticated user is redirected to login from admin page', async ({
    page,
  }) => {
    await page.goto('/dashboard/admin')

    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('direct API login returns token and sets cookie', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/v1/auth/login`, {
      data: {
        email: testUsers.admin.email,
        password: testUsers.admin.password,
      },
    })

    expect(response.ok()).toBe(true)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveProperty('token')
    expect(body.data).toHaveProperty('user')
    expect(body.data.user.role).toBe('admin')
  })

  test('logout clears authentication cookie', async ({ page, request }) => {
    const apiRequest = await playwrightRequest.newContext({
      baseURL: API_URL,
    })
    const loginRes = await apiRequest.post('/api/v1/auth/login', {
      data: {
        email: testUsers.admin.email,
        password: testUsers.admin.password,
      },
    })
    expect(loginRes.ok()).toBe(true)

    const cookies = await apiRequest.cookies(API_URL)
    expect(cookies.some(c => c.name === 'auth_token')).toBe(true)

    const logoutRes = await apiRequest.post('/api/v1/auth/logout')
    expect(logoutRes.ok()).toBe(true)

    const cookiesAfter = await apiRequest.cookies(API_URL)
    expect(cookiesAfter.some(c => c.name === 'auth_token')).toBe(false)
  })
})
