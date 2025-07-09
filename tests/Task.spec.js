const { test, expect } = require('@playwright/test');

test.describe('Экран эксперимента', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000'); 
    await page.click('#start-btn');
    await page.click('#confirm-rules');

    await page.fill('#participant-id', '1001');
    await page.fill('#age', '25');
    await page.check('#agree-data');
    await page.check('#agree-experiment');
    await page.click('#submit-user-btn');
  });

  test('Кнопка "Начать эксперимент" отключена по умолчанию', async ({ page }) => {
    const startExpButton = page.locator('#start-experiment');
    await expect(startExpButton).toBeDisabled();
  });

  test('Кнопка "Начать эксперимент" активируется при выполнении условий', async ({ page }) => {
 
    await page.click('#start-tracking');

    await page.check('input[name="marketplace"][value="Ozon"]');
    await page.check('input[name="section"][value="Главная"]');

    const startExpButton = page.locator('#start-experiment');
    await expect(startExpButton).toBeEnabled();
  });

  test('Старт эксперимента отображает iframe и скрывает панель', async ({ page }) => {
    await page.click('#start-tracking');
    await page.check('input[name="marketplace"][value="Ozon"]');
    await page.check('input[name="section"][value="Главная"]');

    await page.click('#start-experiment');
    await expect(page.locator('#experiment-screen')).toBeVisible();
    await expect(page.locator('#control-screen')).toBeHidden();

  
    const iframe = page.locator('#myIframe');
    await expect(iframe).toBeVisible();
    await expect(iframe).toHaveAttribute('src', /Ozon\.html/);
  });

  test('Кнопка "Закончить эксперимент" появляется после завершения задач', async ({ page }) => {
    await page.click('#start-tracking');
    await page.check('input[name="marketplace"][value="Ozon"]');
    await page.check('input[name="section"][value="Главная"]');
    await page.click('#start-experiment');


    await page.evaluate(() => {
      const btn = document.getElementById('end-experiment');
      btn.disabled = false;
      btn.style.display = 'inline-block';
    });

    const endButton = page.locator('#end-experiment');
    await expect(endButton).toBeVisible();
    await expect(endButton).toBeEnabled();
  });

  test('Завершение эксперимента возвращает на экран управления', async ({ page }) => {
  await page.click('#start-tracking');
  await page.check('input[name="marketplace"][value="Ozon"]');
  await page.check('input[name="section"][value="Главная"]');
  await page.click('#start-experiment');


  for (let i = 0; i < 4; i++) {
    await expect(page.locator('#task-modal')).toBeVisible();
    await page.click('#start-task-btn'); 
    await page.keyboard.press('Space');  
  }


  await expect(page.locator('#final-task-modal')).toBeVisible();
  await page.click('#final-task-ok-btn'); 

  const endBtn = page.locator('#end-experiment');
  await expect(endBtn).toBeEnabled();
  await endBtn.click();
  await expect(page.locator('#control-screen')).toBeVisible();
  await expect(page.locator('#experiment-screen')).toBeHidden();
});
  test('Отображается первое задание при старте', async ({ page }) => {
  await page.click('#start-tracking');
  await page.check('input[name="marketplace"][value="Ozon"]');
  await page.check('input[name="section"][value="Главная"]');
  await page.click('#start-experiment');

  const taskModal = page.locator('#task-modal');
  await expect(taskModal).toBeVisible();

  const taskText = page.locator('#task-text');
  await expect(taskText).not.toHaveText(''); 
});

test('Плашка закрывется по нажатию кнопки', async ({ page }) => {
  await page.click('#start-tracking');
  await page.check('input[name="marketplace"][value="Ozon"]');
  await page.check('input[name="section"][value="Главная"]');
  await page.click('#start-experiment');

  await page.waitForSelector('#task-modal');
  await page.click('#task-modal button');

  await expect(page.locator('#task-modal')).toBeHidden();
});

test('Появление следующего задания при нажатии на пробел', async ({page}) => {
   await page.click('#start-tracking');
  await page.check('input[name="marketplace"][value="Ozon"]');
  await page.check('input[name="section"][value="Главная"]');
  
  await page.click('#start-experiment');
  
    await page.click('text=Выполнить задание');
    await page.waitForTimeout(200);

    await page.keyboard.press('Space');

     await page.waitForSelector('#task-modal' || '#final-task-modal');
    
    
  });

test('Появляется плашка "Все задания завершены" после последнего', async ({ page }) => {
  await page.click('#start-tracking');
  await page.check('input[name="marketplace"][value="Ozon"]');
  await page.check('input[name="section"][value="Главная"]');
  await page.click('#start-experiment');

  const tasksCount = 4; 

  for (let i = 0; i < tasksCount; i++) {
    await page.waitForSelector('#task-modal');
    await page.click('#task-modal button');
    await page.keyboard.press('Space');
  }

  await expect(page.locator('#final-task-modal')).toBeVisible({ timeout: 5000 });
});
});
