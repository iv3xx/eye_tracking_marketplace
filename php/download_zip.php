<?php
$dir = __DIR__ . '/img_generate';
$zipFile = __DIR__ . '/heatmaps.zip';

$zip = new ZipArchive();
if ($zip->open($zipFile, ZipArchive::CREATE | ZipArchive::OVERWRITE)) {
    $imageFiles = ['circles.png', 'intersection_zones.png', 'heatmap2.png', 'circle_outlines.png', 'intersection_zonesBlack.png'];
    
    foreach ($imageFiles as $filename) {
        $filePath = "$dir/$filename";
        if (file_exists($filePath)) {
            $zip->addFile($filePath, $filename);
        }
    }
    $zip->close();
    header('Content-Type: application/zip');
    header('Content-disposition: attachment; filename=heatmaps.zip');
    header('Content-Length: ' . filesize($zipFile));
    readfile($zipFile);
    // Удалим архив после скачивания
    unlink($zipFile);
    exit;
} else {
    http_response_code(500);
    echo "Не удалось создать архив.";
}
