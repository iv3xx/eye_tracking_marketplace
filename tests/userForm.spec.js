//userForm.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Форма ввода данных пользователя', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000'); 
    await page.click('#start-btn');
    await page.click('#confirm-rules');
  });

  test('Кнопка "Готово" недоступна без согласий', async ({ page }) => {
    await page.fill('#participant-id', '123');
    await page.fill('#age', '25');
    const button = page.locator('#submit-user-btn');
    await expect(button).toBeDisabled();
  });

  test('Кнопка "Готово" недоступна при неполных данных', async ({ page }) => {
    const button = page.locator('#submit-user-btn');

    await page.fill('#participant-id', '111');
    await expect(button).toBeDisabled();
   
    await page.fill('#participant-id', '');
    await page.fill('#age', '30');
    await expect(button).toBeDisabled();

    await page.fill('#participant-id', '111');
    await page.fill('#age', '30');
    await page.check('#agree-data');
    await expect(button).toBeDisabled();

    await page.uncheck('#agree-data');
    await page.check('#agree-experiment');
    await expect(button).toBeDisabled();
  });
  

    test('Кнопка "Готово" доступна при введённых данных и отмеченных чекбоксах', async ({ page }) => {
        await page.fill('#participant-id', '222');
        await page.fill('#age', '35');
        await page.check('#agree-data');
        await page.check('#agree-experiment');

        const button = page.locator('#submit-user-btn');
        await expect(button).toBeEnabled();
    });

  test('Появляется alert, если возраст < 18', async ({ page }) => {

  await page.fill('#participant-id', '456');
  await page.fill('#age', '15');
  await page.check('#agree-data');
  await page.check('#agree-experiment');

  
  const button = page.locator('#submit-user-btn');
  await expect(button).toBeEnabled();

  page.on('dialog', dialog => {
    expect(dialog.message()).toContain('Возраст введён некорректно');
    dialog.dismiss();
  });

  await Promise.all([
    button.click(),
    page.waitForEvent('dialog') 
  ]);
});

  test('Успешное прохождение формы и переход к следующему экрану', async ({ page }) => {
    await page.fill('#participant-id', '789');
    await page.fill('#age', '22');
    await page.check('#agree-data');
    await page.check('#agree-experiment');

    const button = page.locator('#submit-user-btn');
    await expect(button).toBeEnabled();
    
    await button.click();
    await expect(page.locator('#control-screen')).toBeVisible();
    await expect(page.locator('#form-screen')).toBeHidden();
    await expect(page.locator('#current-id')).toHaveText('789');
  });
  
});
