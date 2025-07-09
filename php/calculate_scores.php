
<?php
// calculate_scores.php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);

$data = json_decode(file_get_contents('php://input'), true);
$marketplace = $data['marketplace'] ?? '';
$section = $data['section'] ?? '';

if (!$marketplace || !$section) {
    http_response_code(400);
    echo json_encode(['error' => 'Не указаны маркетплейс или раздел']);
    exit;
}

$uploadDir = __DIR__ . '/uploads/';

// Получаем коммерческие зоны (для подсчёта просмотра и времени)
$zonesRaw = getZonesRaw($marketplace, $section);
$zones = [];
foreach ($zonesRaw as $id => $zone) {
    $zones[$id] = [
        'x1' => $zone['x'],
        'y1' => $zone['y'],
        'x2' => $zone['x'] + $zone['width'],
        'y2' => $zone['y'] + $zone['height']
    ];
}

// Получаем зоны для задач (task zones) для подсчёта успешных задач
$taskZonesRaw = getTaskZonesRaw($marketplace, $section);
$taskZones = [];
foreach ($taskZonesRaw as $taskId => $zone) {
    $taskZones[$taskId] = [
        'x1' => $zone['x'],
        'y1' => $zone['y'],
        'x2' => $zone['x'] + $zone['width'],
        'y2' => $zone['y'] + $zone['height']
    ];
}

$totalTasks = 0;
$successfulTasks = 0;
$totalTime = 0;
$taskDurations = [];


$totalZones = count($zones);
$totalViewedZoneCount = 0;

$timeInZones = 0;
$timeOutZones = 0;

$files = glob($uploadDir . '*.json');
$participantZones = []; // participant_id => [zone_ids]
$participantTotalTime = []; // participant_id => totalTime

