<?php
// save_experiment.php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: text/html; charset=utf-8');

// Настройки подключения
$host = 'localhost';
$user = 'nasty'; 
$password = '06042002'; 
$dbname = 'gaze_experiment';
$port = 1150; 

// Установка соединения
$con = mysqli_connect($host, $user, $password, $dbname, $port);

// Проверка соединения
if (!$con) {
    die("Ошибка подключения: " . mysqli_connect_error());
}

// Проверка кодировки
if (!$con->set_charset('utf8')) {
    printf("Ошибка при загрузке набора символов utf8: %s\n", $con->error);
    exit();
}


/////////////////////////////////////////////////
// Добавляем ПОЛНЫЙ вывод тела запроса

// Чтение тела запроса
$rawPostData = file_get_contents('php://input');
file_put_contents(__DIR__ . '/debug_raw.txt', $rawPostData);
// Декодирование JSON
$data = json_decode($rawPostData, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    file_put_contents(__DIR__ . '/debug_json_error.txt', json_last_error_msg());
    echo "Ошибка: не удалось декодировать JSON: " . json_last_error_msg();
    exit;
}
if (!$data) {
    echo "Ошибка: не удалось декодировать JSON.";
    exit;
}


/////////////////////////////////////////////////

// Получаем JSON-данные

if (!$data) {
    http_response_code(400);
    echo "Нет данных для сохранения.";
    exit;
}

// Извлекаем информацию
$participantNumber = $data['participantNumber'];
$gender = $data['gender'];
$age = (int)$data['age'];
$color = $data['color'];
$gazeData = $data['gazeData'];

// Сохраняем данные
try {
    // Сохраняем участника
    
    $stmt = mysqli_prepare($con, "INSERT INTO participants (participant_number, gender, age, color) VALUES (?, ?, ?, ?)");
    mysqli_stmt_bind_param($stmt, "ssis", $participantNumber, $gender, $age, $color);
    
    
    if (!mysqli_stmt_execute($stmt)) {
        // Если ошибка НЕ дубликат участника
        if (mysqli_errno($con) != 1062) { // 1062 = Duplicate entry
          throw new Exception("Ошибка при сохранении участника: " . mysqli_stmt_error($stmt));

        } else {
            // дубликат, не критично
            echo "Участник уже существует, продолжаем запись gaze данных.\n";
        }
    }

    // Сохраняем gaze данные
    $stmtGaze = mysqli_prepare($con, "INSERT INTO gaze_data (participant_number, time_stamp, x_screen, y_screen, x_iframe, y_iframe, frame_name) VALUES (?, ?, ?, ?, ?, ?,?)");
    if (!$stmtGaze) {
        throw new Exception("Ошибка подготовки запроса gaze_data: " . mysqli_error($con));
    }

     // Получаем имя фрейма (передается в payload)
     $frameName = $data['frameName']; 

    foreach ($gazeData as $entry) {
    // преобразуем время
       $timestamp = $entry['time'];

        mysqli_stmt_bind_param($stmtGaze, "issddds", 
            $participantNumber, 
            $timestamp, 
            $entry['x_screen'], 
            $entry['y_screen'], 
            $entry['x_iframe'], 
            $entry['y_iframe'],
            $frameName 
        );
        if (!mysqli_stmt_execute($stmtGaze)) {
            throw new Exception("Ошибка при сохранении gaze записи: " . mysqli_stmt_error($stmtGaze));
        }
    }

    echo "OK.Данные сохранены"; // только если всё точно сохранилось
} catch (Exception $e) {
    http_response_code(500);
    echo "Ошибка: " . $e->getMessage();
}

file_put_contents(__DIR__ . '/debug_log.txt', $rawPostData);
?>
