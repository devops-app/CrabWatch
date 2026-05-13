import { expect, Page } from '@playwright/test'

export class RegisterPage {
  constructor(private page: Page) {}

  goto() {
    return this.page.goto('/auth/register')
  }

  get nameInput() {
    return this.page.getByLabel('Full Name')
  }

  get emailInput() {
    return this.page.getByLabel('Email')
  }

  get passwordInput() {
    return this.page.getByLabel('Password', { exact: true })
  }

  get confirmPasswordInput() {
    return this.page.getByLabel('Confirm Password')
  }

  get submitButton() {
    return this.page.getByRole('button', { name: 'Create Account' })
  }

  get loginLink() {
    return this.page.getByRole('link', { name: 'Login' })
  }

  get errorMessage() {
    return this.page.locator('.bg-red-50').first()
  }

  get fieldErrors() {
    return this.page.locator('p.text-red-600')
  }

  async fillForm(name: string, email: string, password: string, confirmPassword: string) {
    await this.nameInput.fill(name)
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.confirmPasswordInput.fill(confirmPassword)
  }

  async submit() {
    await this.submitButton.click()
  }

  async register(name: string, email: string, password: string) {
    await this.fillForm(name, email, password, password)
    await this.submit()
  }

  async expectToBeVisible() {
    await expect(
      this.page.getByRole('heading', { name: 'Join CrabWatch' })
    ).toBeVisible()
  }

  async expectRedirectToLogin() {
    await expect(this.page).toHaveURL(/\/auth\/login/)
  }
}
