//generate-maps-link.spec.js
import { test, expect } from '@playwright/test';

test('Переход по кнопке "Генерация тепловых карт"', async ({ page }) => {
  // Открываем главную страницу
  await page.goto('http://localhost:3000'); // замените на ваш путь

  // Находим и нажимаем на кнопку "Генерация тепловых карт"
  const button = page.getByRole('button', { name: /Генерация тепловых карт/i });
  await expect(button).toBeVisible();
  await button.click();

  // Проверяем переход на страницу /generate_maps.html
  await expect(page).toHaveURL(/.*generate_maps\.html$/);

  // Проверяем, что на новой странице есть заголовок "Выберите источник данных"
  await expect(page.getByRole('heading', { name: /Выберите источник данных/i })).toBeVisible();
});
