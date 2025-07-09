<!--?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

$scriptPath = realpath(__DIR__ . '/calculate_average_time.py');
$uploadsPath = realpath(__DIR__ . '/uploads');

// Проверка на существование скрипта
if (!file_exists($scriptPath)) {
    http_response_code(500);
    echo "Python-скрипт не найден: $scriptPath";
    exit;
}

// Проверка на существование папки uploads
if (!file_exists($uploadsPath)) {
    http_response_code(500);
    echo "Папка с данными не найдена: $uploadsPath";
    exit;
}


$python = 'C:\Users\admin\AppData\Local\Programs\Python\Python313\python.exe';

$cmd = "$python " . escapeshellarg($scriptPath) . ' ' . escapeshellarg($uploadsPath);
$output = shell_exec($cmd . " 2>&1");

if ($output === null || $output === '') {
    http_response_code(500);
    echo "Ошибка при выполнении команды: $cmd";
    exit;
}
echo $output;-->
<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

$scriptPath = __DIR__ . '/calculate_average_time.php';

// Проверка на существование PHP-скрипта
if (!file_exists($scriptPath)) {
    http_response_code(500);
    echo "PHP-скрипт не найден: $scriptPath";
    exit;
}

// Выполнение PHP-скрипта
ob_start();
include $scriptPath;
$output = ob_get_clean();

if (empty($output)) {
    http_response_code(500);
    echo "Ошибка при выполнении calculate_average_time.php";
    exit;
}

echo $output;

