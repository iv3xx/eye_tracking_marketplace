//main.js

import { startTracking, stopTracking } from './tracking.js';
import { startCalibration, createCalibrationPoints } from './calibration.js';
import { startRecording, stopRecording, getGazeData } from './recordGazeData.js';
import { initTaskFlow, startCurrentTask } from './TaskManager.js';
window.startCurrentTask = startCurrentTask;

let participantId = '';
let selectedMarketplace = '';
let selectedSection = '';
let isTrackingActive = false;
let iframe;


// При нажатии "Начать тестирование"
document.getElementById("start-btn").onclick = () => {
  // Показываем окно подтверждения
  document.getElementById("rules-confirmation").style.display = "flex";
};

// Подтверждение ознакомления
document.getElementById("confirm-rules").onclick = () => {
  document.getElementById("rules-confirmation").style.display = "none";
  document.getElementById("screen-1").style.display = "none";
  document.getElementById("form-screen").style.display = "block";
};

// Отмена — возвращаемся к правилам
document.getElementById("cancel-rules").onclick = () => {
  document.getElementById("rules-confirmation").style.display = "none";
};

const agreeData = document.getElementById("agree-data");
const agreeExperiment = document.getElementById("agree-experiment");
const submitBtn = document.getElementById("submit-user-btn");

// Следим за изменением состояния чекбоксов
agreeData.addEventListener('change', updateSubmitButtonState);
agreeExperiment.addEventListener('change', updateSubmitButtonState);

document.getElementById("submit-user-btn").onclick = () => {
 participantId = document.getElementById("participant-id").value;
  const age = parseInt(document.getElementById("age").value, 10);

  if (!agreeData.checked || !agreeExperiment.checked) {
    alert("Вы должны дать оба согласия для продолжения.");
    return;
  }

  if (!participantId) {
    alert("Введите номер участника!");
    return;
  }

  if (isNaN(age) || age < 18) {
    alert("Возраст введён некорректно или не соответствует правилам участия в эксперименте. Допускаются только участники старше 18 лет.");
    return;
  }

  document.getElementById("current-id").textContent = participantId;
  document.getElementById("form-screen").style.display = "none";
  document.getElementById("control-screen").style.display = "block";
};

// Отслеживание
document.getElementById("start-tracking").onclick = () => {
    startTracking();
    isTrackingActive = true;
    updateStartExperimentButtonState();
  };

document.getElementById("stop-tracking").onclick = () => {
  stopTracking();
  isTrackingActive = false;
  updateStartExperimentButtonState();
};

document.getElementById("calibrate").onclick = () => {
   document.getElementById("calibration-instruction-modal").style.display = "flex";
};   

 document.getElementById("calibration-start-btn").onclick = () => {
  document.getElementById("calibration-instruction-modal").style.display = "none";
  createCalibrationPoints();
  startCalibration();
};

function updateStartExperimentButtonState() {
    const btn = document.getElementById("start-experiment");
    const marketplaceSelected = document.querySelector("input[name='marketplace']:checked");
    const sectionSelected = document.querySelector("input[name='section']:checked");
  
    btn.disabled = !(marketplaceSelected && sectionSelected && isTrackingActive);
  }

// Выбор радиокнопок
const radioGroups = document.querySelectorAll("input[type='radio']");
radioGroups.forEach((radio) => {
  radio.onchange = () => {
    selectedMarketplace = document.querySelector("input[name='marketplace']:checked")?.value || '';
    selectedSection = document.querySelector("input[name='section']:checked")?.value || '';
    updateStartExperimentButtonState();
     };
});

