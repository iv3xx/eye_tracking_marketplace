<?php
// upload_files_cr.php

ini_set('display_errors', 1);
error_reporting(E_ALL);

$uploadDir = 'uploads/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
} else {
    // Очистить папку, если нужно
    $files = glob($uploadDir . '*');
    foreach ($files as $file) {
        if (is_file($file)) {
            unlink($file);
        }
    }
}

$uploadedFiles = $_FILES['files'] ?? null;
$pageLength = $_POST['page_length'] ?? null;

if (!$uploadedFiles || !$pageLength || !is_numeric($pageLength)) {
    http_response_code(400);
    echo json_encode(['error' => 'Некорректные данные']);
    exit;
}

$uploadedFilePaths = [];
for ($i = 0; $i < count($uploadedFiles['name']); $i++) {
    $tmpName = $uploadedFiles['tmp_name'][$i];
    $name = basename($uploadedFiles['name'][$i]);
    $targetPath = $uploadDir . $name;
    if (move_uploaded_file($tmpName, $targetPath)) {
        $uploadedFilePaths[] = $targetPath;
    }
}

$data = [];

foreach ($uploadedFilePaths as $filePath) {
    $filename = basename($filePath);

    // Извлекаем participant_id из имени файла (например, 12_user.txt → 12)
    preg_match('/^(\d+)_/', $filename, $matches);
    $participantId = $matches[1] ?? null;

    if (!$participantId) {
        continue; // Пропускаем, если ID не удалось извлечь
    }

    $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

    if (count($lines) > 0 && strpos($lines[0], 'time') === 0) {
        array_shift($lines); // удаляем заголовок
    }

    foreach ($lines as $line) {
        $parts = explode(',', $line);
        if (count($parts) >= 5) {
            $x_iframe = floatval(trim($parts[3]));
            $y_iframe = floatval(trim($parts[4]));

            $data[] = [
                'participant_id' => (int)$participantId,
                'x_iframe' => $x_iframe,
                'y_iframe' => $y_iframe
            ];
        }
    }
}

$canvasWidth = 1920;
$canvasHeight = (int)$pageLength;

$jsonData = [
    'canvas' => [
        'width' => $canvasWidth,
        'height' => $canvasHeight
    ],
    'data' => $data
];

file_put_contents($uploadDir . 'parsed_heatmap_data.json', json_encode($jsonData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

echo json_encode(['success' => true, 'message' => 'Файлы загружены и JSON сформирован.']);
