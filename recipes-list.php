<?php
require 'recipe-helpers.php';

$userId = require_json_user();
$mealType = trim($_GET['meal_type'] ?? '');
$filterByMealType = $mealType !== '';
if ($filterByMealType) {
    $mealType = valid_meal_type($mealType);
}

try {
    ensure_recipe_tables($pdo);

    $where = 'r.user_id = ?';
    $params = [$userId];
    if ($filterByMealType) {
        $where .= ' AND (r.meal_type = ? OR EXISTS (
            SELECT 1 FROM recipe_meal_types mt_filter
            WHERE mt_filter.recipe_id = r.id AND mt_filter.meal_type = ?
        ))';
        $params[] = $mealType;
        $params[] = $mealType;
    }

    $stmt = $pdo->prepare("
        SELECT
            r.id AS recipe_id,
            r.title,
            r.description,
            r.meal_type,
            r.servings,
            r.instructions,
            r.goal_type,
            r.updated_at,
            ri.id AS item_id,
            ri.food_id,
            ri.custom_name,
            ri.amount,
            ri.unit,
            ri.grams,
            ri.note AS item_note,
            ri.sort_order,
            (
                SELECT GROUP_CONCAT(mt.meal_type ORDER BY mt.meal_type SEPARATOR ',')
                FROM recipe_meal_types mt
                WHERE mt.recipe_id = r.id
            ) AS meal_types,
            f.name_cs AS food_name,
            f.name_en AS food_name_en,
            f.default_unit,
            f.serving_grams,
            f.kcal_100g,
            f.protein_100g,
            f.carbs_100g,
            f.fat_100g,
            f.fiber_100g
        FROM recipes r
        LEFT JOIN recipe_items ri ON ri.recipe_id = r.id
        LEFT JOIN foods f ON f.id = ri.food_id
        WHERE $where
        ORDER BY r.updated_at DESC, r.title ASC, ri.sort_order ASC, ri.id ASC
    ");
    $stmt->execute($params);

    $recipes = [];
    foreach ($stmt->fetchAll() as $row) {
        $recipeId = (int) $row['recipe_id'];
        if (!isset($recipes[$recipeId])) {
            $recipes[$recipeId] = [
                'id' => $recipeId,
                'title' => $row['title'],
                'description' => $row['description'],
                'meal_type' => $row['meal_type'],
                'meal_types' => $row['meal_types'] ? explode(',', $row['meal_types']) : [$row['meal_type']],
                'servings' => $row['servings'] === null ? null : (float) $row['servings'],
                'instructions' => $row['instructions'],
                'goal_type' => $row['goal_type'],
                'updated_at' => $row['updated_at'],
                'items' => [],
            ];
        }

        if (!empty($row['item_id'])) {
            $recipes[$recipeId]['items'][] = [
                'id' => (int) $row['item_id'],
                'food_id' => $row['food_id'] === null ? null : (int) $row['food_id'],
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

    echo json_encode(['recipes' => array_values($recipes)], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    log_error('recipes-list.php exception: ' . $e->getMessage());
    json_error('recipes_load_failed', 500);
}
