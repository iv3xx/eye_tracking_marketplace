import { startTracking, stopTracking } from './tracking.js';
import { startCalibration, createCalibrationPoints } from './calibration.js';
import { startRecording, stopRecording, getGazeData } from './recordGazeData.js';

const htmlUpload = document.getElementById('html-upload');
const iframe = document.getElementById('myIframe');
const generateHeatmapsBtn = document.getElementById('generate-heatmaps'); // кнопка "Построить тепловые карты"
const createHeatmapsBtn = document.getElementById('create-heatmaps'); // сама кнопка для запуска в твоём интерфейсе
const heatmapUploadSection = document.getElementById('heatmap-upload-section');
const heatmapFilesInput = document.getElementById('heatmap-files');
const uploadHeatmapFilesBtn = document.getElementById('upload-heatmap-files');
const heatmapStatus = document.getElementById('heatmap-status');
const heatmapPreview = document.getElementById('heatmap-preview');
const heatmapImagesContainer = document.getElementById('heatmap-images-container');
const pageLengthInput = document.getElementById('page-length');
let isTrackingActive = false;
let uploadedHtmlUrl = null;

htmlUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file && file.type === 'text/html') {
    const reader = new FileReader();
    reader.onload = () => {
      if (uploadedHtmlUrl) {
        URL.revokeObjectURL(uploadedHtmlUrl); // очищаем старый, если был
      }
      const blob = new Blob([reader.result], { type: 'text/html' });
      uploadedHtmlUrl = URL.createObjectURL(blob);
      iframe.src = uploadedHtmlUrl; // показываем сразу
    };
    reader.readAsText(file);
  }
});

// Обработка кнопки "Начать отслеживание"
const startTrackingBtn = document.getElementById('start-tracking');
const stopTrackingBtn = document.getElementById('stop-tracking');

startTrackingBtn.onclick = () => {
  startTracking();
  startRecording();
  isTrackingActive = true;
  startTrackingBtn.classList.add('hidden');
  stopTrackingBtn.classList.remove('hidden');
  updateStartExperimentButtonState();
};

stopTrackingBtn.onclick = () => {
  stopRecording();
  stopTracking();
  isTrackingActive = false;
  stopTrackingBtn.classList.add('hidden');
  startTrackingBtn.classList.remove('hidden');
  updateStartExperimentButtonState();
};

document.getElementById('calibrate').onclick = () => {
  document.getElementById('calibration-instruction-modal').style.display = 'flex';
};

document.getElementById('calibration-start-btn').onclick = () => {
  document.getElementById('calibration-instruction-modal').style.display = 'none';
  createCalibrationPoints();
  startCalibration();
};

function updateStartExperimentButtonState() {
  const startBtn = document.getElementById('start-experiment');
  startBtn.disabled = !isTrackingActive;
}

function isValidUsernameFormat(name) {
  // Проверка формата: число + _ + текст (хотя бы один символ после _)
  // Пример валидного: "1_google", "23_test"
  return /^\d+_.+/.test(name);
}

// Начать эксперимент
document.getElementById('start-experiment').onclick = () => {
  const username = document.getElementById('username').value.trim();
  if (!username) {
    alert('Введите имя участника перед началом эксперимента.');
    return;
  }
   if (!isValidUsernameFormat(username)) {
    alert('Имя участника должно иметь формат "число_текст", например "1_google".');
    return;
  }
   if (!uploadedHtmlUrl) {
    alert('Сначала загрузите HTML-файл.');
    return;
  }

 // При старте заново подставляем src, чтобы быть уверенными, что iframe загружен
  iframe.src = uploadedHtmlUrl;
  iframe.dataset.filename = username + '.txt';

  document.getElementById('control-screen').style.display = 'none';
 document.getElementById("experiment-screen").style.display = "block";

  startRecording();

  // Показываем кнопку завершения эксперимента
  document.getElementById('end-experiment').style.display = 'inline-block';
  document.getElementById('end-experiment').disabled = false;
};

// Завершить эксперимент
document.getElementById('end-experiment').onclick = () => {
  const filename = document.getElementById('username').value.trim() || 'experiment_data';

  const gazeData = getGazeData();
  saveExperimentData(filename + '.txt', gazeData);

  document.getElementById("experiment-screen").style.display = "none";
  document.getElementById('control-screen').style.display = 'block';

  stopRecording();
};

