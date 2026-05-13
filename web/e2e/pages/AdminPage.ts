import { expect, Page } from '@playwright/test'

export class AdminPage {
  constructor(private page: Page) {}

  goto() {
    return this.page.goto('/dashboard/admin')
  }

  get heading() {
    return this.page.getByRole('heading', { name: 'Admin Panel' })
  }

  get speciesTab() {
    return this.page.getByRole('button', { name: 'Species Management' })
  }

  get usersTab() {
    return this.page.getByRole('button', { name: 'User Management' })
  }

  get speciesHeading() {
    return this.page.getByRole('heading', { name: 'Species Guide' })
  }

  get usersHeading() {
    return this.page.getByRole('heading', { name: 'User Management' })
  }

  get addSpeciesButton() {
    return this.page.getByRole('button', { name: '+ Add Species' })
  }

  get speciesCards() {
    return this.page.locator('.card')
  }

  get userTable() {
    return this.page.locator('table')
  }

  get totalUsersCount() {
    return this.page.getByText(/Total users:/)
  }

  async expectToBeVisible() {
    await expect(this.heading).toBeVisible()
  }

  async expectSpeciesTabVisible() {
    await expect(this.speciesTab).toBeVisible()
  }

  async expectUsersTabVisible() {
    await expect(this.usersTab).toBeVisible()
  }

  async switchToUsers() {
    await this.usersTab.click()
    await this.page.waitForTimeout(2000)
    try {
      await expect(this.page.locator('.animate-pulse')).not.toBeVisible({ timeout: 8000 })
    } catch { /* ignore */ }
    await expect(this.usersHeading).toBeVisible({ timeout: 10000 })
  }

  async switchToSpecies() {
    await this.speciesTab.click()
    await this.page.waitForTimeout(2000)
    try {
      await expect(this.page.locator('.animate-pulse')).not.toBeVisible({ timeout: 8000 })
    } catch { /* ignore */ }
    await expect(this.speciesHeading).toBeVisible({ timeout: 10000 })
  }

  async waitForLoaded() {
    await this.page.waitForLoadState('domcontentloaded')
    await this.page.waitForTimeout(2000)
    try {
      await expect(this.page.locator('.animate-pulse')).not.toBeVisible({ timeout: 8000 })
    } catch {
      // Spinner may not be visible if API failed
    }
    await this.page.waitForTimeout(1000)
  }

  async expectSpeciesLoaded() {
    await this.waitForLoaded()
    await expect(this.speciesHeading).toBeVisible({ timeout: 10000 })
  }

  async expectUsersLoaded() {
    await this.waitForLoaded()
    await expect(this.totalUsersCount).toBeVisible({ timeout: 10000 })
  }
}
