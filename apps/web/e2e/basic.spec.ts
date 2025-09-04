import { test, expect } from '@playwright/test'

test('homepage has KUKUTalk header', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'KUKUTalk' })).toBeVisible()
})
