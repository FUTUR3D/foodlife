<?php
require 'api-helpers.php';

$userId = require_json_user();
$data = read_json_body();

$date = valid_date_or_today($data['date'] ?? null);
$mealType = trim($data['meal_type'] ?? '');
$title = trim($data['title'] ?? '');
$note = trim($data['note'] ?? '');
$items = $data['items'] ?? [];
$mealId = isset($data['meal_id']) && $data['meal_id'] !== '' ? (int) $data['meal_id'] : 0;

if ($mealType === '') {
    json_error('missing_meal_type');
}

if (!is_array($items) || count($items) === 0) {
    json_error('missing_items');
}

$time = trim($data['time'] ?? '');
if (!preg_match('/^\d{2}:\d{2}$/', $time)) {
    $time = date('H:i');
}

$mealTime = $date . ' ' . $time . ':00';
if ($title === '') {
    $title = $mealType;
}

try {
    $pdo->beginTransaction();

    $ingredients = [];
    foreach ($items as $item) {
        $name = trim($item['name'] ?? $item['custom_name'] ?? '');
        $amount = $item['amount'] ?? '';
        $unit = trim($item['unit'] ?? '');
        if ($name !== '') {
            $ingredients[] = trim($name . ' ' . $amount . ' ' . $unit);
        }
    }

    if ($mealId > 0) {
        $stmt = $pdo->prepare('
            UPDATE meals
            SET meal_time = ?, meal_type = ?, title = ?, ingredients = ?, note = ?
            WHERE id = ? AND user_id = ?
        ');
        $stmt->execute([
            $mealTime,
            $mealType,
            $title,
            implode("\n", $ingredients),
            $note === '' ? null : $note,
            $mealId,
            $userId,
        ]);

        if ($stmt->rowCount() === 0) {
            $checkStmt = $pdo->prepare('SELECT id FROM meals WHERE id = ? AND user_id = ?');
            $checkStmt->execute([$mealId, $userId]);
            if (!$checkStmt->fetch()) {
                json_error('meal_not_found', 404);
            }
        }

        $deleteStmt = $pdo->prepare('DELETE FROM meal_items WHERE meal_id = ?');
        $deleteStmt->execute([$mealId]);
    } else {
        $stmt = $pdo->prepare('
            INSERT INTO meals (user_id, meal_time, meal_type, title, ingredients, note)
            VALUES (?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $userId,
            $mealTime,
            $mealType,
            $title,
            implode("\n", $ingredients),
            $note === '' ? null : $note,
        ]);

        $mealId = (int) $pdo->lastInsertId();
    }
    $itemStmt = $pdo->prepare('
        INSERT INTO meal_items (meal_id, food_id, recipe_id, custom_name, amount, unit, grams, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ');

    foreach ($items as $item) {
        $foodId = isset($item['food_id']) && $item['food_id'] !== '' ? (int) $item['food_id'] : null;
        $recipeId = isset($item['recipe_id']) && $item['recipe_id'] !== '' ? (int) $item['recipe_id'] : null;
        $customName = trim($item['custom_name'] ?? $item['name'] ?? '');
        $amount = isset($item['amount']) && $item['amount'] !== '' ? (float) $item['amount'] : null;
        $unit = trim($item['unit'] ?? '') ?: null;
        $grams = isset($item['grams']) && $item['grams'] !== '' ? (float) $item['grams'] : null;
        $itemNote = trim($item['note'] ?? '') ?: null;
        $servingGrams = isset($item['serving_grams']) && $item['serving_grams'] !== '' ? (float) $item['serving_grams'] : null;

        if ($grams === null && $amount !== null && $servingGrams !== null && !in_array($unit, ['g', 'ml'], true)) {
            $grams = $amount * $servingGrams;
        }

        if (!$foodId && $customName === '') {
            continue;
        }

        $itemStmt->execute([
            $mealId,
            $foodId,
            $recipeId,
            $foodId ? null : $customName,
            $amount,
            $unit,
            $grams,
            $itemNote,
        ]);
    }

    $pdo->commit();
    echo json_encode(['ok' => true, 'meal_id' => $mealId]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    log_error('meal-save.php exception: ' . $e->getMessage());
    json_error('save_failed', 500);
}