foreach ($files as $file) {
    $content = file_get_contents($file);
    $json = json_decode($content, true);
    if (!isset($json['data']) || !is_array($json['data'])) {
        continue;
    }

    $dataPoints = $json['data'];
    $currentTaskId = null;
    $taskSuccess = false;
    $currentZoneId = null;
    $zoneStartTime = null;
    $currentTaskStartTime = null;
    $currentTaskEndTime = null;

    foreach ($dataPoints as $point) {
        $participantId = $point['participant_id'] ?? null;
        if (!$participantId) continue;

        if (!isset($participantZones[$participantId])) {
            $participantZones[$participantId] = [];
            $participantTotalTime[$participantId] = 0;
        }

        // Смена задачи
        if ($currentTaskId !== $point['task_id']) {
            if ($currentTaskStartTime !== null && $currentTaskEndTime !== null && $currentTaskEndTime > $currentTaskStartTime) {
                    $participantTotalTime[$participantId] += ($currentTaskEndTime - $currentTaskStartTime);
                    $totalTime += ($currentTaskEndTime - $currentTaskStartTime);
                    $duration = $currentTaskEndTime - $currentTaskStartTime;

    if (!isset($taskDurations[$currentTaskId])) {
        $taskDurations[$currentTaskId] = [];
    }
    $taskDurations[$currentTaskId][] = $duration;
}

            if ($currentTaskId !== null) {
                if ($section === 'Главная') {
                    if ($currentTaskId >= 2 && $currentTaskId <= 4) {
                        $totalTasks++;
                        if ($taskSuccess) $successfulTasks++;
                    }
                } elseif ($section === 'Карточка') {
                    if ($currentTaskId >= 1 && $currentTaskId <= 7) {
                        $totalTasks++;
                        if ($taskSuccess) $successfulTasks++;
                    }
                } else {
                    $totalTasks++;
                    if ($taskSuccess) $successfulTasks++;
                }
            }

            $currentTaskId = $point['task_id'];
            $taskSuccess = false;
            $currentTaskStartTime = $point['time'];
        }

        $currentTaskEndTime = $point['time'];

        // Попадает ли точка в зону
        $foundZoneId = null;
        foreach ($zones as $zoneId => $zoneCoords) {
            if (pointInZone($point['x_iframe'], $point['y_iframe'], $zoneCoords, 150)) {
                $foundZoneId = $zoneId;
                break;
            }
        }

        // Учитываем время в зоне
        if ($foundZoneId !== $currentZoneId) {
            if ($currentZoneId !== null && $zoneStartTime !== null) {
                $interval = $point['time'] - $zoneStartTime;
                if ($interval > 0) $timeInZones += $interval;
            }

            if ($foundZoneId !== null) {
                $zoneStartTime = $point['time'];
                $participantZones[$participantId][$foundZoneId] = true;

                if (isset($taskZones[$currentTaskId]) &&
                    pointInZone($point['x_iframe'], $point['y_iframe'], $taskZones[$currentTaskId], 150)) {
                    $taskSuccess = true;
                }
            } else {
                $zoneStartTime = null;
            }

            $currentZoneId = $foundZoneId;
        } else {
            if (isset($taskZones[$currentTaskId]) && !$taskSuccess) {
                if (pointInZone($point['x_iframe'], $point['y_iframe'], $taskZones[$currentTaskId], 150)) {
                    $taskSuccess = true;
                }
            }
        }
    }

    // Завершение последней задачи
    if ($currentTaskStartTime !== null && $currentTaskEndTime !== null && $currentTaskEndTime > $currentTaskStartTime) {
        $duration = $currentTaskEndTime - $currentTaskStartTime;
        $participantTotalTime[$participantId] += ($currentTaskEndTime - $currentTaskStartTime);
        $totalTime += ($currentTaskEndTime - $currentTaskStartTime);
    }

    if ($currentTaskId !== null) {
        if ($section === 'Главная') {
            if ($currentTaskId >= 2 && $currentTaskId <= 4) {
                $totalTasks++;
                if ($taskSuccess) $successfulTasks++;
            }
        } elseif ($section === 'Карточка') {
            if ($currentTaskId >= 1 && $currentTaskId <= 7) {
                $totalTasks++;
                if ($taskSuccess) $successfulTasks++;
            }
        } else {
            $totalTasks++;
            if ($taskSuccess) $successfulTasks++;
        }
    }

    // Завершаем интервал в последней зоне
    if ($currentZoneId !== null && $zoneStartTime !== null) {
        $interval = $currentTaskEndTime - $zoneStartTime;
        if ($interval > 0) {
            $timeInZones += $interval;
        }
    }
}

// Итоги:
$participantsCount = count($participantZones);
$totalViewedZoneCount = 0;
foreach ($participantZones as $zonesSet) {
    $totalViewedZoneCount += count($zonesSet); // суммы уникальных зон каждого участника
}


$timeOutZones = $totalTime - $timeInZones;
if ($timeOutZones < 0) $timeOutZones = 0;

$maxPossibleViews = $totalZones * $participantsCount;

if ($section === 'Главная') {
    $zoneViewRatio = $maxPossibleViews > 0 ? $totalViewedZoneCount / $maxPossibleViews : null;
    $zoneViewAvailable = true;
} else {
    $zoneViewRatio = null;
    $zoneViewAvailable = false;
}

$taskSuccessRatio = $totalTasks > 0 ? $successfulTasks / $totalTasks : 0;
$timeInZonesRatio = $totalTime > 0 ? $timeInZones / $totalTime : 0;


// Время вне коммерческих зон
$timeOutZones = $totalTime - $timeInZones;
if ($timeOutZones < 0) $timeOutZones = 0;


// Уберём последнюю задачу
$allTaskKeys = array_keys($taskDurations);
$lastTaskKey = end($allTaskKeys);

$allDurationsExceptLast = [];

foreach ($taskDurations as $taskId => $durations) {
    if ($taskId !== $lastTaskKey) {
        // Объединяем все времена в один массив
        $allDurationsExceptLast = array_merge($allDurationsExceptLast, $durations);
    }
}

