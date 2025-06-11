//calibration.js
let calibrationPoints = [];
let isCalibrating = false;
const calibrationContainer = document.createElement("div");
calibrationContainer.id = "calibration-container";
document.body.appendChild(calibrationContainer);

function createCalibrationPoints() {
    calibrationContainer.innerHTML = "";
    calibrationPoints = [];

    const rows = 4;
    const cols = 5;
    const spacingX = 31;
    const spacingY = 31;

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            let point = document.createElement("div");
            point.className = "calibration-point";
            point.style.left = `${j * (window.screen.availWidth * spacingX / 100)}px`;
            point.style.top = `${i * (window.screen.availHeight * spacingY / 100)}px`;
            point.style.position = "absolute";
            point.style.width = "20px";
            point.style.height = "20px";
            point.style.backgroundColor = "red";
            point.style.borderRadius = "50%";
            point.style.cursor = "pointer";
            point.style.zIndex = "1000";

            point.dataset.clicks = "0"; // Сохраняем количество нажатий
            point.onclick = () => collectCalibrationData(point);

            calibrationContainer.appendChild(point);
            calibrationPoints.push(point);
        }
    }

    calibrationContainer.style.display = "none";
}

function collectCalibrationData(point) {
    if (!isCalibrating) return;

    let clicks = parseInt(point.dataset.clicks, 10);
    if (clicks >= 3) return; // Уже завершена

    clicks++;
    point.dataset.clicks = clicks.toString();

    // Меняем цвет в зависимости от числа кликов
    switch (clicks) {
        case 1:
            point.style.backgroundColor = "orange";
            break;
        case 2:
            point.style.backgroundColor = "yellow";
            break;
        case 3:
            point.style.backgroundColor = "green";
            break;
    }

    // Сохраняем данные взгляда (по 5 раз)
    setTimeout(() => {
    const rect = point.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    for (let i = 0; i < 5; i++) {
        webgazer.recordScreenPosition(x, y, true);
    }

        // Проверяем: все ли точки имеют по 3 клика
        const allCompleted = calibrationPoints.every(
            (pt) => parseInt(pt.dataset.clicks, 10) >= 3
        );
        if (allCompleted) finishCalibration();

    }, 300);
}

function startCalibration() {
    if (!webgazer.isReady()) {
        alert("Сначала запустите трекинг взгляда!");
        return;
    }
    isCalibrating = true;

    calibrationContainer.classList.add("fullscreen");
    calibrationContainer.style.display = "block";

    calibrationPoints.forEach((point) => {
        point.style.backgroundColor = "red";
        point.dataset.clicks = "0";
    });

    webgazer.clearData();

    const ui = document.getElementById("ui-container");
    if (ui) ui.style.display = "none";
}

function finishCalibration() {
    isCalibrating = false;
    calibrationContainer.style.display = "none";
    calibrationContainer.classList.remove("fullscreen");

    const ui = document.getElementById("ui-container");
    if (ui) ui.style.display = "block";

    alert("Калибровка завершена!");
    webgazer.train();
    webgazer.showVideoPreview(false);
}

function getIsCalibrating() {
    return isCalibrating;
}

function setIsCalibrating(value) {
    isCalibrating = value;
}

export { startCalibration, createCalibrationPoints, getIsCalibrating, setIsCalibrating };