// Начать эксперимент
document.getElementById("start-experiment").onclick = () => {
 iframe = document.getElementById("myIframe");
  // Генерация имени файла
  const sectionSlug = selectedSection === "Карточка" ? "Карточка_товара" : selectedSection;
  const filename = `${participantId}_${selectedMarketplace}_${sectionSlug}.txt`;
  const frameName = `${selectedMarketplace}_${sectionSlug}`;
  
  const endBtn = document.getElementById("end-experiment");
  endBtn.style.display = "none"; // <-- сброс отображения
  endBtn.disabled = true;

  iframe.src = getFrameUrl(selectedMarketplace, selectedSection);
  document.getElementById("control-screen").style.display = "none";
  document.getElementById("experiment-screen").style.display = "block";
 document.getElementById("end-experiment").disabled = true;

  // Сохраняем имя файла для использования при завершении
  
  iframe.dataset.filename = filename;
  iframe.dataset.frameName = frameName;
   // Задачи
   initTaskFlow(selectedSection, () => {
   const endBtn = document.getElementById("end-experiment");
    endBtn.style.display = "inline-block"; 
   
});
};

// Завершить эксперимент
document.getElementById("end-experiment").onclick = () => {
  const filename = iframe.dataset.filename;
  
  // Получаем данные о взгляде
  const gazeData = getGazeData();
  
    // Сохраняем данные эксперимента
    saveExperimentData(filename, gazeData);
    const frameName = iframe.dataset.frameName;
    const gender = document.getElementById("gender").value;
    const age = document.getElementById("age").value;
    saveExperimentDataToDB(participantId, gender, age, gazeData,frameName);

  document.getElementById("experiment-screen").style.display = "none";
  document.getElementById("control-screen").style.display = "block";

    // Остановить запись данных
    stopRecording();
};

function getFrameUrl(marketplace, section) {
  const base = "html_marketplace";
  if (section === "Главная") return `${base}/${marketplace}.html`;
  if (section === "Карточка") return `${base}/${marketplace}_карточка_товара.html`;
  if (section === "Поиск") return `${base}/${marketplace}_поиск.html`;
  return "";
}

// Сохранение данных эксперимента
function saveExperimentData(filename, gazeData) {
    // Преобразуем данные в строку CSV
    const csvData = gazeData.join("\n");
  
    const blob = new Blob([csvData], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
}

async function saveExperimentDataToDB(participantId, gender, age, gazeData, frameName) {
  // Генерация уникального цвета
  const color = generateColorForParticipant(participantId);

  // Преобразуем gazeData в массив объектов
  const parsedGazeData = gazeData.slice(1).map(line => {
    const [time, x_screen, y_screen, x_iframe, y_iframe] = line.split(',').map(s => s.trim());
    return {
      time,
      x_screen: parseFloat(x_screen),
      y_screen: parseFloat(y_screen),
      x_iframe: x_iframe ? parseFloat(x_iframe) : null,
      y_iframe: y_iframe ? parseFloat(y_iframe) : null
    };
  });

  const payload = {
    participantNumber: participantId,
    gender,
    age,
    color,
    gazeData: parsedGazeData,
    frameName: frameName
  };

  //ОТЛАДКА
  try {
    console.log('Данные, которые отправляются в PHP:', JSON.stringify(payload, null, 2));
    const response = await fetch('http://localhost/php/save_experiment.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    console.log(text);
  } catch (error) {
    console.error('Ошибка при сохранении данных:', error);
  }
}


function updateSubmitButtonState() {
  const participantIdFilled = document.getElementById("participant-id").value.trim() !== "";
  const ageFilled = document.getElementById("age").value.trim() !== "";
   submitBtn.disabled = !(agreeData.checked && agreeExperiment.checked && participantIdFilled && ageFilled);
}

function generateColorForParticipant(id) {
  // Простейший способ - через HSL
  const hue = (id * 137.508) % 360; // Используем золотое сечение для распределения цветов
  return `hsl(${hue}, 70%, 50%)`;
}

updateSubmitButtonState();

// Обработчик "Завершить участие в эксперименте"
document.getElementById("exit-exp").onclick = () => {
  document.getElementById("survey-reminder-modal").style.display = "flex";
};

// После нажатия ОК — возврат к первому экрану
document.getElementById("survey-reminder-ok-btn").onclick = () => {
  document.getElementById("survey-reminder-modal").style.display = "none";
  document.getElementById("control-screen").style.display = "none";
  document.getElementById("screen-1").style.display = "block";
};


