//tracking.js
import { getIsCalibrating } from './calibration.js';
let gazeDot = null; // Глобальная переменная для маркера взгляда

function createGazeDot() {
    if (!gazeDot) {
        gazeDot = document.createElement("div");
        gazeDot.id = "tracker-dot";
        Object.assign(gazeDot.style, {
            position: "absolute",
            width: "150px",
            height: "150px",
            border: "2px solid red",
            borderRadius: "50%",
            backgroundColor: "rgba(0, 0, 0,  0)",
            pointerEvents: "none",
            zIndex: "9999"
        });
        document.body.appendChild(gazeDot);
    }
    gazeDot.style.display = "block";
}

function startTracking() {
    createGazeDot();

    webgazer.setGazeListener(function (data) {
        if (!data || getIsCalibrating()) return;
        if (!gazeDot) return;
        gazeDot.style.left = `${data.x - gazeDot.offsetWidth / 2}px`;
        gazeDot.style.top = `${data.y - gazeDot.offsetHeight / 2}px`;
    }).begin();

    webgazer.showVideoPreview(true)
        .showPredictionPoints(true)
        .applyKalmanFilter(true);
}


function stopTracking() {
    webgazer.pause();
    webgazer.end();
    webgazer.showVideoPreview(false); // Выключаем видеопоток
 
    if (gazeDot) {
        document.body.removeChild(gazeDot); // Удаляем элемент с экрана
        gazeDot = null; // Сбрасываем переменную
    }
}

export { startTracking, stopTracking };
