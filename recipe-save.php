<?php
require 'recipe-helpers.php';

$userId = require_json_user();
$data = read_json_body();

$title = trim($data['title'] ?? '');
$mealTypes = valid_meal_types($data['meal_types'] ?? []);
if (!$mealTypes) {
    $mealTypes = [valid_meal_type($data['meal_type'] ?? '')];
}
$mealType = $mealTypes[0];
$note = trim($data['description'] ?? $data['note'] ?? '');
$instructions = trim($data['instructions'] ?? '');
$prepMinutes = isset($data['prep_minutes']) && $data['prep_minutes'] !== '' ? max(0, (int) $data['prep_minutes']) : null;
$cookMinutes = isset($data['cook_minutes']) && $data['cook_minutes'] !== '' ? max(0, (int) $data['cook_minutes']) : null;
$servings = isset($data['servings']) && $data['servings'] !== '' ? max(0.1, (float) $data['servings']) : 1;
$difficulty = in_array(($data['difficulty'] ?? 'easy'), ['easy', 'medium', 'hard'], true) ? $data['difficulty'] : 'easy';
$goalType = in_array(($data['goal_type'] ?? 'none'), ['none', 'lose_weight', 'maintain_weight', 'gain_weight', 'digestive_comfort', 'low_fodmap', 'low_histamine'], true) ? $data['goal_type'] : 'none';
$carbLevel = in_array(($data['carb_level'] ?? 'unknown'), ['unknown', 'low', 'medium', 'high'], true) ? $data['carb_level'] : 'unknown';
$aiPrompt = trim($data['ai_prompt'] ?? '');
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
            SET title = ?, description = ?, meal_type = ?, servings = ?, prep_minutes = ?, cook_minutes = ?, instructions = ?, difficulty = ?, goal_type = ?, carb_level = ?, ai_prompt = ?
            WHERE id = ? AND user_id = ?
        ');
        $stmt->execute([
            $title,
            $note === '' ? null : $note,
            $mealType,
            $servings,
            $prepMinutes,
            $cookMinutes,
            $instructions === '' ? null : $instructions,
            $difficulty,
            $goalType,
            $carbLevel,
            $aiPrompt === '' ? null : $aiPrompt,
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

        $deleteTypeStmt = $pdo->prepare('DELETE FROM recipe_meal_types WHERE recipe_id = ?');
        $deleteTypeStmt->execute([$recipeId]);
    } else {
        $stmt = $pdo->prepare('
            INSERT INTO recipes (user_id, title, description, meal_type, servings, prep_minutes, cook_minutes, instructions, difficulty, is_public, goal_type, carb_level, ai_prompt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
        ');
        $stmt->execute([
            $userId,
            $title,
            $note === '' ? null : $note,
            $mealType,
            $servings,
            $prepMinutes,
            $cookMinutes,
            $instructions === '' ? null : $instructions,
            $difficulty,
            $goalType,
            $carbLevel,
            $aiPrompt === '' ? null : $aiPrompt,
        ]);
        $recipeId = (int) $pdo->lastInsertId();
    }

    $typeStmt = $pdo->prepare('INSERT IGNORE INTO recipe_meal_types (recipe_id, meal_type) VALUES (?, ?)');
    foreach ($mealTypes as $type) {
        $typeStmt->execute([$recipeId, $type]);
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
