<?php
require 'api-helpers.php';

$userId = require_json_user();
$query = trim($_GET['q'] ?? '');

if (strlen($query) < 2) {
    echo json_encode(['foods' => []]);
    exit;
}

$like = '%' . $query . '%';
$stmt = $pdo->prepare('
    SELECT
        id,
        name_cs,
        name_en,
        default_unit,
        serving_grams,
        kcal_100g,
        protein_100g,
        carbs_100g,
        fat_100g,
        fiber_100g,
        sugar_100g,
        sodium_mg_100g,
        fodmap_level,
        histamine_level
    FROM foods
    WHERE
        (user_id IS NULL OR user_id = ?)
        AND (name_cs LIKE ? OR name_en LIKE ? OR external_code LIKE ?)
    ORDER BY
        CASE
            WHEN name_cs = ? THEN 0
            WHEN name_cs LIKE ? THEN 1
            ELSE 2
        END,
        name_cs ASC
    LIMIT 30
');

$prefix = $query . '%';
$stmt->execute([$userId, $like, $like, $like, $query, $prefix]);

echo json_encode(['foods' => $stmt->fetchAll()]);
