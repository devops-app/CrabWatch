import { expect, Page } from '@playwright/test'

export class LoginPage {
  constructor(private page: Page) {}

  goto() {
    return this.page.goto('/auth/login')
  }

  get emailInput() {
    return this.page.getByLabel('Email')
  }

  get passwordInput() {
    return this.page.getByLabel('Password')
  }

  get submitButton() {
    return this.page.getByRole('button', { name: 'Login' })
  }

  get registerLink() {
    return this.page.getByRole('link', { name: 'Register' })
  }

  get errorMessage() {
    return this.page.locator('.bg-red-50.text-red-700')
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email)
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password)
  }

  async submit() {
    await this.submitButton.click()
  }

  async expectToBeVisible() {
    await expect(
      this.page.getByRole('heading', { name: 'Login to CrabWatch' })
    ).toBeVisible()
  }

  async expectRedirectToDashboard() {
    await expect(this.page).toHaveURL(/\/dashboard/)
  }
}
