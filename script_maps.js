//script_maps.js
const selectButton = document.getElementById("select-button");
const fileUploadSection = document.getElementById("file-upload-section");
const dbUploadSection = document.getElementById("db-upload-section");
const participantInput = document.getElementById("participant-input");
const dataSourceRadios = document.querySelectorAll("input[name='data-source']");
const fileInput = document.querySelector('input[type="file"]');
const fileListDiv = document.getElementById("file-list");
const doneButton = document.getElementById("done-button");

// Переменная для хранения валидных файлов
let selectedValidFiles = [];

// Обработчик для кнопки "Выбрать"
selectButton.addEventListener("click", () => {
    const selectedSource = document.querySelector("input[name='data-source']:checked");

    if (!selectedSource) {
        alert("Пожалуйста, выберите источник данных.");
        return;
    }

    const sourceValue = selectedSource.value;

    fileUploadSection.style.display = "none";
    dbUploadSection.style.display = "none";
    participantInput.style.display = "none";

    if (sourceValue === "file") {
        fileUploadSection.style.display = "block";
    } else if (sourceValue === "db") {
        dbUploadSection.style.display = "block";
        participantInput.style.display = "block";
    }
});

// Обработчик выбора файлов
fileInput.addEventListener("change", (event) => {
    const files = event.target.files;
    selectedValidFiles = [];
    const invalidFiles = [];

    const marketplace = document.querySelector("input[name='marketplace']:checked");
    const section = document.querySelector("input[name='section']:checked");

    if (!marketplace || !section) {
        alert("Пожалуйста, выберите площадку и раздел.");
        return;
    }

    const marketplaceValue = marketplace.value;
    const sectionValue = section.value;

    const fileNamePattern = new RegExp(`^\\d+_${marketplaceValue}_${sectionValue}.*\\.(json|txt|csv)$`);


    fileListDiv.innerHTML = "";

    for (let file of files) {
        if (fileNamePattern.test(file.name)) {
            selectedValidFiles.push(file);
        } else {
            invalidFiles.push(file.name);
        }
    }

    if (selectedValidFiles.length > 0) {
        fileListDiv.innerHTML += "<h3>Подходящие файлы:</h3><ul>";
        selectedValidFiles.forEach((file) => {
            fileListDiv.innerHTML += `<li>${file.name}</li>`;
        });
        fileListDiv.innerHTML += "</ul>";
    }

    if (invalidFiles.length > 0) {
        fileListDiv.innerHTML += "<h3>Неподходящие файлы:</h3><ul>";
        invalidFiles.forEach((fileName) => {
            fileListDiv.innerHTML += `<li>${fileName} (не соответствует шаблону)</li>`;
        });
        fileListDiv.innerHTML += "</ul>";
        doneButton.disabled = true;
    } else {
        fileListDiv.innerHTML += "<p>Нет неподходящих файлов</p>";
        doneButton.disabled = false;
    }
});

