<?php
// load_from_db.php

ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);


header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');


// Подключение к БД
$host = 'localhost';
$user = 'nasty';
$password = '06042002';
$dbname = 'gaze_experiment';
$port = 1150;

$con = mysqli_connect($host, $user, $password, $dbname, $port);

if (!$con) {
    http_response_code(500);
    echo json_encode(["error" => "Ошибка подключения к БД: " . mysqli_connect_error()]);
    exit;
}

if (!$con->set_charset('utf8')) {
    http_response_code(500);
    echo json_encode(["error" => "Ошибка при установке кодировки UTF-8"]);
    exit;
}

// Получаем participant_numbers через POST
$participantNumbers = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (isset($input['participantNumbers'])) {
        $participantNumbers = explode(',', $input['participantNumbers']);
        $participantNumbers = array_map('trim', $participantNumbers);
    }
}

if (empty($participantNumbers)) {
    http_response_code(400);
    echo json_encode(["error" => "Не переданы participantNumbers"]);
    exit;
}

$marketplace = $input['marketplace'] ?? '';
$section = $input['section'] ?? '';

if (empty($marketplace)) {
    http_response_code(400);
    echo json_encode(["error" => "Не указан marketplace"]);
    exit;
}

// === Формирование frame_name ===
switch ($marketplace) {
    case 'Ozon': $frameName = 'Ozon'; break;
    case 'Wildberries': $frameName = 'Wildberries'; break;
    case 'Яндекс Маркет': $frameName = 'ЯндексМаркет'; break;
    case 'Мега Маркет': $frameName = 'МегаМаркет'; break;
    default:
        http_response_code(400);
        echo json_encode(["error" => "Неизвестный marketplace: $marketplace"]);
        exit;
}

$sectionLower = mb_strtolower($section);
switch ($sectionLower) {
    case 'главная': $frameName .= '_Главная'; break;
    case 'поиск': $frameName .= '_Поиск'; break;
    case 'карточка товара': $frameName .= '_Карточка_товара'; break;
}

// === Определение канвы ===
function getCanvasHeight($marketplace, $section) {
    $map = [
        'Ozon' => ['карточка_товара' => 9627, 'поиск' => 3677, 'Главная' => 12564],
        'Wildberries' => ['карточка_товара' => 12455, 'поиск' => 413.979, 'Главная' => 3272],
        'ЯндексМаркет' => ['карточка_товара' => 4806, 'поиск' => 5000, 'Главная' => 3793],
        'МегаМаркет' => ['карточка_товара' => 10152, 'поиск' => 4500, 'Главная' => 719]
    ];
    $mp = $map[$marketplace] ?? null;
    if (!$mp) return 5000;
    $key = mb_strtolower($section);
    foreach ($mp as $sec => $height) {
        if (mb_strtolower($sec) === $key) return $height;
    }
    return 5000;
}
$canvas = ['width' => '1920', 'height' => getCanvasHeight($marketplace, $section)];


$placeholders = implode(',', array_fill(0, count($participantNumbers), '?'));
$types = str_repeat('s', count($participantNumbers));


// === 1. GAZE DATA ===
$sqlGaze = "SELECT * FROM gaze_data WHERE participant_number IN ($placeholders) AND frame_name = ?";
$typesGaze = $types . 's';
$params = array_merge($participantNumbers, [$frameName]);

$stmtGaze = mysqli_prepare($con, $sqlGaze);
if (!$stmtGaze) {
    http_response_code(500);
    echo json_encode(["error" => "Ошибка подготовки запроса gaze_data: " . mysqli_error($con)]);
    exit;
}


$tmp = [];
$tmp[] = &$typesGaze;
foreach ($params as $key => $value) {
    $tmp[] = &$params[$key];
}
call_user_func_array([$stmtGaze, 'bind_param'], $tmp);

if (!mysqli_stmt_execute($stmtGaze)) {
    http_response_code(500);
    echo json_encode(["error" => "Ошибка выполнения запроса gaze_data: " . mysqli_stmt_error($stmtGaze)]);
    exit;
}

$resultGaze = mysqli_stmt_get_result($stmtGaze);
$gazeData = [];
while ($row = mysqli_fetch_assoc($resultGaze)) {
    $gazeData[] = $row;
}

// Аналогично для participants
$sqlParticipants = "SELECT * FROM participants WHERE participant_number IN ($placeholders)";
$stmtParts = mysqli_prepare($con, $sqlParticipants);
if (!$stmtParts) {
    http_response_code(500);
    echo json_encode(["error" => "Ошибка подготовки запроса participants: " . mysqli_error($con)]);
    exit;
}

