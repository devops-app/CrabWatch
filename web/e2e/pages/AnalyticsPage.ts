import { expect, Page } from '@playwright/test'

export class AnalyticsPage {
  constructor(private page: Page) {}

  goto() {
    return this.page.goto('/dashboard/analytics')
  }

  get heading() {
    return this.page.getByRole('heading', { name: 'Analytics' })
  }

  get sizeFrequencyTab() {
    return this.page.getByRole('button', { name: 'Size Frequency' })
  }

  get sexRatioTab() {
    return this.page.getByRole('button', { name: 'Gender Ratio' })
  }

  get cw50Tab() {
    return this.page.getByRole('button', { name: 'CW50 (Maturity)' })
  }

  get temporalTrendsTab() {
    return this.page.getByRole('button', { name: 'Temporal Trends' })
  }

  get sizeFrequencyHeading() {
    return this.page.getByRole('heading', { name: 'Size-Frequency Distribution' })
  }

  get sexRatioHeading() {
    return this.page.getByRole('heading', { name: 'Gender Ratio by Species' })
  }

  get cw50Heading() {
    return this.page.getByRole('heading', { name: 'Size at Gender Maturity (CW50)' })
  }

  get temporalTrendsHeading() {
    return this.page.getByRole('heading', { name: 'Temporal Trends' })
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

  async expectToBeVisible() {
    await expect(this.heading).toBeVisible()
  }

  async expectSizeFrequencyTabVisible() {
    await this.waitForLoaded()
    await expect(this.sizeFrequencyTab).toBeVisible({ timeout: 10000 })
  }

  async expectTabsLoaded() {
    await this.waitForLoaded()
    await expect(this.sizeFrequencyTab).toBeVisible({ timeout: 10000 })
    await expect(this.sexRatioTab).toBeVisible({ timeout: 5000 })
    await expect(this.cw50Tab).toBeVisible({ timeout: 5000 })
    await expect(this.temporalTrendsTab).toBeVisible({ timeout: 5000 })
  }

  async switchToGenderRatio() {
    await this.sexRatioTab.click({ timeout: 10000 })
    await this.page.waitForTimeout(2000)
    try {
      await expect(this.sexRatioHeading).toBeVisible({ timeout: 10000 })
    } catch {
      const genderRatioText = this.page.getByText('Gender Ratio by Species')
      await expect(sexRatioText).toBeVisible({ timeout: 5000 })
    }
  }

  async switchToCW50() {
    await this.cw50Tab.click({ timeout: 10000 })
    await this.page.waitForTimeout(1000)
    await expect(this.cw50Heading).toBeVisible({ timeout: 10000 })
  }

  async switchToTemporalTrends() {
    await this.temporalTrendsTab.click({ timeout: 10000 })
    await this.page.waitForTimeout(1000)
    await expect(this.temporalTrendsHeading).toBeVisible({ timeout: 10000 })
  }
}
