<?php
// upload_files.php
ini_set('display_errors', 1);
error_reporting(E_ALL);

$uploadDir = 'uploads/';

if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
} else {
    // Очистка папки uploads
    $files = glob($uploadDir . '*');
    foreach ($files as $file) {
        if (is_file($file)) {
            unlink($file);
        }
    }
}

$heatmapData = []; // gaze points

$marketplace = $_POST['marketplace'] ?? null;
$section = $_POST['section'] ?? null;

if (!$marketplace || !$section) {
    echo "Ошибка: отсутствуют marketplace или section.";
    exit;
}

// Размеры холста (ширина фиксирована — 100vw, высота зависит от маркетплейса и зоны)
function getCanvasHeight($marketplace, $section) {
    $map = [
        'Ozon' => [
            'карточка_товара' => 9627,
            'поиск' => 3677,
            'Главная' => 12564
        ],
        'Wildberries' => [
            'карточка_товара' => 12455,
            'поиск' => 413.979,
            'Главная' => 3272
        ],
        'ЯндексМаркет' => [
            'карточка_товара' => 4806,
            'поиск' => 5000,
            'Главная' => 3793
        ],
        'МегаМаркет' => [
            'карточка_товара' => 10152,
            'поиск' => 4500,
            'Главная' => 1520
        ]
    ];

    $sectionKey = mb_strtolower($section);
    foreach ($map as $mp => $sections) {
        if (mb_strtolower($marketplace) === mb_strtolower($mp)) {
            foreach ($sections as $sec => $height) {
                if (mb_strtolower($sec) === $sectionKey) {
                    return $height;
                }
            }
        }
    }

    return 5000; // значение по умолчанию, если не найдено
}

// Преобразует строку "00:00.121" в секунды как float
function timeToSeconds($timeString) {
    if (preg_match('/^(\d+):(\d+)\.(\d+)$/', $timeString, $matches)) {
        $minutes = (int)$matches[1];
        $seconds = (int)$matches[2];
        $milliseconds = (int)$matches[3];
        return $minutes * 60 + $seconds + $milliseconds / 1000;
    }
    return 0.0;
}

$canvas = [
    'width' => '1920',
    'height' => getCanvasHeight($marketplace, $section)
];

if (!empty($_FILES['files']['name'])) {
    foreach ($_FILES['files']['tmp_name'] as $key => $tmpName) {
        $originalName = $_FILES['files']['name'][$key];
        $targetPath = $uploadDir . basename($originalName);

        if (move_uploaded_file($tmpName, $targetPath)) {
            // participant_id извлекается из названия файла
            preg_match('/^(\d+)_/', $originalName, $matches);
            $participantId = $matches[1] ?? null;

            if (!$participantId) continue;

            $lines = file($targetPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            array_shift($lines); // удаляем заголовок

            $taskId = 1;
            $previousTime = null;

            foreach ($lines as $line) {
                $parts = array_map('trim', explode(',', $line));

                if (count($parts) === 5) {
                    list($timeStr, $x_screen, $y_screen, $x_iframe, $y_iframe) = $parts;
                    $currentTime = timeToSeconds($timeStr);

                    if ($previousTime !== null && $currentTime < $previousTime) {
                        $taskId++;
                    }

                    $previousTime = $currentTime;

                    $heatmapData[] = [
                        'participant_id' => $participantId,
                        'time' => $currentTime,
                        'x_screen' => (float) $x_screen,
                        'y_screen' => (float) $y_screen,
                        'x_iframe' => (float) $x_iframe,
                        'y_iframe' => (float) $y_iframe,
                        'task_id' => $taskId
                    ];
                }
            }
        }
    }

    // Финальная структура
    $finalData = [
        'marketplace' => $marketplace,
        'section' => $section,
        'canvas' => $canvas,
        'data' => $heatmapData
    ];

    file_put_contents(
        'uploads/parsed_heatmap_data.json',
        json_encode($finalData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
    );

    echo "Обработка завершена. Всего записей: " . count($heatmapData);
} else {
    echo "Файлы не загружены.";
}
?>
