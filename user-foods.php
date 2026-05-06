<?php
require 'api-helpers.php';

$userId = require_json_user();

$stmt = $pdo->prepare('
    SELECT
        id,
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

echo json_encode(['foods' => $stmt->fetchAll()]);
