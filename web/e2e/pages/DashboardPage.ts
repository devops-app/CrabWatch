import { expect, Page } from '@playwright/test'

export class DashboardPage {
  constructor(private page: Page) {}

  goto() {
    return this.page.goto('/dashboard')
  }

  get heading() {
    return this.page.getByRole('heading', { name: 'Dashboard' })
  }

  get statCards() {
    return this.page.locator('.stat-card')
  }

  get totalObservationsCard() {
    return this.page.getByText('Total Observations').first()
  }

  get analyticsCard() {
    return this.page.getByRole('heading', { name: 'Analytics' })
  }

  get mapCard() {
    return this.page.getByRole('heading', { name: 'Map' })
  }

  get validationQueueCard() {
    return this.page.getByRole('heading', { name: 'Validation Queue' })
  }

  get adminPanelCard() {
    return this.page.getByRole('heading', { name: 'Admin Panel' })
  }

  async expectToBeVisible() {
    await expect(this.heading).toBeVisible()
  }

  async waitForLoaded() {
    await this.page.waitForLoadState('domcontentloaded')
    await this.page.waitForTimeout(2000)
    try {
      await expect(this.page.locator('.animate-pulse')).not.toBeVisible({ timeout: 8000 })
    } catch {
      // Spinner may not be visible
    }
  }

  async expectStatsLoaded() {
    await this.waitForLoaded()
    await expect(this.statCards).toHaveCount(6, { timeout: 8000 })
    await expect(this.totalObservationsCard).toBeVisible({ timeout: 8000 })
  }

  async expectAnalyticsCardVisible() {
    await expect(this.analyticsCard).toBeVisible()
  }

  async expectMapCardVisible() {
    await expect(this.mapCard).toBeVisible()
  }

  async expectValidationQueueVisible() {
    await expect(this.validationQueueCard).toBeVisible()
  }

  async expectAdminPanelVisible() {
    await expect(this.adminPanelCard).toBeVisible()
  }

  async expectValidationQueueHidden() {
    await expect(this.validationQueueCard).not.toBeVisible()
  }

  async expectAdminPanelHidden() {
    await expect(this.adminPanelCard).not.toBeVisible()
  }
}
