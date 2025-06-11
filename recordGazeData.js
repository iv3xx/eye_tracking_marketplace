//recordGazeData.js

let gazeData = [];
let isRecording = false;
let isFirstRecording = true;
let recordingInterval;
let experimentStartTime = null; // Время старта


function formatElapsedTime(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}


// Функция для начала записи данных
function startRecording() {
  if (isRecording) return;

  isRecording = true;
 experimentStartTime = Date.now(); // Сохраняем время начала
 
 if (isFirstRecording) {
    gazeData.push("time, x_screen, y_screen, x_iframe, y_iframe");
    isFirstRecording = false;
  }
  recordingInterval = setInterval(() => {
      const elapsedTime = Date.now() - experimentStartTime;
    const formattedTime = formatElapsedTime(elapsedTime);

    webgazer.getCurrentPrediction().then((data) => {
      if (data) {
        const xScreen = data.x;
        const yScreen = data.y;

        let xIframe = "";
        let yIframe = "";

        const iframe = document.getElementById("myIframe");

        if (iframe && iframe.contentWindow) {
          const iframeRect = iframe.getBoundingClientRect();

          // Положение взгляда относительно iframe
          const relativeX = xScreen - iframeRect.left;
          const relativeY = yScreen - iframeRect.top;

          try {
            // Скролл внутри iframe (если нет CORS)
            const iframeScrollX = iframe.contentWindow.scrollX || 0;
            const iframeScrollY = iframe.contentWindow.scrollY || 0;

            // Координаты относительно содержимого iframe
            xIframe = relativeX + iframeScrollX;
            yIframe = relativeY + iframeScrollY;
          } catch (err) {
            // В случае CORS ошибки — оставим координаты пустыми
            console.warn("Нет доступа к содержимому iframe (CORS)", err);
          }
        }

        // Запись строки CSV
          gazeData.push(`${formattedTime}, ${xScreen}, ${yScreen}, ${xIframe}, ${yIframe}`);
      }
    });
  }, 100);  // Запись каждые 100 мс
}

// Функция для остановки записи данных
function stopRecording() {
  if (!isRecording) return;

  clearInterval(recordingInterval);
  isRecording = false;
}

// Получение записанных данных
function getGazeData() {
  return gazeData;
}

// Экспорт функций
export { startRecording, stopRecording, getGazeData };