// Сохранение данных эксперимента
function saveExperimentData(filename, gazeData) {
  const csvData = gazeData.join('\n');
  const blob = new Blob([csvData], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

// Отладка кнопки калибровки
document.getElementById('calibrate').onclick = () => {
  console.log('Нажали кнопку калибровки');
  document.getElementById('calibration-instruction-modal').style.display = 'flex';
};

const createHeatmapsMainBtn = document.getElementById('generate-heatmaps'); // кнопка "Создать тепловые карты" в блоке 3

// При клике на "Создать тепловые карты" показываем интерфейс загрузки
createHeatmapsMainBtn.addEventListener('click', () => {
  heatmapUploadSection.style.display = 'block';
  heatmapStatus.textContent = '';
  heatmapPreview.style.display = 'none';
  heatmapImagesContainer.innerHTML = '';
  uploadHeatmapFilesBtn.disabled = true;
  generateHeatmapsBtn.disabled = true;
  heatmapFilesInput.value = '';
  pageLengthInput.value = '';
});

// Активируем кнопку загрузки, если выбран хотя бы 1 файл и введена длина страницы
function updateUploadButtonState() {
  uploadHeatmapFilesBtn.disabled = !(heatmapFilesInput.files.length > 0 && pageLengthInput.value.trim() !== '');
}

heatmapFilesInput.addEventListener('change', updateUploadButtonState);
pageLengthInput.addEventListener('input', updateUploadButtonState);

// Обработка загрузки файлов
uploadHeatmapFilesBtn.addEventListener('click', () => {
  const files = heatmapFilesInput.files;
  const pageLength = pageLengthInput.value.trim();

  if (!files.length) {
    alert('Выберите хотя бы один файл');
    return;
  }
  if (!pageLength || isNaN(pageLength) || +pageLength <= 0) {
    alert('Введите корректную длину страницы');
    return;
  }

  const formData = new FormData();
  for (const file of files) {
    formData.append('files[]', file);
  }
  formData.append('page_length', pageLength);

  heatmapStatus.style.color = 'black';
  heatmapStatus.textContent = 'Загрузка файлов...';

  fetch('php/upload_files_cr.php', { 
    method: 'POST',
    body: formData
  })
  .then(response => response.text())
  .then(result => {
    heatmapStatus.style.color = 'green';
    heatmapStatus.textContent = 'Файлы успешно загружены. Теперь можно построить тепловые карты.';
    createHeatmapsBtn.disabled = false;
  })
  .catch(error => {
    heatmapStatus.style.color = 'red';
    heatmapStatus.textContent = 'Ошибка при загрузке файлов: ' + error;
  });
});

createHeatmapsBtn.addEventListener('click', () => {
  // Показываем индикатор загрузки
  const loading = document.createElement('div');
  loading.id = 'heatmap-loading';
  loading.textContent = 'Генерация тепловых карт... Пожалуйста, подождите.';
  document.body.appendChild(loading);

  fetch('php/heat_maps.php')
    .then(response => response.text())
    .then(data => {
      const loading = document.getElementById('heatmap-loading');
      if (loading) loading.remove();

      console.log('Ответ от heat_maps.php:', data);
      alert('Генерация тепловых карт завершена!');

      heatmapPreview.style.display = 'block';
      heatmapImagesContainer.innerHTML = ''; // очищаем перед вставкой

      const imageNames = [
        'circles.png',
        'intersection_zones.png',
        'heatmap2.png',
        'circle_outlines.png',
        'intersection_zonesBlack.png'
      ];

      imageNames.forEach(name => {
        const wrapper = document.createElement('div');
        wrapper.style.marginBottom = '20px';

        const title = document.createElement('p');
        title.innerHTML = `<strong>${name}</strong>`;

        const img = document.createElement('img');
        img.src = `php/img_generate/${name}?t=${Date.now()}`; // кэш обход
        img.style = 'max-width: 600px; width: 100%; height: auto; border: 1px solid #ccc;';

        const downloadLink = document.createElement('a');
        downloadLink.href = `php/img_generate/${name}`;
        downloadLink.download = name;
        downloadLink.textContent = 'Скачать';

        wrapper.appendChild(title);
        wrapper.appendChild(img);
        wrapper.appendChild(document.createElement('br'));
        wrapper.appendChild(downloadLink);

        heatmapImagesContainer.appendChild(wrapper);
      });

      // Кнопка "Скачать всё"
      const zipDownload = document.createElement('div');
      zipDownload.style.marginTop = '30px';
      zipDownload.innerHTML = `
        <a href="php/download_zip.php" class="download-zip" style="font-weight: bold; color: blue;" download>
          Скачать все изображения в архиве (.zip)
        </a>`;
      heatmapImagesContainer.appendChild(zipDownload);
       document.getElementById("map-overlay-controls").style.display = "block";
    })
    .catch(error => {
      const loading = document.getElementById('heatmap-loading');
      if (loading) loading.remove();

      console.error('Ошибка:', error);
      heatmapStatus.style.color = 'red';
      heatmapStatus.textContent = 'Произошла ошибка при генерации тепловых карт.';
    });
});

document.getElementById("show-selected-overlay").addEventListener("click", () => {
  const selectedMap = document.querySelector("input[name='overlay-map']:checked")?.value;
  const pageLength = +document.getElementById("page-length").value;

  if (!uploadedHtmlUrl) {
    alert("Сначала загрузите HTML-файл.");
    return;
  }

  if (!selectedMap) {
    alert("Выберите карту для наложения.");
    return;
  }

  if (!pageLength || isNaN(pageLength)) {
    alert("Введите корректную длину страницы.");
    return;
  }

  showHeatmapOverlay(selectedMap, pageLength);
});

function showHeatmapOverlay(mapFileName, height) {
  const container = document.getElementById("iframe-overlay-wrapper");
  container.innerHTML = '';

  const iframe = document.createElement("iframe");
  iframe.src = uploadedHtmlUrl;
  iframe.style.width = "100%";
  iframe.style.height = `${height}px`;
  iframe.style.border = "none";

  const heatmapImg = document.createElement("img");
  heatmapImg.src = `php/img_generate/${mapFileName}?t=${Date.now()}`;
  heatmapImg.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: ${height}px;
    opacity: 0.7;
    pointer-events: none;
    z-index: 10;
  `;

  container.style.height = `${height}px`;
  container.appendChild(iframe);
  container.appendChild(heatmapImg);

  document.getElementById("overlay-frame-container").style.display = "block";
}

document.getElementById('show-full-instruction-btn').addEventListener('click', () => {
  document.getElementById('full-instruction-modal').style.display = 'flex';
});

document.getElementById('close-full-instruction-btn').addEventListener('click', () => {
  document.getElementById('full-instruction-modal').style.display = 'none';
});

document.getElementById('exit-exp').addEventListener('click', () => {
  window.location.href = 'index.html';
});