// Считаем среднее для всех задач кроме последней
if (count($allDurationsExceptLast) > 0) {
    $averageAllExceptLast = array_sum($allDurationsExceptLast) / count($allDurationsExceptLast);
} else {
    $averageAllExceptLast = 0;
}

// В ответ кладём среднее время по всем задачам кроме последней как число или массив (если нужно)
$averageTaskTimes = ['averageTaskTimes' => $averageAllExceptLast];


echo json_encode([
    'taskSuccessRatio' => $taskSuccessRatio,
    'zoneViewRatio' => $zoneViewRatio,
    'zoneViewAvailable' => $zoneViewAvailable,
    'timeInZonesRatio' => $timeInZonesRatio,
     'averageTaskTimes' => $averageAllExceptLast,
    // данные для отладки
    'debug' => [
        'totalTasks' => $totalTasks,
         'successfulTasks' => $successfulTasks,
        'viewedZonesCount' => $totalViewedZoneCount, // суммарно все просмотры зон всеми участниками
        'totalZones' => $totalZones, // всего зон на экране
        'participants' => $participantsCount, // участников
        'timeInZones' => $timeInZones,
        'timeOutZones' => $timeOutZones,
        'totalTime' => $totalTime,
       
    ]
]);


function pointInZone($x, $y, $zone, $radius = 80) {
    // Найдём ближайшую точку на прямоугольнике к центру окружности
    $nearestX = max($zone['x1'], min($x, $zone['x2']));
    $nearestY = max($zone['y1'], min($y, $zone['y2']));

    // Вычисляем расстояние от центра окружности до ближайшей точки прямоугольника
    $dx = $x - $nearestX;
    $dy = $y - $nearestY;

    // Если расстояние меньше или равно радиусу, значит пересекается
    return ($dx * $dx + $dy * $dy) <= ($radius * $radius);
}


function getZonesRaw($marketplace, $section) {
    if ($section === 'Главная') {
        switch ($marketplace) {
            case 'Ozon':
                return [
                    1 => ["x" => 87, "y" => 0, "width" => 171, "height" => 66],
                    2 => ["x" => 79, "y" => 142, "width" => 340, "height" => 383],
                    3 => ["x" => 59, "y" => 517, "width" => 1479, "height" => 187],
                    4 => ["x" => 70, "y" => 1682, "width" => 1453, "height" => 267],
                    5 => ["x" => 60, "y" => 2946, "width" => 1458, "height" => 244],
                    6 => ["x" => 50, "y" => 3682, "width" => 1498, "height" => 299],
                ];
            case 'Wildberries':
                return [
                    1 => ["x" => 30, "y" => 10, "width" => 278, "height" => 102],
                    2 => ["x" => 46, "y" => 122, "width" => 1496, "height" => 204],
                    3 => ["x" => 45, "y" => 1825, "width" => 749, "height" => 509],
                ];
            case 'МегаМаркет':
                return [
                    1 => ["x" => 2, "y" => 0, "width" => 1277, "height" => 325],
                ];
            case 'ЯндексМаркет':
                return [
                    1 => ["x" => 1405, "y" => 62, "width" => 3, "height" => 3],
                    2 => ["x" => 0, "y" => -13, "width" => 1419, "height" => 82],
                    3 => ["x" => 17, "y" => 59, "width" => 254, "height" => 68],
                    4 => ["x" => 17, "y" => 180, "width" => 1383, "height" => 318],
                    5 => ["x" => 696, "y" => 1511, "width" => 234, "height" => 334],
                    6 => ["x" => 485, "y" => 2141, "width" => 222, "height" => 336],
                ];
            default:
                return [];
        }
    }
    // Можешь добавить коммерческие зоны для карточки и других разделов
    return [];
}


