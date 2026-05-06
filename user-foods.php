<?php
require 'api-helpers.php';

$userId = require_json_user();

$stmt = $pdo->prepare('
    SELECT
        id,
        external_source,
        external_code,
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
        note,
        updated_at
    FROM foods
    WHERE user_id = ? AND source = "user"
    ORDER BY updated_at DESC, name_cs ASC
');
$stmt->execute([$userId]);

$foods = array_map(static function (array $food): array {
    $food['food_kind'] = $food['external_source'] === 'FoodLife-user-edit'
        ? 'edited'
        : 'custom';
    return $food;
}, $stmt->fetchAll());

echo json_encode(['foods' => $foods]);
