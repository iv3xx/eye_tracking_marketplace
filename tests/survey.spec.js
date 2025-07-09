const { test, expect } = require('@playwright/test');

test.describe('Функциональность опроса', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://localhost:3000');

    // Начальные экраны
    await page.click('#start-btn');
    await page.click('#confirm-rules');

    await page.fill('#participant-id', '123');
    await page.fill('#age', '25');
    await page.check('#agree-data');
    await page.check('#agree-experiment');
    await page.click('#submit-user-btn');

    await page.click('#go-to-survey');
    await expect(page.locator('#survey-screen')).toBeVisible();
  });

  test('Отображение формы опроса', async () => {
    await expect(page.locator('#survey-screen h2')).toHaveText('Оцените следующие утверждения');

    const blocks = await page.locator('.survey-block').count();
    expect(blocks).toBe(17);
    await page.waitForSelector('.survey-block:visible');
    const platforms = ['Wildberries', 'Ozon', 'Яндекс Маркет', 'Мегамаркет'];
    for (const platform of platforms) {
      await expect(page.locator(`text=${platform}`).first()).toBeVisible();
    }

    const options = ['Совершенно не согласен', 'Совершенно согласен'];
    for (const option of options) {
      await expect(page.locator(`text=${option}`).first()).toBeVisible();
    }
  });

  test('Попытка отправки без заполнения всех ответов должна вызвать alert', async () => {
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Пожалуйста, заполните все ответы');
      await dialog.dismiss();
    });

    await page.click('#submit-survey');

    await expect(page.locator('#survey-screen')).toBeVisible();
  });

  test('Полное заполнение опроса и скачивание файла', async () => {
    for (let i = 0; i < 17; i++) {
      for (const platform of ['Wildberries', 'Ozon', 'Яндекс Маркет', 'Мегамаркет']) {
        const selector = `input[name="q${i}_${platform}"][value="3"]`;
        await page.click(selector);
      }
    }
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#submit-survey')
    ]);

    expect(download.suggestedFilename()).toBe('123_Результаты_опроса.xlsx');
    await expect(page.locator('#screen-1')).toBeVisible();
  });

  test('Структура экспортируемых данных', async () => {
    await page.click('input[name="q0_Wildberries"][value="5"]');
    await page.click('input[name="q1_Ozon"][value="1"]');

    await page.exposeFunction('mockExport', data => {
      expect(data.length).toBe(17 * 4);
      expect(data[0]).toEqual({
        platform: 'Wildberries',
        statement: 'Дизайн страниц маркетплейса выдержан в едином стиле.',
        response: 5
      });
      expect(data[1]).toEqual({
        platform: 'Ozon',
        statement: 'Дизайн страниц маркетплейса выдержан в едином стиле.',
        response: null
      });
    });

    await page.evaluate(() => {
      window.exportSurveyToExcel = function (responses) {
        window.mockExport(responses);
        return true;
      };
    });


    await page.evaluate(() => {
      const original = window.collectSurveyResponses;
      window.collectSurveyResponses = () => {
        const r = original();
        return { ...r, allAnswered: true };
      };
    });

    await page.click('#submit-survey');
  });
});
