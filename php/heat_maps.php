<!-- heat_maps.php -->

<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
error_log("heat_maps.php запущен");
ini_set('display_errors', 1);
ini_set('memory_limit', '10G');
error_reporting(E_ALL);

ini_set('max_execution_time', 1800); // до 30 минут
set_time_limit(1800);
// Запоминаем время начала выполнения
$startTime = microtime(true);

// Загрузка данных из JSON
$jsonFilePath = 'uploads/parsed_heatmap_data.json';
if (!file_exists($jsonFilePath)) {
    die('Ошибка: файл с данными не найден.');
}

$jsonData = json_decode(file_get_contents($jsonFilePath), true);
$canvas = $jsonData['canvas']; // Получаем раздел canvas из JSON

// Динамические размеры холста
$width = (int) $canvas['width'];  // предполагается, что значение уже преобразовано в пиксели
$height = (int) $canvas['height'];

// Создаем изображение для кругов, границ и пересечений
$imageCircles = imagecreatetruecolor($width, $height);
$white = imagecolorallocate($imageCircles, 255, 255, 255);
imagefill($imageCircles, 0, 0, $white);

// Изображение для границ кругов
$imageCircles_border = imagecreatetruecolor($width, $height);
imagefill($imageCircles_border, 0, 0, $white);

// Изображение для областей пересечений кругов
$imageIntersections = imagecreatetruecolor($width, $height);
imagefill($imageIntersections, 0, 0, $white);

// Изображение для зон пересечения кругов на черном фоне
$imageIntersectionsOnBlack = imagecreatetruecolor($width, $height);
$black = imagecolorallocate($imageIntersectionsOnBlack, 0, 0, 0);
imagefill($imageIntersectionsOnBlack, 0, 0, $black);
imagesavealpha($imageIntersectionsOnBlack, true); // Поддержка альфа-канала

// Массив с данными о глазных точках
$heatmapData = $jsonData['data']; // Получаем данные из JSON

// Массив для подсчета пересечений
//старая версия $intersectionsCount = array_fill(0, $width, array_fill(0, $height, 0));


// Оптимизированный массив для подсчета пересечений
$intersectionsCount = []; // key = "x-y" => count
$circles = []; // Массив кругов

function generateColorFromId($id) {
    // Массив фиксированных цветов (20 штук)
    $presetColors = [
        [255, 0, 0],     // Красный
        [0, 255, 0],     // Зеленый
        [0, 0, 255],     // Синий
        [255, 255, 0],   // Желтый
        [255, 0, 255],   // Пурпурный
        [0, 255, 255],   // Голубой
        [128, 0, 0],     // Темно-красный
        [0, 128, 0],     // Темно-зеленый
        [0, 0, 128],     // Темно-синий
        [128, 128, 0],   // Оливковый
        [128, 0, 128],   // Фиолетовый
        [0, 128, 128],   // Бирюзовый
        [192, 192, 192], // Светло-серый
        [128, 128, 128], // Серый
        [0, 0, 0],       // Черный
        [255, 165, 0],   // Оранжевый
        [255, 105, 180], // Розовый
        [139, 69, 19],   // Коричневый
        [75, 0, 130],    // Индиго
        [60, 179, 113],  // Средне-зеленый
    ];

    if (is_numeric($id) && $id >= 0 && $id < count($presetColors)) {
        return $presetColors[$id];
    }

    // Если ID больше 19 или не входит в список — генерируем цвет из хеша
    $hash = md5((string)$id);
    $r = ($val = hexdec(substr($hash, 0, 2))) % 128 + 64;
    $g = ($val = hexdec(substr($hash, 2, 2))) % 128 + 64;
    $b = ($val = hexdec(substr($hash, 4, 2))) % 128 + 64;

    return [$r, $g, $b];
}