// Обработчик кнопки "Готово"
doneButton.addEventListener("click", () => {
    if (selectedValidFiles.length === 0) {
        alert("Нет выбранных файлов для обработки.");
        return;
    }

    const formData = new FormData();
    selectedValidFiles.forEach((file) => {
        formData.append('files[]', file);
    });

    const marketplace = document.querySelector("input[name='marketplace']:checked").value;
    const section = document.querySelector("input[name='section']:checked").value;

    formData.append('marketplace', marketplace);
    formData.append('section', section);

    fetch('php/upload_files.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.text())
    .then(data => {
        console.log("Ответ сервера:", data);
        alert("Файлы успешно загружены и обработаны.");
        // Показываем кнопку для генерации тепловых карт
        document.getElementById("generate-maps-button").style.display = "inline-block";
        document.getElementById("get-time-button").style.display = "inline-block";
        document.getElementById("calculate-scores-button").style.display = "inline-block"; 
    })
    .catch(error => {
        console.error('Ошибка:', error);
        alert('Произошла ошибка при загрузке файлов.');
    });
});
//Обработчик для расчета оценки
const calculateScoresButton = document.getElementById("calculate-scores-button");
const scoresResultsDiv = document.getElementById("scores-results");

calculateScoresButton.addEventListener("click", () => {
     const marketplace = document.querySelector("input[name='marketplace']:checked").value;
    const section = document.querySelector("input[name='section']:checked").value;

    scoresResultsDiv.innerHTML = "Вычисление оценок... Пожалуйста, подождите.";

   
    // Отправляем запрос на сервер с параметрами маркетплейса и раздела
    fetch('php/calculate_scores.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketplace, section })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        return response.text();
    })
    .then(text => {
        try {
            const data = JSON.parse(text);
            if (data.error) {
                throw new Error(data.error);
            }
            //ОТЛАДКА
            console.log("Полученные данные для расчетов зон:", data);
            console.log("Отладочные данные:");
            console.log("Всего задач:", data.debug.totalTasks);
            console.log("Успешных задач:", data.debug.successfulTasks);
            console.log("Просмотренных зон:", data.debug.viewedZonesCount);
            console.log("Всего зон:", data.debug.totalZones);
            console.log(`Формула: zoneViewRatio = viewedZonesCount / (totalZones * participantsCount)`);
            console.log(`=> ${data.debug.viewedZonesCount} / (${data.debug.totalZones} * ${data.debug.participants}) = ${data.zoneViewRatio !== null ? data.zoneViewRatio.toFixed(4) : 'N/A'}`);
            console.log("Время в зонах:", data.debug.timeInZones);
            console.log("Время вне зон:", data.debug.timeOutZones);
            console.log("Общее время:", data.debug.totalTime);
            console.log("Среднее время:", data.averageTaskTimes);
            



                //Сохраняем в window для последующего сохранения
                window.scoresResults = {
                    taskSuccessRatio: data.taskSuccessRatio,
                    zoneViewRatio: data.zoneViewRatio,
                    participantsCount: data.debug.participantsCount,
                    marketplace,
                    section,
                    totalTasks: data.debug.totalTasks,
                    successfulTasks: data.debug.successfulTasks,
                    totalZones: data.debug.totalZones,
                    viewedZonesCount: data.debug.viewedZonesCount,
                    timeInZones: data.debug.timeInZones,
                    timeOutZones: data.debug.timeOutZones,
                    totalTime: data.debug.totalTime,
                    averageTaskTimes: data.averageTaskTimes,
                    
                };

           let zoneViewText = '';
            if (data.zoneViewAvailable) {
                zoneViewText = `${(data.zoneViewRatio ).toFixed(2)}`;
            } else {
                zoneViewText = "Рассчитывается только для главной страницы";
            }
            // Когда рассчитаны оценки
            scoresResultsDiv.innerHTML = `
                <h3>Оценки для ${marketplace} - ${section}:</h3>
                <ul>
                    <li>1. Успешно выполненных задач / Общее число задач: <b>${data.taskSuccessRatio.toFixed(2)}</b></li>
                    <li>2. Просмотренных зон / Общее число зон: <b>${zoneViewText}</b></li>
                    <li>3. Время в зонах / Время вне зон: <b>${data.timeInZonesRatio.toFixed(2)}</b></li>
                </ul>
            `;
        } catch(e) {
            throw new Error("Ответ сервера не является JSON:\n" + text);
        }
    })
    .catch(error => {
        console.error('Ошибка при расчете оценок:', error);
        scoresResultsDiv.innerHTML = 'Ошибка при расчете оценок.';
    });
});



const generateMapsButton = document.getElementById("generate-maps-button");


//Обработчик новой кнопки "Построить тепловые карты"
generateMapsButton.addEventListener("click", () => {
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

        const preview = document.getElementById("heatmap-preview");
        const container = document.getElementById("images-container");
        preview.style.display = "block";

        const imageNames = [
            'circles.png',
            'intersection_zones.png',
            'heatmap2.png',
            'circle_outlines.png',
            'intersection_zonesBlack.png'
        ];

        container.innerHTML = imageNames.map(name => `
            <div style="margin-bottom: 20px;">
                <p><strong>${name}</strong></p>
                <img src="php/img_generate/${name}?t=${Date.now()}" style="max-width: 600px; width: 100%; height: auto; border: 1px solid #ccc;">
                <br>
                <a href="php/img_generate/${name}" download>Скачать</a>
            </div>
        `).join('');

        container.innerHTML += `
            <div style="margin-top: 30px;">
                <a href="php/download_zip.php" class="download-zip" style="font-weight: bold; color: blue;" download>
                    Скачать все изображения в архиве (.zip)
                </a>
            </div>
        `;
       //const selectedMarketplace = document.querySelector("input[name='marketplace']:checked").value;
        
       //const selectedSection = document.querySelector("input[name='section']:checked").value;
        //showHeatmapOverlay(selectedMarketplace, selectedSection);
        document.getElementById("map-overlay-controls").style.display = "block";

    })
    .catch(error => {
        const loading = document.getElementById('heatmap-loading');
        if (loading) loading.remove();

        console.error('Ошибка:', error);
        alert('Произошла ошибка при генерации карт.');
    });
});

