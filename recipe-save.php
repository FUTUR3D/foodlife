<?php
require 'recipe-helpers.php';

$userId = require_json_user();
$data = read_json_body();

$title = trim($data['title'] ?? '');
$mealType = valid_meal_type($data['meal_type'] ?? '');
$note = trim($data['note'] ?? '');
$items = $data['items'] ?? [];
$recipeId = isset($data['recipe_id']) && $data['recipe_id'] !== '' ? (int) $data['recipe_id'] : 0;

if ($title === '') {
    json_error('missing_title');
}

if (!is_array($items) || count($items) === 0) {
    json_error('missing_items');
}

try {
    ensure_recipe_tables($pdo);
    $pdo->beginTransaction();

    if ($recipeId > 0) {
        $stmt = $pdo->prepare('
            UPDATE recipes
            SET title = ?, description = ?, meal_type = ?
            WHERE id = ? AND user_id = ?
        ');
        $stmt->execute([
            $title,
            $note === '' ? null : $note,
            $mealType,
            $recipeId,
            $userId,
        ]);

        $checkStmt = $pdo->prepare('SELECT id FROM recipes WHERE id = ? AND user_id = ?');
        $checkStmt->execute([$recipeId, $userId]);
        if (!$checkStmt->fetch()) {
            json_error('recipe_not_found', 404);
        }

        $deleteStmt = $pdo->prepare('DELETE FROM recipe_items WHERE recipe_id = ?');
        $deleteStmt->execute([$recipeId]);
    } else {
        $stmt = $pdo->prepare('
            INSERT INTO recipes (user_id, title, description, meal_type, servings, is_public, goal_type)
            VALUES (?, ?, ?, ?, 1, 0, "none")
        ');
        $stmt->execute([
            $userId,
            $title,
            $note === '' ? null : $note,
            $mealType,
        ]);
        $recipeId = (int) $pdo->lastInsertId();
    }

    $itemStmt = $pdo->prepare('
        INSERT INTO recipe_items (recipe_id, food_id, custom_name, amount, unit, grams, note, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ');

    $sortOrder = 0;
    foreach ($items as $item) {
        $foodId = isset($item['food_id']) && $item['food_id'] !== '' ? (int) $item['food_id'] : null;
        $customName = trim($item['custom_name'] ?? $item['name'] ?? '');
        $amount = isset($item['amount']) && $item['amount'] !== '' ? (float) $item['amount'] : null;
        $unit = trim($item['unit'] ?? '') ?: 'g';
        $grams = isset($item['grams']) && $item['grams'] !== '' ? (float) $item['grams'] : null;
        $itemNote = trim($item['note'] ?? '') ?: null;
        $servingGrams = isset($item['serving_grams']) && $item['serving_grams'] !== '' ? (float) $item['serving_grams'] : null;

        if ($grams === null && $amount !== null && $servingGrams !== null && !in_array($unit, ['g', 'ml'], true)) {
            $grams = $amount * $servingGrams;
        }

        if ($amount === null || (!$foodId && $customName === '')) {
            continue;
        }

        $itemStmt->execute([
            $recipeId,
            $foodId,
            $foodId ? null : $customName,
            $amount,
            $unit,
            $grams,
            $itemNote,
            $sortOrder,
        ]);
        $sortOrder++;
    }

    if ($sortOrder === 0) {
        $pdo->rollBack();
        json_error('missing_valid_items');
    }

    $pdo->commit();
    echo json_encode(['ok' => true, 'recipe_id' => $recipeId]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    log_error('recipe-save.php exception: ' . $e->getMessage());
    json_error('recipe_save_failed', 500);
}
