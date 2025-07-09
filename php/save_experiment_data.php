<?php
// save_experiment_data.php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Настройки подключения
$host = 'localhost';
$user = 'nasty';
$password = '06042002';
$dbname = 'gaze_experiment';
$port = 1150; 
// Установка соединения
$con = mysqli_connect($host, $user, $password, $dbname, $port);

if (!$con) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => "Ошибка подключения: " . mysqli_connect_error()]);
    exit;
}

// Проверка кодировки
if (!$con->set_charset('utf8')) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => "Ошибка загрузки набора символов utf8: " . $con->error]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Неверные данные']);
    exit;
}

$date = $input['experimentDate'] ?? null;
$name = $input['experimentName'] ?? null;

if (!$date || !$name) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Дата и название обязательны']);
    exit;
}

// Остальные данные
$taskSuccessRatio = isset($input['taskSuccessRatio']) ? floatval($input['taskSuccessRatio']) : 0;
$zoneViewRatio = isset($input['zoneViewRatio']) && $input['zoneViewRatio'] !== null && $input['zoneViewRatio'] !== '' ? floatval($input['zoneViewRatio']) : null;
$participantsCount = isset($input['participantsCount']) ? intval($input['participantsCount']) : 0;
$marketplace = $input['marketplace'] ?? '';
$section = $input['section'] ?? '';
$totalTasks = isset($input['totalTasks']) ? intval($input['totalTasks']) : 0;
$successfulTasks = isset($input['successfulTasks']) ? intval($input['successfulTasks']) : 0;
$totalZones = isset($input['totalZones']) ? intval($input['totalZones']) : 0;
$viewedZonesCount = isset($input['viewedZonesCount']) ? intval($input['viewedZonesCount']) : 0;
$timeInZones = isset($input['timeInZones']) ? floatval($input['timeInZones']) : 0;
$timeOutZones = isset($input['timeOutZones']) ? floatval($input['timeOutZones']) : 0;
$totalTime = isset($input['totalTime']) ? floatval($input['totalTime']) : 0;
$averageTaskTimes = isset($input['averageTaskTimes']) ? floatval($input['averageTaskTimes']) : null;

// Экранирование строк
$date = $con->real_escape_string($date);
$name = $con->real_escape_string($name);
$marketplace = $con->real_escape_string($marketplace);
$section = $con->real_escape_string($section);

// Формируем SQL для вставки
$sql = "
INSERT INTO experiment_results
(experiment_date, experiment_name, marketplace, section, task_success_ratio, zone_view_ratio, participants_count, total_tasks, successful_tasks, total_zones, viewed_zones_count, time_in_zones, time_out_zones, total_time, average_task_times)
VALUES
(
    '$date', 
    '$name', 
    '$marketplace', 
    '$section', 
    $taskSuccessRatio, 
    " . (is_null($zoneViewRatio) ? "NULL" : $zoneViewRatio) . ", 
    $participantsCount, 
    $totalTasks, 
    $successfulTasks, 
    $totalZones, 
    $viewedZonesCount, 
    $timeInZones, 
    $timeOutZones, 
    $totalTime, 
    " . (is_null($averageTaskTimes) ? "NULL" : $averageTaskTimes) . "
)
";


if ($con->query($sql)) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Ошибка БД: ' . $con->error]);
}

$con->close();