//document.getElementById("map-overlay-controls").style.display = "block";

window.addEventListener("load", () => {
    doneButton.disabled = true;
});

document.body.style.overflowY = 'auto';

//Для подсчета среднего времени 
const timeButton = document.getElementById("get-time-button");
const timeResultsDiv = document.getElementById("task-time-results");
timeButton.addEventListener("click", () => {
    timeResultsDiv.innerHTML = "Загрузка данных...";
    fetch("php/calculate_average_time.php")
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
       

    })
    .then(html => {
        timeResultsDiv.innerHTML = html;

    })
    .catch(error => {
        console.error("Ошибка при получении данных:", error);
        timeResultsDiv.innerHTML = "Ошибка при загрузке данных.";
    });
});

document.getElementById("show-selected-overlay").addEventListener("click", () => {
    const selectedMap = document.querySelector("input[name='overlay-map']:checked")?.value;
    const marketplace = document.querySelector("input[name='marketplace']:checked")?.value;
    const section = document.querySelector("input[name='section']:checked")?.value;

    if (!marketplace || !section) {
        alert("Пожалуйста, выберите маркетплейс и раздел.");
        return;
    }

    if (!selectedMap) {
        alert("Пожалуйста, выберите карту для наложения.");
        return;
    }

    showHeatmapOverlay(marketplace, section, selectedMap);
});