// Зоны задач для разных маркетплейсов и секций
function getTaskZonesRaw($marketplace, $section) {
    if ($section === 'Главная') {
        switch ($marketplace) {
            case 'Ozon':
                return [
                    2 => ["x" => 1249, "y" => 1, "width" => 314, "height" => 119],
                    3 => ["x" => 1220, "y" => 1, "width" => 314, "height" => 119],
                    4 => ["x" => 339, "y" => 10, "width" => 841, "height" => 114],
                ];
            case 'Wildberries':
                return [
                    2 => ["x" => 1418, "y" => 7, "width" => 116, "height" => 107],
                    3 => ["x" => 1255, "y" => 21, "width" => 106, "height" => 83],
                    4 => ["x" => 349, "y" => 15, "width" => 832, "height" => 108],
                ];
            case 'МегаМаркет':
                return [
                    2 => ["x" => 864, "y" => 1, "width" => 143, "height" => 95],
                    3 => ["x" => 587, "y" => 4, "width" => 88, "height" => 95],
                    4 => ["x" => 657, "y" => 1, "width" => 237, "height" => 92],
                ];
            case 'ЯндексМаркет':
                return [
                    2 => ["x" => 1060, "y" => 2134, "width" => 81, "height" => 79],
                    3 => ["x" => 980, "y" => 2133, "width" => 96, "height" => 83],
                    4 => ["x" => 309, "y" => 2136, "width" => 493, "height" => 74],
                ];
        }
    }

    if ($section === 'Карточка') {
    switch ($marketplace) {
        case 'Ozon':
            return [
                1 => ["x" => 1125, "y" => 305, "width" => 298, "height" => 607],
                2 => ["x" => 1130, "y" => 557, "width" => 289, "height" => 557],
                3 => ["x" => 674, "y" => 804, "width" => 450, "height" => 86],
                4 => ["x" => 668, "y" => 308, "width" => 450, "height" => 494],
                5 => ["x" => 670, "y" => 890, "width" => 864, "height" => 4158],
                6 => ["x" => 1121, "y" => 496, "width" => 301, "height" => 589],
                7 => ["x" => 1425, "y" => 494, "width" => 60, "height" => 592],
            ];
        case 'Wildberries':
            return [
                1 => ["x" => 1181, "y" => 201, "width" => 305, "height" => 267],
                2 => ["x" => 1178, "y" => 499, "width" => 162, "height" => 258],
                3 => ["x" => 720, "y" => 495, "width" => 279, "height" => 47],
                4 => ["x" => 710, "y" => 680, "width" => 267, "height" => 61],
                5 => ["x" => 54, "y" => 1014, "width" => 1536, "height" => 468],
                6 => ["x" => 1170, "y" => 368, "width" => 350, "height" => 294],
                7 => ["x" => 1253, "y" => 28, "width" => 113, "height" => 82],
            ];
        case 'МегаМаркет':
            return [
                1 => ["x" => 1168, "y" => 426, "width" => 195, "height" => 91],
                2 => ["x" => 1156, "y" => 644, "width" => 361, "height" => 64],
                3 => ["x" => 642, "y" => 830, "width" => 362, "height" => 55],
                4 => ["x" => 653, "y" => 612, "width" => 249, "height" => 201],
                5 => ["x" => 74, "y" => 1818, "width" => 1447, "height" => 813],
                6 => ["x" => 1155, "y" => 573, "width" => 363, "height" => 71],
                7 => ["x" => 1338, "y" => 350, "width" => 235, "height" => 67],
            ];
        case 'ЯндексМаркет':
            return [
                1 => ["x" => 1166, "y" => 287, "width" => 374, "height" => 103],
                2 => ["x" => 1138, "y" => 499, "width" => 434, "height" => 116],
                3 => ["x" => 643, "y" => 220, "width" => 514, "height" => 162],
                4 => ["x" => 641, "y" => 261, "width" => 514, "height" => 410],
                5 => ["x" => 0, "y" => 2081, "width" => 1225, "height" => 671],
                6 => ["x" => 1116, "y" => 30, "width" => 440, "height" => 2097],
                7 => ["x" => 1116, "y" => 30, "width" => 440, "height" => 2097],
            ];
    }
}


    // По умолчанию — пустой массив
    return [];
}

?>
