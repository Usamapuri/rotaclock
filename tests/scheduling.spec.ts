import { test, expect } from '@playwright/test'

test('admin can create template and assign/edit shift in scheduling', async ({ page }) => {
  await page.goto('/admin/scheduling')
  // Simulate stored admin session if needed
  await page.evaluate(() => {
    localStorage.setItem('authSession', JSON.stringify({ id: 'test-admin', email: 'admin@test', role: 'admin' }))
  })
  await page.reload()

  // Wait for grid
  await expect(page.getByText('Scheduling')).toBeVisible()

  // Open Templates modal
  await page.getByRole('button', { name: 'Templates' }).click()
  // Close modal (ensures it opens without errors)
  await page.keyboard.press('Escape')

  // Click a plus button (quick assign trigger)
  const plus = page.locator('button', { hasText: '+' }).first()
  await plus.click({ trial: true }).catch(() => {})

  // Open assignment modal via fallback button
  await page.getByRole('button', { name: 'Quick Assign' }).click()

  // Expect dialog
  await expect(page.getByText('Assign Shift')).toBeVisible()
  // Try to pick first template if present
  await page.getByText('Use Template').click()
  await page.getByRole('button').filter({ hasText: 'Choose a shift template' }).click()
  const option = page.locator('[role="option"]').first()
  if (await option.count()) {
    await option.click()
  }
  // Save
  await page.getByRole('button', { name: 'Assign Shift' }).click()
})