function showHeatmapOverlay(marketplace, section, mapFileName = "heatmap2.png") {
    const container = document.getElementById("iframe-overlay-wrapper");
    container.innerHTML = ''; // очищаем предыдущий контент

    const htmlPath = `html_marketplace/${marketplace}.html`;

    const heightMap = {
        "ozon": { "главная": 12564, "поиск": 3677, "карточка_товара": 9627 },
        "wildberries": { "главная": 3272, "поиск": 414, "карточка_товара": 12455 },
        "яндексмаркет": { "главная": 3793, "поиск": 5000, "карточка_товара": 4806 },
        "мегамаркет": { "главная": 1580, "поиск": 4500, "карточка_товара": 10152 }
    };

    const mp = marketplace.toLowerCase();
    const sec = section.toLowerCase();
    const height = (heightMap[mp] && heightMap[mp][sec]) ? heightMap[mp][sec] : 5000;

    const iframe = document.createElement("iframe");
    iframe.src = htmlPath;
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


function setupDbLoading() {
    const input = document.getElementById("person_ids");

    // Автоматически загружать при вводе
    input.addEventListener("change", () => {
        const raw = input.value.trim();
        if (!raw) return;

        const marketplace = document.querySelector("input[name='marketplace']:checked")?.value;
        const section = document.querySelector("input[name='section']:checked")?.value;


        if (!marketplace || !section) {
            alert("Пожалуйста, выберите площадку и раздел.");
            return;
        }

        fetch("php/load_from_db.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                participantNumbers: raw,
                marketplace: marketplace,
                section: section
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert("Ошибка: " + data.error);
                return;
            }

            
            console.log("Полученные данные из БД:", data);
            window.loadedGazeData = data; // сохраняем для последующей обработки

            document.getElementById("generate-maps-button").style.display = "inline-block";
            document.getElementById("get-time-button").style.display = "inline-block";
            document.getElementById("calculate-scores-button").style.display = "inline-block";
        })
        .catch(error => {
            console.error("Ошибка при получении данных из БД:", error);
        });
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const loadDbButton = document.getElementById("load-db-button");
    
    loadDbButton?.addEventListener("click", () => {
        const input = document.getElementById("person_ids");
        const raw = input.value.trim();
        const resultBox = document.getElementById("db-load-result");
        const marketplace = document.querySelector("input[name='marketplace']:checked")?.value;
        const section = document.querySelector("input[name='section']:checked")?.value;

        if (!marketplace || !section) {
            alert("Пожалуйста, выберите маркетплейс и раздел.");
            return;
        }


        if (!raw) {
            alert("Введите номера участников.");
            return;
        }
        
        setupDbLoading();
        fetch("php/load_from_db.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                participantNumbers: raw,
                marketplace: marketplace,
                section: section
    })

})
.then(response => response.json())
.then(data => {
    const resultBox = document.getElementById("db-load-result");
    
    if (data.error) {
        alert("Ошибка: " + data.error);
        return;
    }

    window.loadedGazeData = data;

    document.getElementById("generate-maps-button").style.display = "inline-block";
    document.getElementById("get-time-button").style.display = "inline-block";
    document.getElementById("calculate-scores-button").style.display = "inline-block";

    // Проверка наличия данных о взглядах
    if (data.gazeData.length > 0) {
        resultBox.innerHTML = `Найдено ${data.gazeData.length} записей о взглядах.`;
    } else {
        resultBox.innerHTML = "Нет данных о взгляде для выбранной страницы."
        console.log("Использованный frameName:", data.frameNameUsed);
        console.log("Debug info:", data.debug);;
    }

    // Информация об участниках
 const infoBox = document.getElementById("participant-info");
infoBox.innerHTML = "<h3>Информация об участниках:</h3>";

if (data.participants.length > 0) {
    data.participants.forEach(p => {
        // Считаем количество записей о взгляде для этого участника
        const gazeCount = data.gazeData.filter(g => g.participant_number === p.participant_number).length;

        const gazeInfo = gazeCount > 0
            ? `Данных о взгляде: ${gazeCount}`
            : "Нет данных для этой страницы";

        infoBox.innerHTML += `
            <p>
                <b>Номер участника:</b> ${p.participant_number}<br>
                <b>Пол:</b> ${p.gender}<br>
                <b>Возраст:</b> ${p.age}<br>
                <b>${gazeInfo}</b>
            </p>
            <hr>
        `;
        console.log("Использованный frameName:", data.frameNameUsed);
        console.log("Debug info:", data.debug);
        document.getElementById("done-button-db").disabled = false;
    });
} else {
    infoBox.innerHTML = "Нет информации об участниках.";
}   
})
.catch(error => {
    console.error("Ошибка при получении данных из БД:", error);
    document.getElementById("db-load-result").innerHTML = "Ошибка загрузки данных.";
    console.log("Использованный frameName:", data.frameNameUsed);
    console.log("Debug info:", data.debug);
});
    });
});

const doneButtonDb = document.getElementById("done-button-db");

doneButtonDb.addEventListener("click", () => {
    alert("Данные успешно получены из базы данных."); 

    document.getElementById("generate-maps-button").style.display = "inline-block";
    document.getElementById("get-time-button").style.display = "inline-block";
    document.getElementById("calculate-scores-button").style.display = "inline-block";
});

document.getElementById('save-data-button').addEventListener('click', () => {
    document.getElementById('save-data-modal').style.display = 'block';
});

document.getElementById('cancel-save-button').addEventListener('click', () => {
    document.getElementById('save-data-modal').style.display = 'none';
});

document.getElementById('confirm-save-button').addEventListener('click', () => {
    const date = document.getElementById('experiment-date').value;
    const name = document.getElementById('experiment-name').value.trim();

    if (!date || !name) {
        alert('Пожалуйста, заполните все поля');
        return;
    }

    const scoresResults = window.scoresResults;
    if (!scoresResults) {
        alert('Нет данных для сохранения. Сначала выполните расчет оценок.');
        return;
    }

    

    const payload = {
        experimentDate: date,
        experimentName: name,
        taskSuccessRatio: scoresResults.taskSuccessRatio,
        zoneViewRatio: scoresResults.zoneViewRatio,
        participantsCount: scoresResults.participantsCount,
        marketplace: scoresResults.marketplace,
        section: scoresResults.section,
        totalTasks: scoresResults.totalTasks,
        successfulTasks: scoresResults.successfulTasks,
        totalZones: scoresResults.totalZones,
        viewedZonesCount: scoresResults.viewedZonesCount,
        timeInZones: scoresResults.timeInZones,
        timeOutZones: scoresResults.timeOutZones,
        totalTime: scoresResults.totalTime,
        averageTaskTimes:scoresResults.averageTaskTimes,
        
    };

    fetch('php/save_experiment_data.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(response => {
        if (response.success) {
            alert('Данные успешно сохранены!');
            document.getElementById('save-data-modal').style.display = 'none';
        } else {
            alert('Ошибка при сохранении: ' + (response.message || 'неизвестная ошибка'));
        }
    })
    .catch(err => {
        alert('Ошибка сети или сервера: ' + err.message);
    });
});