foreach ($heatmapData as $data) {
    $participantId = $data['participant_id'];
    $color = generateColorFromId($participantId);

    $circles[] = [
        'x' => $data['x_iframe'],
        'y' => $data['y_iframe'],
        'radius' => 75,
        'color' => $color,
        'participant_id' => $participantId // опционально, для отладки
    ];
}

// Функция для проверки, находится ли точка внутри круга
function isPointInCircle($x, $y, $circle) {
    $dx = $x - $circle['x'];
    $dy = $y - $circle['y'];
    return ($dx * $dx + $dy * $dy) <= ($circle['radius'] * $circle['radius']);
}
$pixelColors = [];

foreach ($circles as $circle) {
    $startX = max(0, (int)($circle['x'] - $circle['radius']));
    $endX = min($width - 1, (int)($circle['x'] + $circle['radius']));
    $startY = max(0, (int)($circle['y'] - $circle['radius']));
    $endY = min($height - 1, (int)($circle['y'] + $circle['radius']));

    for ($x = $startX; $x <= $endX; $x++) {
        for ($y = $startY; $y <= $endY; $y++) {
            if (isPointInCircle($x, $y, $circle)) {
                $key = "$x-$y";
                $intersectionsCount[$key] = ($intersectionsCount[$key] ?? 0) + 1;
                $pixelColors[$key][] = $circle['color'];
            }
        }
    }
}
// === Отрисовка кругов и контуров ===
foreach ($circles as $circle) {
    $color = imagecolorallocate($imageCircles, ...$circle['color']);
    imagefilledellipse($imageCircles, $circle['x'], $circle['y'], $circle['radius'] * 2, $circle['radius'] * 2, $color);
    $borderColor = imagecolorallocate($imageCircles_border, ...$circle['color']);
    imageellipse($imageCircles_border, $circle['x'], $circle['y'], $circle['radius'] * 2, $circle['radius'] * 2, $borderColor);
}


// Рисуем только там, где более одного цвета (т.е. пересечения)
foreach ($pixelColors as $key => $colors) {
    if (count($colors) > 1) {
        $parts = explode('-', $key);
        $x = (int)$parts[0];
        $y = (int)$parts[1];

        $r = $g = $b = 0;
        foreach ($colors as $color) {
            $r += $color[0];
            $g += $color[1];
            $b += $color[2];
        }

        $count = count($colors);
        $r = (int)($r / $count);
        $g = (int)($g / $count);
        $b = (int)($b / $count);

        $finalColor = imagecolorallocate($imageIntersections, $r, $g, $b);
        imagesetpixel($imageIntersections, $x, $y, $finalColor);

        $whiteColor = imagecolorallocate($imageIntersectionsOnBlack, 255, 255, 255);
        imagesetpixel($imageIntersectionsOnBlack, $x, $y, $whiteColor);
    }
}


// Отрисовка кругов
foreach ($circles as $circle) {
    $color = imagecolorallocate($imageCircles, $circle['color'][0], $circle['color'][1], $circle['color'][2]);
    imagefilledellipse($imageCircles, $circle['x'], $circle['y'], $circle['radius'] * 2, $circle['radius'] * 2, $color);
}

// Настраиваем права для записи
if (!is_dir('img_generate')) {
    mkdir('img_generate', 0777, true);
}

// Сохранение изображений
imagepng($imageCircles, 'img_generate/circles.png');
imagepng($imageIntersections, 'img_generate/intersection_zones.png');
imagepng($imageCircles_border, 'img_generate/circle_outlines.png');
imagepng($imageIntersectionsOnBlack, 'img_generate/intersection_zonesBlack.png');

// ТЕПЛОВАЯ КАРТА версия 2. В данной версии цвета подбираются с учетом общего кол-ва пересечений.
$heatmapPixelColors = [];


