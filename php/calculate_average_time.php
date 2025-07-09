
<?php
// calculate_average_time.php
ini_set('display_errors', 1);
error_reporting(E_ALL);

function calculateStatistics($jsonFilePath) {
    if (!file_exists($jsonFilePath)) {
        return "<p>Файл не найден: {$jsonFilePath}</p>";
    }

    $json = file_get_contents($jsonFilePath);
    $parsed = json_decode($json, true);

    if (!$parsed || !isset($parsed['data'])) {
        return "<p>Ошибка при чтении данных из JSON.</p>";
    }

    $data = $parsed['data'];

    // Группируем по participant_id и task_id
    $tasks = [];

    foreach ($data as $entry) {
        $participantId = $entry['participant_id'];
        $taskId = $entry['task_id'];
        $time = $entry['time'];

        $key = "{$participantId}_{$taskId}";

        if (!isset($tasks[$key])) {
            $tasks[$key] = ['start' => $time, 'end' => $time];
        } else {
            if ($time < $tasks[$key]['start']) {
                $tasks[$key]['start'] = $time;
            }
            if ($time > $tasks[$key]['end']) {
                $tasks[$key]['end'] = $time;
            }
        }
    }

    if (empty($tasks)) {
        return "<p>Нет данных для анализа.</p>";
    }

    // Собираем продолжительность по задачам
    $taskDurations = [];

    foreach ($tasks as $key => $times) {
        [$participantId, $taskId] = explode('_', $key);

        $duration = $times['end'] - $times['start'];
        $taskId = (int)$taskId;

        $taskDurations[$taskId][] = $duration;
    }

    ksort($taskDurations);

    $html = "<h2>Данные по времени выполнения задач</h2>";
    $html .= "<table border='1' cellpadding='5'>";
    $html .= "<tr><th>№ Задачи</th><th>Среднее время (сек)</th><th>Макс (сек)</th><th>Мин (сек)</th><th>Кол-во участников</th></tr>";

    $overallDurations = [];

    foreach ($taskDurations as $taskId => $durations) {
        $avg = array_sum($durations) / count($durations);
        $max = max($durations);
        $min = min($durations);

        $overallDurations = array_merge($overallDurations, $durations);

        $html .= "<tr>";
        $html .= "<td>{$taskId}</td>";
        $html .= "<td>" . number_format($avg, 3) . "</td>";
        $html .= "<td>" . number_format($max, 3) . "</td>";
        $html .= "<td>" . number_format($min, 3) . "</td>";
        $html .= "<td>" . count($durations) . "</td>";
        $html .= "</tr>";
    }

    $html .= "</table>";

    if (count($overallDurations) > 0) {
        $totalAvg = array_sum($overallDurations) / count($overallDurations);
        $html .= "<p><strong>Среднее время выполнения всех задач (всех участников):</strong> " . number_format($totalAvg, 3) . " сек.</p>";
    }

    return $html;
}


// Пример использования
echo calculateStatistics('uploads/parsed_heatmap_data.json');