const rankButton = document.getElementById('rank-marketplaces-button');
const rankInputSection = document.getElementById('rank-input-section');
const rankOkButton = document.getElementById('rank-ok-button');
const researchNameInput = document.getElementById('research-name-input');
const rankingResultsDiv = document.getElementById('ranking-results');

rankButton.addEventListener('click', () => {
    rankInputSection.style.display = 'block';
    rankingResultsDiv.innerHTML = '';
});

rankOkButton.addEventListener('click', () => {
    const researchName = researchNameInput.value.trim();
    if (!researchName) {
        alert('Введите название исследования');
        return;
    }

    rankingResultsDiv.innerHTML = 'Загрузка данных...';

    fetch('php/rank_marketplaces.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ researchName })
    })
    .then(res => {
        if (!res.ok) throw new Error(`Ошибка сервера: ${res.status}`);
        return res.json();
    })
    .then(data => {
    if (data.error) {
        rankingResultsDiv.innerHTML = `<p style="color:red;">Ошибка: ${data.error}</p>`;
        return;
    }
    window._rankingData = data; // сохраняем для доступа
    rankingResultsDiv.innerHTML = renderRankingData(data);
})
    .catch(err => {
        rankingResultsDiv.innerHTML = `<p style="color:red;">${err.message}</p>`;
    });
});

function renderRankingData(data) {
    let html = `<h3>Ранжирование маркетплейсов</h3>`;

    data.forEach((mp, mpIndex) => {
        html += `<h4>Маркетплейс: <span style="color: #2a2a2a;">${mp.marketplace}</span></h4>`;
        html += `
        <table class="ranking-table">
            <thead>
                <tr>
                    <th>Страница</th>
                    <th>Просмотренные зоны</th>
                    <th>Фиксации внутри зон</th>
                    <th>Поиск информации</th>
                    <th>Успешность задач</th>
                    <th>Сумма оценок</th>
                    <th>Средняя оценка</th>
                    <th>Польз. оценка</th>
                </tr>
            </thead>
            <tbody>
        `;

        mp.pages.forEach((page, pageIndex) => {
            html += `
                <tr data-mp-index="${mpIndex}" data-page-index="${pageIndex}">
                    <td>${page.section}</td>
                    <td>${page.scores.viewedZonesRatio.toFixed(3)}</td>
                    <td>${page.scores.fixationTimeRatio.toFixed(3)}</td>
                    <td>${page.scores.infoFindingRatio.toFixed(3)}</td>
                    <td>${page.scores.taskSuccessRatio.toFixed(3)}</td>
                    <td class="page-sum">${page.sum.toFixed(3)}</td>
                    <td>${page.avg.toFixed(3)}</td>
                    <td>
                        <input 
                            type="number" 
                            step="0.01" 
                            min="0" 
                            value="${page.userScore}" 
                            class="user-score-input" 
                            style="width: 60px;"
                        >
                    </td>
                </tr>
            `;
        });

        html += `
            <tr class="total-row">
                <td>Итого</td>
                <td colspan="5"></td>
                <td colspan="2" class="marketplace-total-sum">${mp.totalSum.toFixed(3)}</td>
            </tr>
        `;

        html += `</tbody></table>`;
    });

    html += `<button id="analyze-button" style="margin-top:15px;">Провести анализ</button>`;

    return html;
}

rankingResultsDiv.addEventListener('input', (event) => {
    if (event.target.classList.contains('user-score-input')) {
        const input = event.target;
        const tr = input.closest('tr');
        const mpIndex = tr.getAttribute('data-mp-index');
        const pageIndex = tr.getAttribute('data-page-index');

        let userScore = parseFloat(input.value);
        if (isNaN(userScore) || userScore < 0) userScore = 0;

        // Обновим данные в памяти (в объекте data)
        const pageData = window._rankingData[mpIndex].pages[pageIndex];
        pageData.userScore = userScore;

        // Пересчитаем сумму для страницы с учётом userScore
        const newSum = pageData.sum + userScore;
        tr.querySelector('.page-sum').textContent = newSum.toFixed(3);

        // Пересчитаем сумму для маркетплейса
        let totalSum = 0;
        window._rankingData[mpIndex].pages.forEach(p => {
            totalSum += p.sum + p.userScore;
        });

        const table = tr.closest('table');
        table.querySelector('.marketplace-total-sum').textContent = totalSum.toFixed(3);
    }
});

