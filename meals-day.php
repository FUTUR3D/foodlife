<?php
require 'api-helpers.php';

$userId = require_json_user();
$date = valid_date_or_today($_GET['date'] ?? null);

$stmt = $pdo->prepare('
    SELECT
        m.id AS meal_id,
        m.meal_time,
        m.meal_type,
        m.title,
        m.note AS meal_note,
        mi.id AS item_id,
        mi.food_id,
        mi.recipe_id,
        mi.custom_name,
        mi.amount,
        mi.unit,
        mi.grams,
        mi.note AS item_note,
        f.name_cs AS food_name,
        f.name_en AS food_name_en,
        f.default_unit,
        f.serving_grams,
        f.kcal_100g,
        f.protein_100g,
        f.carbs_100g,
        f.fat_100g,
        f.fiber_100g
    FROM meals m
    LEFT JOIN meal_items mi ON mi.meal_id = m.id
    LEFT JOIN foods f ON f.id = mi.food_id
    WHERE m.user_id = ? AND DATE(m.meal_time) = ?
    ORDER BY m.meal_time ASC, m.id ASC, mi.id ASC
');
$stmt->execute([$userId, $date]);

$meals = [];
foreach ($stmt->fetchAll() as $row) {
    $mealId = (int) $row['meal_id'];
    if (!isset($meals[$mealId])) {
        $meals[$mealId] = [
            'id' => $mealId,
            'meal_time' => $row['meal_time'],
            'meal_type' => $row['meal_type'],
            'title' => $row['title'],
            'note' => $row['meal_note'],
            'items' => [],
        ];
    }

    if (!empty($row['item_id'])) {
        $meals[$mealId]['items'][] = [
            'id' => (int) $row['item_id'],
            'food_id' => $row['food_id'] === null ? null : (int) $row['food_id'],
            'recipe_id' => $row['recipe_id'] === null ? null : (int) $row['recipe_id'],
            'name' => $row['food_name'] ?: $row['custom_name'],
            'name_en' => $row['food_name_en'],
            'custom_name' => $row['custom_name'],
            'amount' => $row['amount'] === null ? null : (float) $row['amount'],
            'unit' => $row['unit'],
            'grams' => $row['grams'] === null ? null : (float) $row['grams'],
            'default_unit' => $row['default_unit'],
            'serving_grams' => $row['serving_grams'] === null ? null : (float) $row['serving_grams'],
            'note' => $row['item_note'],
            'kcal_100g' => $row['kcal_100g'] === null ? null : (float) $row['kcal_100g'],
            'protein_100g' => $row['protein_100g'] === null ? null : (float) $row['protein_100g'],
            'carbs_100g' => $row['carbs_100g'] === null ? null : (float) $row['carbs_100g'],
            'fat_100g' => $row['fat_100g'] === null ? null : (float) $row['fat_100g'],
            'fiber_100g' => $row['fiber_100g'] === null ? null : (float) $row['fiber_100g'],
        ];
    }
}

echo json_encode(['date' => $date, 'meals' => array_values($meals)]);