$tmpParts = [];
$tmpParts[] = &$types;
foreach ($participantNumbers as $key => $value) {
    $tmpParts[] = &$participantNumbers[$key];
}
call_user_func_array([$stmtParts, 'bind_param'], $tmpParts);

if (!mysqli_stmt_execute($stmtParts)) {
    http_response_code(500);
    echo json_encode(["error" => "Ошибка выполнения запроса participants: " . mysqli_stmt_error($stmtParts)]);
    exit;
}

$resultParts = mysqli_stmt_get_result($stmtParts);
$participants = [];
while ($row = mysqli_fetch_assoc($resultParts)) {
    $participants[] = $row;
}

function getGazeCount($userId, $marketplace, $section) {
    global $con;

      // frameName аналогично основной логике
    switch ($marketplace) {
        case 'Ozon': $frameName = 'Ozon'; break;
        case 'Wildberries': $frameName = 'Wildberries'; break;
        case 'Яндекс Маркет': $frameName = 'ЯндексМаркет'; break;
        case 'Мега Маркет': $frameName = 'МегаМаркет'; break;
        default: return 0;
    }

    $sectionLower = mb_strtolower($section);
    switch ($sectionLower) {
        case 'главная': $frameName .= '_Главная';break;
        case 'поиск': $frameName .= '_Поиск'; break;
        case 'карточка товара': $frameName .= '_Карточка_товара'; break;
        default: return 0;
    }

    $sql = "SELECT COUNT(*) AS count FROM gaze_data WHERE participant_number = ? AND frame_name = ?";
    $stmt = mysqli_prepare($con, $sql);
    if (!$stmt) {
        return 0;
    }

    mysqli_stmt_bind_param($stmt, 'ss', $userId, $frameName);
    if (!mysqli_stmt_execute($stmt)) {
        return 0;
    }

    $result = mysqli_stmt_get_result($stmt);
    $row = mysqli_fetch_assoc($result);

    return $row['count'] ?? 0;
}


foreach ($participants as $participant) {
    $result[] = [
        'id' => $participant['participant_number'],
        'gender' => $participant['gender'],
        'age' => $participant['age'],
        'gazeDataCount' => getGazeCount($participant['participant_number'],$marketplace, $section),
    ];
}
//ОТЛАДКА
$response = [
    "status" => "success",
    "message" => "JSON успешно создан",
    "entries" => count($gazeData),
    "gazeData" => $gazeData,
    "participants" => $participants,
    "jsonFile" => $uploadDir . 'parsed_heatmap_data.json',
    "frameNameUsed" => $frameName,
    "debug" => [
        "participantNumbers" => $participantNumbers,
        "marketplace" => $marketplace,
        "section" => $section
    ]
];

// === Сохранение JSON-файла ===
$finalData = [
    'marketplace' => $marketplace,
    'section' => $section,
    'canvas' => $canvas,
    'data' => []
];



$participantGroups = [];

// Группируем gazeData по participant_number
foreach ($gazeData as $entry) {
    $participantGroups[$entry['participant_number']][] = $entry;
}

function timeToSeconds($timeStr) {
    if (preg_match('/^(\d+):(\d+):(\d+)$/', $timeStr, $matches)) {
        $minutes = (int)$matches[1];
        $seconds = (int)$matches[2];
        $milliseconds = (int)$matches[3];
        return $minutes * 60 + $seconds + $milliseconds / 1000;
    }
    return 0.0;
}
usort($entries, function ($a, $b) {
    return timeToSeconds($a['time_stamp']) <=> timeToSeconds($b['time_stamp']);
});

foreach ($participantGroups as $participantId => $entries) {
    $taskId = 1;
    $previousTime = null;

  

    foreach ($entries as $entry) {
        $currentTime = timeToSeconds($entry['time_stamp']);

        if ($previousTime !== null && $currentTime < $previousTime) {
            $taskId++;
        }

        $previousTime = $currentTime;

        $finalData['data'][] = [
            'participant_id' => (string)$participantId,
            'time' => $currentTime,
            'x_screen' => $entry['x_screen'],
            'y_screen' => $entry['y_screen'],
            'x_iframe' => $entry['x_iframe'],
            'y_iframe' => $entry['y_iframe'],
            'task_id' => (int)$taskId
            ];
    }
}

// Создаём папку uploads если нет
$uploadDir = 'uploads/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

// Сохраняем JSON
file_put_contents(
    $uploadDir . 'parsed_heatmap_data.json',
    json_encode($finalData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
);


// Возврат JSON
echo json_encode($response);
error_log("DEBUG: frameName = $frameName");
error_log("DEBUG: participantNumbers = " . implode(', ', $participantNumbers));

?>
