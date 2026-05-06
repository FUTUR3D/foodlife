<?php
require 'api-helpers.php';

$userId = require_json_user();
$data = read_json_body();

$foodId = isset($data['id']) && $data['id'] !== '' ? (int) $data['id'] : 0;
$name = trim($data['name_cs'] ?? '');
$nameEn = trim($data['name_en'] ?? '');
$category = trim($data['category'] ?? '');
$unit = trim($data['default_unit'] ?? 'g');
$note = trim($data['note'] ?? '');

if ($name === '') {
    json_error('missing_name');
}

if (!in_array($unit, ['g', 'ml', 'ks', 'plátek', 'porce', 'lžička', 'lžíce'], true)) {
    $unit = 'g';
}

function nullable_float(array $data, string $key): ?float
{
    if (!isset($data[$key]) || $data[$key] === '') {
        return null;
    }

    $value = (float) str_replace(',', '.', (string) $data[$key]);
    return is_finite($value) ? $value : null;
}

$servingGrams = nullable_float($data, 'serving_grams');
$kcal = nullable_float($data, 'kcal_100g');
$protein = nullable_float($data, 'protein_100g');
$carbs = nullable_float($data, 'carbs_100g');
$fat = nullable_float($data, 'fat_100g');
$fiber = nullable_float($data, 'fiber_100g');
$sugar = nullable_float($data, 'sugar_100g');
$sodium = nullable_float($data, 'sodium_mg_100g');

try {
    if ($foodId > 0) {
        $stmt = $pdo->prepare('
            UPDATE foods
            SET
                name_cs = ?,
                name_en = ?,
                category = ?,
                default_unit = ?,
                serving_grams = ?,
                kcal_100g = ?,
                protein_100g = ?,
                carbs_100g = ?,
                total_carbs_100g = ?,
                fat_100g = ?,
                fiber_100g = ?,
                sugar_100g = ?,
                sodium_mg_100g = ?,
                note = ?
            WHERE id = ? AND user_id = ? AND source = "user"
        ');
        $stmt->execute([
            $name,
            $nameEn === '' ? null : $nameEn,
            $category === '' ? null : $category,
            $unit,
            $servingGrams,
            $kcal,
            $protein,
            $carbs,
            $carbs,
            $fat,
            $fiber,
            $sugar,
            $sodium,
            $note === '' ? null : $note,
            $foodId,
            $userId,
        ]);

        $checkStmt = $pdo->prepare('SELECT id FROM foods WHERE id = ? AND user_id = ? AND source = "user"');
        $checkStmt->execute([$foodId, $userId]);
        if (!$checkStmt->fetch()) {
            json_error('food_not_found', 404);
        }
    } else {
        $stmt = $pdo->prepare('
            INSERT INTO foods (
                user_id,
                source,
                name_cs,
                name_en,
                category,
                default_unit,
                serving_grams,
                kcal_100g,
                protein_100g,
                carbs_100g,
                total_carbs_100g,
                fat_100g,
                fiber_100g,
                sugar_100g,
                sodium_mg_100g,
                note
            )
            VALUES (?, "user", ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $userId,
            $name,
            $nameEn === '' ? null : $nameEn,
            $category === '' ? null : $category,
            $unit,
            $servingGrams,
            $kcal,
            $protein,
            $carbs,
            $carbs,
            $fat,
            $fiber,
            $sugar,
            $sodium,
            $note === '' ? null : $note,
        ]);

        $foodId = (int) $pdo->lastInsertId();
    }

    echo json_encode(['ok' => true, 'food_id' => $foodId]);
} catch (Exception $e) {
    log_error('food-save.php exception: ' . $e->getMessage());
    json_error('save_failed', 500);
}
