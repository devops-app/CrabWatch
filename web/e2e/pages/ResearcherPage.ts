import { expect, Page } from '@playwright/test'

export class ResearcherPage {
  constructor(private page: Page) {}

  goto() {
    return this.page.goto('/dashboard/researcher')
  }

  get heading() {
    return this.page.getByRole('heading', { name: 'Validation Queue' })
  }

  get pendingCount() {
    return this.page.getByText(/observations? pending review/)
  }

  get emptyState() {
    return this.page.getByText('No pending observations. All caught up!')
  }

  get observationCards() {
    return this.page.locator('.card.cursor-pointer')
  }

  get reviewModal() {
    return this.page.locator('.fixed.inset-0.bg-black\\/50')
  }

  get modalHeading() {
    return this.page.getByRole('heading', { name: 'Review Observation' })
  }

  get approveButton() {
    return this.page.getByRole('button', { name: 'Approve' })
  }

  get rejectButton() {
    return this.page.getByRole('button', { name: 'Reject' })
  }

  get cancelButton() {
    return this.page.getByRole('button', { name: 'Cancel' })
  }

  get rejectionReasonInput() {
    return this.page.getByLabel('Rejection Reason (optional)')
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
    await this.waitForLoaded()
    await expect(this.heading).toBeVisible({ timeout: 10000 })
  }

  async expectEmptyState() {
    await expect(this.emptyState).toBeVisible()
  }

  async expectPendingObservations() {
    await expect(this.pendingCount).toBeVisible()
  }

  async clickFirstObservation() {
    await this.observationCards.first().click()
    await expect(this.reviewModal).toBeVisible()
  }

  async approveObservation() {
    await this.approveButton.click()
  }

  async rejectObservation(reason?: string) {
    if (reason) {
      await this.rejectionReasonInput.fill(reason)
    }
    await this.rejectButton.click()
  }

  async closeModal() {
    await this.cancelButton.click()
    await expect(this.reviewModal).not.toBeVisible()
  }
}
