//taskManager.js

import { startRecording, stopRecording } from './recordGazeData.js';


const tasks = {
  "Главная": [
    "Найти 5 самых привлекательных карточек.",
    "Найти кнопку «Корзины».",
    "Найти кнопку «Избранные товары».",
    "Найти строку поиска."
  ],
  "Поиск": [
    "Найти панель фильтрации для настройки поиска товара.",
    "Найти фильтр по цвету.",
    "Найти фильтр по цене.",
    "Найти фильтр по размеру.",
    "Найти информацию о сроке доставки."
  ],
  "Карточка": [
    "Найти стоимость товара.",
    "Найти срок доставки товара.",
    "Найти материал товара.",
    "Найти размер товара.",
    "Найти отзывы о товаре.",
    "Найти кнопку для добавления в корзину.",
    "Найти кнопку для добавления в избранное."
  ]
};

let currentTaskIndex = 0;
let currentTasks = [];
let onAllTasksDoneCallback = () => {};
let taskStartTime = null;
let experimentStartTime;
let finalTaskStartTime = null;

export function initTaskFlow(section, onCompleteAllTasks) {
  currentTasks = tasks[section] || [];
  currentTaskIndex = 0;
  onAllTasksDoneCallback = onCompleteAllTasks;
  showTaskModal(currentTasks[currentTaskIndex]);
}

function showTaskModal(taskText) {
  stopRecording();

  const modal = document.getElementById("task-modal");
  document.getElementById("task-text").innerText = taskText;
  modal.style.display = "flex";
}

export function startCurrentTask() {
    console.log("startCurrentTask вызвана");
  taskStartTime = Date.now();
    experimentStartTime = taskStartTime; 
  startRecording();

  document.getElementById("task-modal").style.display = "none";

  // Ждем нажатия пробела
  document.addEventListener("keydown", handleSpacePress);
}

function handleSpacePress(e) {
  if (e.code === "Space") {
    const elapsedTime = Date.now() - taskStartTime;
    console.log(`Задание выполнено за ${elapsedTime} мс`);
    document.removeEventListener("keydown", handleSpacePress);
    goToNextTask();
  }
}

// Показывает финальную плашку
function showFinalTaskModal() {
  stopRecording();
  const finalModal = document.getElementById("final-task-modal");
  finalModal.style.display = "flex";

  finalTaskStartTime = Date.now();
  startRecording(); // начинаем запись, как и для обычных заданий

  const okBtn = document.getElementById("final-task-ok-btn");
  okBtn.onclick = () => {
    const elapsedTime = Date.now() - finalTaskStartTime;
    console.log(`Финальная карточка просмотрена за ${elapsedTime} мс`);

    stopRecording();
    finalModal.style.display = "none";

    // Активация кнопки "Закончить эксперимент"
    const endBtn = document.getElementById("end-experiment");
    endBtn.disabled = false;
    onAllTasksDoneCallback();
  };
}

function goToNextTask() {
  currentTaskIndex++;

  if (currentTaskIndex < currentTasks.length) {
    showTaskModal(currentTasks[currentTaskIndex]);
  } else {
    console.log("Все задания завершены. Показываем финальную плашку.");
    showFinalTaskModal(); // показываем последнюю карточку
  }
}


