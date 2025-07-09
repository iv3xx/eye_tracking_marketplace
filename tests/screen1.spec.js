// tests/screen1.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Первый экран - ввод пользователя', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000'); 
  });

  test('Отображается заголовок и кнопка', async ({ page }) => {
   await expect(page.getByRole('heading', {
  name: 'Добро пожаловать на тестирование пользовательского интерфейса маркетплейсов!'})).toBeVisible();
    await expect(page.getByRole('button', { name: 'Начать тестирование' })).toBeVisible();
  });

  test('Открытие модального окна с правилами', async ({ page }) => {
    await page.getByRole('button', { name: 'Начать тестирование' }).click();
    await expect(page.locator('#rules-confirmation')).toBeVisible();
  });

  test('Переход к форме после подтверждения правил', async ({ page }) => {
    await page.getByRole('button', { name: 'Начать тестирование' }).click();
    await page.getByRole('button', { name: 'Да, я изучил(а) правила' }).click();

    await expect(page.locator('#form-screen')).toBeVisible();
    await expect(page.locator('#screen-1')).toBeHidden();
  });

   test('Кнопка "Нет, вернуться к правилам" возвращает к инструкциям', async ({ page }) => {
    await page.getByRole('button', { name: 'Начать тестирование' }).click();
    await expect(page.locator('#rules-confirmation')).toBeVisible();
    await page.getByRole('button', { name: 'Нет, вернуться к правилам' }).click();
    await expect(page.locator('#rules-confirmation')).toBeHidden();
    await expect(page.locator('#screen-1')).toBeVisible();
    await expect(page.locator('#form-screen')).toBeHidden();
  });
  
});
