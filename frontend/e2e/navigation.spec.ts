import { test, expect } from '@playwright/test'

test.describe('Навігація', () => {
  test('Глобальний пошук відкривається по Ctrl+K', async ({ page }) => {
    await page.goto('/login')
    await page.keyboard.press('Control+k')
    // Перевіряємо що діалог пошуку з'явився
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 3000 })
  })
})
