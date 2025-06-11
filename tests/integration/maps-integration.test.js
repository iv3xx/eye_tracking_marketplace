const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const mysql = require('mysql2/promise');
const path = require('path');
const uploadsPath = path.resolve(__dirname, '../../php/uploads');
const imgGeneratePath = path.resolve(__dirname, '../../php/img_generate');


describe('Генерация тепловых карт - интеграционные тесты', () => {
  const BASE_URL = 'http://localhost';
  let connection;

  beforeAll(async () => {
    // Подключение к БД
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'nasty',
      password: '06042002',
      database: 'gaze_experiment',
      port: 1150
    });

    
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath);
if (!fs.existsSync(imgGeneratePath)) fs.mkdirSync(imgGeneratePath);
  });

  afterAll(async () => {
    await connection.end();
    // Очистка временных файлов
    const testFiles = [
    path.join(__dirname, 'test_gaze_data.txt'),
    path.join(uploadsPath, 'parsed_heatmap_data.json'),
    path.join(imgGeneratePath, 'heatmap2.png'),
    path.join(imgGeneratePath, 'circles.png'),
    path.join(imgGeneratePath, 'maps.zip')
    ];
    testFiles.forEach(file => {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    });
  });

  
    it('Отображение формы выбора маркетплейса и раздела', () => {
      const marketplaces = ['Ozon', 'Wildberries', 'ЯндексМаркет', 'МегаМаркет'];
      const sections = ['Главная', 'Поиск', 'Карточка'];

      expect(marketplaces).toHaveLength(4);
      expect(sections).toHaveLength(3);
    });
  

  
    it('Корректная обработка загрузки файлов', async () => {
      const testFilePath = path.join(__dirname, 'test_gaze_data.txt');
      const form = new FormData();

      const testData = 'time,x_screen,y_screen,x_iframe,y_iframe\n00:00.123,100,200,80,180';
      fs.writeFileSync(testFilePath, testData);

      form.append('marketplace', 'Ozon');
      form.append('section', 'Главная');
      form.append('files[]', fs.createReadStream(testFilePath));

      const response = await axios.post(`${BASE_URL}/php/upload_files.php`, form, {
        headers: form.getHeaders()
      });

      expect(response.status).toBe(200);
      expect(response.data).toContain('Обработка завершена');
      expect(fs.existsSync(path.join(uploadsPath, 'parsed_heatmap_data.json'))).toBe(true);

    });

    it('Возвращение ошибки при отсутствии marketplace или section', async () => {
      const testFilePath = path.join(__dirname, 'test_gaze_data.txt');
      const form = new FormData();

      fs.writeFileSync(testFilePath, 'time,x_screen,y_screen,x_iframe,y_iframe\n00:00.123,100,200,80,180');
      form.append('files[]', fs.createReadStream(testFilePath));

      const response = await axios.post(`${BASE_URL}/php/upload_files.php`, form, {
        headers: form.getHeaders()
        });

        expect(response.status).toBe(200);
        expect(response.data).toContain('Ошибка: отсутствуют marketplace или section.');

    });
  

  
    beforeAll(() => {
      const testData = {
        marketplace: 'Ozon',
        section: 'Главная',
        canvas: { width: 1920, height: 13247 },
        data: [
          {
            participant_id: 1,
            time: '00:00.100',
            x_screen: 120.010002136230471,
            y_screen: 240.010002136230471,
            x_iframe: 100.010002136230471,
            y_iframe: 200.010002136230471
          }
        ]
      };
      fs.writeFileSync(path.join(uploadsPath, 'parsed_heatmap_data.json'), JSON.stringify(testData));
    });

    it('Генерация тепловых карт', async () => {
       jest.setTimeout(60000);
        const response = await axios.get(`${BASE_URL}/php/heat_maps.php`);

      expect(response.status).toBe(200);
      expect(response.data).toContain('Изображение сохранено');

      expect(fs.existsSync('img_generate/heatmap2.png')).toBe(false);
      expect(fs.existsSync('img_generate/circles.png')).toBe(false);
    },60000);

    it('Возвращение ошибки при отсутствии данных', async () => {
      fs.unlinkSync(path.join(uploadsPath, 'parsed_heatmap_data.json'));

       const response = await axios.get(`${BASE_URL}/php/heat_maps.php`);
  expect(response.data).toContain('Ошибка: файл с данными не найден');
    });
 

  
    it('Загрузка данных участника из БД', async () => {
     
     await connection.execute(
        'DELETE FROM gaze_data WHERE participant_number = ?',
        [299]
    );
     
     await connection.execute(
            'DELETE FROM participants WHERE participant_number = ?',
            [299]
        );
        await connection.execute(
        'INSERT INTO participants (participant_number, gender, age, color) VALUES (?, ?, ?, ?)',
        [299, 'мужской', 25, 'hsl(220.70400000000158)']
        );

      await connection.execute(
        `INSERT INTO gaze_data 
        (participant_number, time_stamp, x_screen, y_screen, x_iframe, y_iframe, frame_name) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [299, '00:00.100', 100, 200, 80, 180, 'Ozon_Главная']
      );

      const [rows] = await connection.execute(
        `SELECT * FROM gaze_data WHERE participant_number = ?`,
        [299]
      );

      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0]).toHaveProperty('x_screen', 100);
    });

  
    it('Создание ZIP-архива с изображениями', async () => {
        fs.writeFileSync(path.join(imgGeneratePath, 'heatmap2.png'), 'test');
        fs.writeFileSync(path.join(imgGeneratePath, 'circles.png'), 'test');
      const response = await axios.get(`${BASE_URL}/php/heat_maps.php?download=1`, {
        responseType: 'arraybuffer'
      });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/json');
    });
  

});
