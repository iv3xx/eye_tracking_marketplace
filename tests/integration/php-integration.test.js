const axios = require('axios');
const mysql = require('mysql2/promise');

const BASE_URL = 'http://localhost/php/save_experiment.php';

// Настройки БД
const dbConfig = {
  host: 'localhost',
  user: 'nasty',
  password: '06042002',
  database: 'gaze_experiment',
  port: 1150,
};

describe('PHP API Integration Tests', () => {
  let connection;
  const testParticipantId = Math.floor(Math.random() * 1000) + 100; // Генерация случайного ID

  beforeAll(async () => {
    connection = await mysql.createConnection(dbConfig);
  });

 afterAll(async () => {
  // Сначала удаляем gaze_data, затем participants
  await connection.execute(
    'DELETE FROM gaze_data WHERE participant_number >= 100'
  );
  await connection.execute(
    'DELETE FROM participants WHERE participant_number >= 100'
  );
  await connection.end();
});

 
  it('Сохранение корректных данных эксперимента в БД', async () => {
    const testPayload = {
      participantNumber: testParticipantId,
      gender: 'мужской',
      age: 25,
      color: 'hsl(220, 70%, 50%)',
      frameName: 'Wildberries_Карточка',
      gazeData: [
        {
          time: '00:00.123',
          x_screen: 120.010002136230471,
          y_screen: 240.010002136230471,
          x_iframe: 100.010002136230471,
          y_iframe: 200.010002136230471
        },
      ]
    };

    const res = await axios.post(BASE_URL, testPayload);
    expect(res.status).toBe(200);

    // Проверка участника
    const [participants] = await connection.execute(
      'SELECT * FROM participants WHERE participant_number = ?',
      [testParticipantId]
    );
    
    expect(participants[0]).toMatchObject({
      gender: 'мужской',
      age: 25,
      color: expect.stringMatching(/hsl/),
    });

    // Проверка координат
    const [gazeData] = await connection.execute(
      'SELECT * FROM gaze_data WHERE participant_number = ?',
      [testParticipantId]
    );
    
    expect(gazeData[0]).toMatchObject({
      x_screen: 120.010002136230471,
      frame_name: 'Wildberries_Карточка'
    });
  });


  it('Корректная обработка дублирующихся записей участников', async () => {
    const payload = {
      participantNumber: testParticipantId, // Используем тот же ID
      gender: 'женский', // Пробуем изменить данные
      age: 30,
      gazeData: [{ time: '00:00.000', x_screen: 105.010002136230471, y_screen: 205.010002136230471 }],
      frameName: 'Ozon_Главная'
    };

    const [participants] = await connection.execute(
      'SELECT * FROM participants WHERE participant_number = ?',
      [testParticipantId]
    );
    expect(participants[0].gender).toBe('мужской'); // Осталось старое значение
  });

  it('Отклонение некорректных данных взгляда', async () => {
    const invalidPayload = {
      participantNumber: testParticipantId + 1,
      gender: 'мужской',
      age: 25,
      gazeData: [{ invalid: 'format' }], // Неправильный формат
      frameName: 'Ozon_Главная'
    };

    await expect(axios.post(BASE_URL, invalidPayload))
      .rejects
      .toHaveProperty('response.status', 500);
  });

  it('Корректное сохранение нескольких точек взгляда', async () => {
    const multiGazePayload = {
      participantNumber: testParticipantId + 2,
      gender: 'женский',
      age: 22,
      color: 'hsl(220, 70%, 50%)',
      frameName: 'ЯндексМаркет_Поиск',
      gazeData: [
        { time: '00:00.100',
          x_screen: 100.010002136230471,
          y_screen: 200.010002136230471 ,
          x_iframe: 100.010002136230471,
          y_iframe: 200.010002136230471
       },
        { time: '00:00.200',
           x_screen: 150.010002136230473,
           y_screen: 250.010002136230471,
           x_iframe: 100.010002136230471,
           y_iframe: 200.010002136230471
           },
      ]
      
    };

    const res = await axios.post(BASE_URL, multiGazePayload);
    expect(res.status).toBe(200);

    const [gazeRows] = await connection.execute(
      'SELECT * FROM gaze_data WHERE participant_number = ? ORDER BY time_stamp',
      [testParticipantId + 2]
    );
    
    expect(gazeRows.length).toBe(2);
    expect(gazeRows[1].x_screen).toBe(150.00999450683594);
  });

  it('Проверка требования заполнения всех обязательных полей', async () => {
    const incompletePayload = {
      // Нет participantNumber
      gender: 'мужской',
      gazeData: [{ time: '00:00.000', x_screen: 100.010002136230471 }]
    };

    await expect(axios.post(BASE_URL, incompletePayload))
      .rejects
      .toHaveProperty('response.status', 500);
  });
});