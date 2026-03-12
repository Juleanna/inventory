import { test, expect } from '@playwright/test'

test.describe('Аутентифікація', () => {
  test('Сторінка логіну відображається', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByLabel(/ім'я користувача|username/i)).toBeVisible()
    await expect(page.getByLabel(/пароль|password/i)).toBeVisible()
  })

  test('Невалідний логін показує помилку', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/ім'я користувача|username/i).fill('wrong_user')
    await page.getByLabel(/пароль|password/i).fill('wrong_pass')
    await page.getByRole('button', { name: /увійти|sign in/i }).click()
    await expect(page.getByText(/помилка|error/i)).toBeVisible({ timeout: 5000 })
  })

  test('Неавторизований перенаправляється на логін', async ({ page }) => {
    await page.goto('/equipment')
    await expect(page).toHaveURL(/login/)
  })
})
