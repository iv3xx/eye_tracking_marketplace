//expMenu.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Панель управления экспериментом', () => {
  let page;
  
  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://localhost:3000');
    
    // Проходим начальные экраны
    await page.click('#start-btn');
    await page.click('#confirm-rules');
    
    // Заполняем форму пользователя
    await page.fill('#participant-id', '123');
    await page.fill('#age', '25');
    await page.check('#agree-data');
    await page.check('#agree-experiment');
    await page.click('#submit-user-btn');
    
    await expect(page.locator('#control-screen')).toBeVisible();
  });

  test('Отображение информации о участнике', async () => {
    await expect(page.locator('#current-id')).toHaveText('123');
  });

  test('Управление отслеживанием взгляда', async () => {
    const startBtn = page.locator('#start-tracking');
    const stopBtn = page.locator('#stop-tracking');
  
    await expect(startBtn).toBeEnabled();
    await expect(stopBtn).toBeEnabled();
    
    await startBtn.click();
    await expect(page.locator('#start-experiment')).toBeDisabled(); // Кнопка должна быть неактивна
    await stopBtn.click();
  });

  test('Калибровка', async () => {
    await page.click('#calibrate');
    await expect(page.locator('#calibration-instruction-modal')).toBeVisible();
    
    await page.click('#calibration-start-btn');
    await expect(page.locator('.calibration-point')).toHaveCount(20); // Предполагаем 20 точек калибровки
  });

  test('Выбор параметров эксперимента', async () => {
    const startExperimentBtn = page.locator('#start-experiment');

    await expect(startExperimentBtn).toBeDisabled();
    await page.click('input[name="marketplace"][value="Ozon"]');
    await page.click('input[name="section"][value="Главная"]');
    await page.click('#start-tracking');
    await expect(startExperimentBtn).toBeEnabled();
  });

  test('Запуск эксперимента', async () => {
    await page.click('input[name="marketplace"][value="Wildberries"]');
    await page.click('input[name="section"][value="Карточка"]');
    await page.click('#start-tracking');
  
    await page.click('#start-experiment');
    await expect(page.locator('#experiment-screen')).toBeVisible();
    const iframe = page.frameLocator('#myIframe');
    await expect(iframe.locator('body')).not.toBeEmpty();
    
  });

  test('Переход к опросу', async () => {
    await page.click('#go-to-survey');
    await expect(page.locator('#survey-screen')).toBeVisible();
    await expect(page.locator('#survey-form')).toBeVisible();
  });

  test('Состояние кнопок при разных условиях', async () => {
    const startExperimentBtn = page.locator('#start-experiment');
    

    await expect(startExperimentBtn).toBeDisabled();
    
    await page.click('input[name="marketplace"][value="ЯндексМаркет"]');
    await expect(startExperimentBtn).toBeDisabled();
    
    await page.click('input[name="marketplace"][value="ЯндексМаркет"]', { clickCount: 2 }); // Снимаем выбор
    await page.click('input[name="section"][value="Карточка"]');
    await expect(startExperimentBtn).toBeDisabled();
    
    await page.click('input[name="marketplace"][value="ЯндексМаркет"]');
    await expect(startExperimentBtn).toBeDisabled();
  });
});