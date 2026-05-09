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
    $sighiEnabled = has_sighi_tables($pdo);
    $sighiSelect = $sighiEnabled ? sighi_select_sql('f') : sighi_empty_select_sql();
    $sighiJoin = $sighiEnabled ? sighi_join_sql('f') : '';

    $where = '(r.user_id = ? OR r.user_id IS NULL OR r.is_public = 1 OR r.source = "system")';
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
            r.user_id,
            r.source,
            r.recipe_key,
            r.title,
            r.description,
            r.meal_type,
            r.servings,
            r.prep_minutes,
            r.cook_minutes,
            r.instructions,
            r.difficulty,
            r.is_public,
            r.goal_type,
            r.carb_level,
            r.digestion_score,
            r.protein_score,
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
            (
                SELECT GROUP_CONCAT(rt.code ORDER BY rt.code SEPARATOR ',')
                FROM recipe_tag_links rtl
                JOIN recipe_tags rt ON rt.id = rtl.tag_id
                WHERE rtl.recipe_id = r.id
            ) AS tag_codes,
            (
                SELECT GROUP_CONCAT(rt.label_cs ORDER BY rt.label_cs SEPARATOR ',')
                FROM recipe_tag_links rtl
                JOIN recipe_tags rt ON rt.id = rtl.tag_id
                WHERE rtl.recipe_id = r.id
            ) AS tag_labels,
            f.name_cs AS food_name,
            f.name_en AS food_name_en,
            f.default_unit,
            f.serving_grams,
            f.kcal_100g,
            f.protein_100g,
            f.carbs_100g,
            f.fat_100g,
            f.fiber_100g
            {$sighiSelect}
        FROM recipes r
        LEFT JOIN recipe_items ri ON ri.recipe_id = r.id
        LEFT JOIN foods f ON f.id = ri.food_id
        {$sighiJoin}
        WHERE $where
        ORDER BY r.source ASC, r.updated_at DESC, r.title ASC, ri.sort_order ASC, ri.id ASC
    ");
    $stmt->execute($params);

    $recipes = [];
    foreach ($stmt->fetchAll() as $row) {
        $recipeId = (int) $row['recipe_id'];
        if (!isset($recipes[$recipeId])) {
            $recipes[$recipeId] = [
                'id' => $recipeId,
                'user_id' => $row['user_id'] === null ? null : (int) $row['user_id'],
                'source' => $row['source'] ?: 'user',
                'recipe_key' => $row['recipe_key'],
                'title' => $row['title'],
                'description' => $row['description'],
                'meal_type' => $row['meal_type'],
                'meal_types' => $row['meal_types'] ? explode(',', $row['meal_types']) : [$row['meal_type']],
                'servings' => $row['servings'] === null ? null : (float) $row['servings'],
                'prep_minutes' => $row['prep_minutes'] === null ? null : (int) $row['prep_minutes'],
                'cook_minutes' => $row['cook_minutes'] === null ? null : (int) $row['cook_minutes'],
                'instructions' => $row['instructions'],
                'difficulty' => $row['difficulty'],
                'is_public' => (int) $row['is_public'],
                'goal_type' => $row['goal_type'],
                'carb_level' => $row['carb_level'],
                'digestion_score' => $row['digestion_score'] === null ? null : (int) $row['digestion_score'],
                'protein_score' => $row['protein_score'] === null ? null : (int) $row['protein_score'],
                'tag_codes' => $row['tag_codes'] ? explode(',', $row['tag_codes']) : [],
                'tag_labels' => $row['tag_labels'] ? explode(',', $row['tag_labels']) : [],
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
            ] + sighi_payload($row);
        }
    }

    echo json_encode(['recipes' => array_values($recipes)], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    log_error('recipes-list.php exception: ' . $e->getMessage());
    json_error('recipes_load_failed', 500);
}