//Новая версия
function calculateColor($percentage) {
    $colors = [
        [0, 0, 255], [0, 168, 255], [0, 255, 252], [0, 242, 110], [0, 255, 0],
        [193, 242, 0], [233, 242, 0], [242, 182, 0], [242, 85, 0], [255, 0, 0],
    ];
    $index = floor($percentage * 9);
    $next = min($index + 1, count($colors) - 1);
    $factor = ($percentage * 9) - $index;

    return [
        $colors[$index][0] + ($colors[$next][0] - $colors[$index][0]) * $factor,
        $colors[$index][1] + ($colors[$next][1] - $colors[$index][1]) * $factor,
        $colors[$index][2] + ($colors[$next][2] - $colors[$index][2]) * $factor,
    ];
}


$imageIntersectionsHeatmap = imagecreatetruecolor($width, $height);
imagealphablending($imageIntersectionsHeatmap, true); 
imagesavealpha($imageIntersectionsHeatmap, true); 
$whiteColor = imagecolorallocatealpha($imageIntersectionsHeatmap, 255, 255, 255, 127);
imagefill($imageIntersectionsHeatmap, 0, 0,  $whiteColor);

$maxIntersections = max($intersectionsCount);
foreach ($intersectionsCount as $key => $count) {
    list($x, $y) = explode('-', $key);
    $x = (int)$x;
    $y = (int)$y;

    $percentage = $count / $maxIntersections; 
    $color = calculateColor($percentage);
    $pixelColor = imagecolorallocatealpha($imageIntersectionsHeatmap, $color[0], $color[1], $color[2], 0);
    imagesetpixel($imageIntersectionsHeatmap, $x, $y, $pixelColor);
}

$imageFileName = 'img_generate/heatmap2.png';
imagepng($imageIntersectionsHeatmap, $imageFileName);


// === Отладочное изображение heatmap2_zone с прямоугольниками ===
$imageHeatmapWithZones = imagecreatetruecolor($width, $height);
imagealphablending($imageHeatmapWithZones, true); 
imagesavealpha($imageHeatmapWithZones, true); 
$transparent = imagecolorallocatealpha($imageHeatmapWithZones, 255, 255, 255, 127);
imagefill($imageHeatmapWithZones, 0, 0, $transparent);

// Копируем тепловую карту
imagecopy($imageHeatmapWithZones, $imageIntersectionsHeatmap, 0, 0, 0, 0, $width, $height);

// Массив с координатами прямоугольников
$zones = [
    2 => ["x" => 1249, "y" => 1, "width" => 314, "height" => 119],
    3 => ["x" => 1220, "y" => 1, "width" => 314, "height" => 119],
    4 => ["x" => 339, "y" => -7, "width" => 841, "height" => 114],
];

// Цвет рамки (например, красный)
$zoneColor = imagecolorallocatealpha($imageHeatmapWithZones, 255, 0, 0, 64);

// Отрисовка прямоугольников
foreach ($zones as $zone) {
    imagerectangle(
        $imageHeatmapWithZones,
        $zone['x'],
        $zone['y'],
        $zone['x'] + $zone['width'],
        $zone['y'] + $zone['height'],
        $zoneColor
    );
}

// Сохраняем изображение
$zoneImageFile = 'img_generate/heatmap2_zone.png';
imagepng($imageHeatmapWithZones, $zoneImageFile);
imagedestroy($imageHeatmapWithZones);

//=========ОТЛАДКА  ЗАКОНЧИЛАСЬ====
imagedestroy($imageIntersectionsHeatmap);

echo 'Изображение сохранено как ' . $imageFileName;

// Освобождение ресурсов
imagedestroy($imageCircles);
imagedestroy($imageIntersections);
imagedestroy($imageCircles_border);
imagedestroy($imageIntersectionsOnBlack);

// Запоминаем время окончания выполнения
$endTime = microtime(true);

// Вычисляем время выполнения
$executionTime = $endTime - $startTime;

echo 'Задача выполнена за ' . round($executionTime, 2) . ' секунд.';
?>