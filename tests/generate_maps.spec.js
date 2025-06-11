import { test, expect } from '@playwright/test';

test.describe('Страница генерации тепловых карт', () => {

  test.beforeEach(async ({ page }) => {
    // Открыть главную страницу
    await page.goto('http://localhost:3000/index.html'); // Укажи свой путь/порт

    // Клик по кнопке "Генерация тепловых карт"
    await page.getByRole('button', { name: 'Генерация тепловых карт' }).click();

    // Убедиться, что попали на нужную страницу
    await expect(page).toHaveURL(/generate_maps\.html$/);
  });

  test('Проверка отображения элементов интерфейса', async ({ page }) => {
    await expect(page.getByText('Выберите источник данных')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Выбрать' })).toBeVisible();
  });

  test('Выбор источника "Файл" отображает форму загрузки', async ({ page }) => {
    await page.getByLabel('Файлы').check();
    await page.getByRole('button', { name: 'Выбрать' }).click();

    await expect(page.getByText('Загрузить данные через файл')).toBeVisible();
  });

  test('Выбор источника "БД" отображает поля ввода участников', async ({ page }) => {
    await page.getByLabel('База данных').check();
    await page.getByRole('button', { name: 'Выбрать' }).click();

    await expect(page.getByText('Загрузить данные из базы данных')).toBeVisible();
    await expect(page.getByLabel('Введите номера участников')).toBeVisible();
  });

  test('Загрузка файла: отображение валидных и невалидных файлов', async ({ page }) => {
    // Выбор источника, площадки и раздела
    await page.getByLabel('Файлы').check();
    await page.getByRole('button', { name: 'Выбрать' }).click();

    await page.getByLabel('Ozon').check();
    await page.getByLabel('Главная').check();

    // Загрузить файл (валидация по имени: 123_Ozon_Главная.json)
    const input = await page.locator('input[type="file"]');
    await input.setInputFiles([
      {
        name: '123_Ozon_Главная.txt',
        mimeType: 'application/txt',
        buffer: Buffer.from('{}'),
      },
      {
        name: 'wrong_file.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('test'),
      }
    ]);

    await expect(page.locator('#file-list')).toContainText('Подходящие файлы');
    await expect(page.locator('#file-list')).toContainText('Неподходящие файлы');
  });

  test('Кнопка "Готово" активна только при валидных файлах', async ({ page }) => {
    await page.getByLabel('Файлы').check();
    await page.getByRole('button', { name: 'Выбрать' }).click();
    await page.getByLabel('Ozon').check();
    await page.getByLabel('Главная').check();

    // Один валидный файл
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: '123_Ozon_Главная.txt',
      mimeType: 'application/txt',
      buffer: Buffer.from('{}'),
    });

    await expect(page.getByRole('button', { name: 'Готово' })).toBeEnabled();
  });
});