rankingResultsDiv.addEventListener('click', (event) => {
    if (event.target.id === 'analyze-button') {
        if (!window._rankingData) return;

        const analysis = analyzeMarketplaces(window._rankingData);
        rankingResultsDiv.insertAdjacentHTML('beforeend', renderAnalysisResults(analysis));
    }
});

function analyzeMarketplaces(data) {
    // Сгруппируем по маркетплейсам:
    const summary = data.map(mp => {
        let sumViewedFixation = 0;
        let sumTaskSuccess = 0;
        let sumInfoFinding = 0;
        let countPages = mp.pages.length;
        let totalUserScore = 0;
        let totalSumWithUser = 0;
      

        mp.pages.forEach(page => {
            sumViewedFixation += (page.scores.viewedZonesRatio + page.scores.fixationTimeRatio);
            sumTaskSuccess += page.scores.taskSuccessRatio;
            sumInfoFinding += page.scores.infoFindingRatio;
            totalUserScore += page.userScore;
            totalSumWithUser += page.sum + page.userScore;
        });

          const avgInterfaceScore = (sumTaskSuccess / countPages) +  (sumInfoFinding / countPages);
        
          return {
            marketplace: mp.marketplace,
            avgTaskSuccess: sumTaskSuccess / countPages,
            avgInfoFinding: sumInfoFinding / countPages,
            avgInterfaceScore,
            sumViewedFixation,
            totalUserScore,
            totalSumWithUser,
        };
    });

    // Лучшее расположение коммерческих блоков
    let bestCommercial = summary.reduce((a, b) => a.sumViewedFixation > b.sumViewedFixation ? a : b);


    let bestInterface = summary.reduce((a, b) => a.avgInterfaceScore > b.avgInterfaceScore ? a : b);

    // Самый лучший по мнению пользователей (по сумме пользовательских оценок)
    let bestUserRated = summary.reduce((a, b) => a.totalUserScore > b.totalUserScore ? a : b);

    // Сортировка маркетплейсов по сумме итоговой оценки с учётом пользовательской оценки
    let sortedByTotalSum = [...summary].sort((a,b) => b.totalSumWithUser - a.totalSumWithUser);

    return {
        bestCommercial,
        bestInterface,
        bestUserRated,
        sortedByTotalSum
    };
}

function renderAnalysisResults(analysis) {
    let html = `
     <div class="analysis-container">
        <h3>Результаты анализа</h3>

        <div class="analysis-block" >
            <p><strong>Лучшее расположение коммерческих блоков:</strong><br>
            <span class="mp-name">${analysis.bestCommercial.marketplace}</span>
            <span class="mp-score">(${analysis.bestCommercial.sumViewedFixation.toFixed(3)})</span></p>
        </div>

        <div class="analysis-block">
            <p><strong>Самый удобный интерфейс:</strong><br>
            <span class="mp-name">${analysis.bestInterface.marketplace}</span>
            <span class="mp-score">(${analysis.bestInterface.avgInterfaceScore.toFixed(3)})</span></p>
        </div>
        </div>
    `;

    if (analysis.bestUserRated.totalUserScore > 0) {
        html += `
            <div class="analysis-block">
                <p><strong>Самый лучший по мнению пользователей:</strong><br>
                <span class="mp-name">${analysis.bestUserRated.marketplace}</span>
                <span class="mp-score">(${analysis.bestUserRated.totalUserScore.toFixed(3)})</span></p>
            </div>
        `;
    }

    html += `
        <h4>Маркетплейсы по суммарной оценке:</h4>
        <ol class="ranked-marketplaces">
    `;
    analysis.sortedByTotalSum.forEach(mp => {
        html += `<li><span class="mp-name">${mp.marketplace}</span> — <span class="mp-score">${mp.totalSumWithUser.toFixed(3)}</span></li>`;
    });
    html += `</ol>`;

    return html;
}






