<?php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Подключение к БД
$host = 'localhost';
$user = 'nasty';
$password = '06042002';
$dbname = 'gaze_experiment';
$port = 1150;

$con = mysqli_connect($host, $user, $password, $dbname, $port);
if (!$con) {
    http_response_code(500);
    echo json_encode(['error' => "Ошибка подключения: " . mysqli_connect_error()]);
    exit;
}
$con->set_charset('utf8');

// Получаем POST данные
$input = json_decode(file_get_contents('php://input'), true);
if (!$input || !isset($input['researchName'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Не указано название исследования']);
    exit;
}
$researchName = $con->real_escape_string(trim($input['researchName']));

// Запрос данных из таблицы experiment_results для данного исследования
$sql = "
SELECT 
    marketplace,
    section,
    SUM(zone_view_ratio) AS viewed_zones_count,
    SUM(total_zones) AS total_zones,
    SUM(time_in_zones) AS time_in_zones,
    SUM(time_out_zones) AS time_out_zones,
    SUM(total_time) AS total_time,
    AVG(average_task_times) AS average_task_times,
    AVG(task_success_ratio) AS task_success_ratio
FROM experiment_results
WHERE experiment_name = '$researchName'
GROUP BY marketplace, section
ORDER BY marketplace, section
";

$result = $con->query($sql);
if (!$result) {
    http_response_code(500);
    echo json_encode(['error' => 'Ошибка запроса к базе: ' . $con->error]);
    exit;
}

$marketplaces = [];
while ($row = $result->fetch_assoc()) {
    // Защита от деления на ноль
    $viewedZonesRatio = $row['viewed_zones_count']?? 0;
    $totalFixationTime = $row['time_in_zones'] + $row['time_out_zones'];
    $fixationTimeRatio = ($totalFixationTime > 0) ? ($row['time_in_zones'] / $totalFixationTime) : 0;
    $infoFindingRatio = ($row['total_time'] > 0 && $row['average_task_times'] !== null) ? (1-($row['average_task_times'] / $row['total_time'])) : 0;
    $taskSuccessRatio = $row['task_success_ratio'] ?? 0;

    // Сумма по формуле
    $sumScores = $viewedZonesRatio + $fixationTimeRatio + $infoFindingRatio + $taskSuccessRatio;
    $avgScores = $sumScores / 4;

    $mp = $row['marketplace'];
    if (!isset($marketplaces[$mp])) {
        $marketplaces[$mp] = [
            'marketplace' => $mp,
            'pages' => [],
            'totalSum' => 0,
        ];
    }

    $marketplaces[$mp]['pages'][] = [
    'section' => $row['section'],
    'scores' => [
        'viewedZonesRatio' => round($viewedZonesRatio, 3),
        'fixationTimeRatio' => round($fixationTimeRatio, 3),
        'infoFindingRatio' => round($infoFindingRatio, 3),
        'taskSuccessRatio' => round($taskSuccessRatio, 3),
    ],
    'sum' => round($sumScores, 3),
    'avg' => round($avgScores, 3),
    'userScore' => 0  // Новое поле
];

    $marketplaces[$mp]['totalSum'] += $sumScores;
}

// Округлим totalSum и сделаем массив заново (т.к. $marketplaces — ассоциативный)
foreach ($marketplaces as &$mpData) {
    $mpData['totalSum'] = round($mpData['totalSum'], 3);
}
unset($mpData);

echo json_encode(array_values($marketplaces), JSON_UNESCAPED_UNICODE);

$con->close();
