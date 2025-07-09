import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,          // Кол-во виртуальных пользователей
  duration: '30s',  // Длительность теста
};

export default function () {
  const url = 'http://localhost/php/heat_maps.php'; // Замените на реальный путь к скрипту
  const payload = JSON.stringify({
    canvas: {
      width: 1920,
      height: 1080,
    },
    data: [
      { participant_id: 1, x_iframe: 500, y_iframe: 300 },
      { participant_id: 2, x_iframe: 550, y_iframe: 320 },
      { participant_id: 3, x_iframe: 530, y_iframe: 310 },
      // Можно сгенерировать больше данных
    ]
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response body contains success': (r) => r.body.includes('Изображение сохранено'),
  });

  sleep(1); // Пауза между запросами (симуляция поведения пользователей)
}
