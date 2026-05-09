<?php
require 'api-helpers.php';

$userId = require_json_user();
$query = trim($_GET['q'] ?? '');
$type = trim($_GET['type'] ?? '');

if (strlen($query) < 2) {
    echo json_encode(['foods' => []]);
    exit;
}

$like = '%' . $query . '%';
$prefix = $query . '%';
$typeFilter = '';
$params = [$userId, $like, $like, $like];

if ($type === 'drink') {
    $typeFilter = "
        AND (
            COALESCE(external_source, '') = 'all_drinks_nutrition_database_cz'
            OR COALESCE(category, '') LIKE 'Nápoj%'
        )";
} elseif ($type === 'food') {
    $typeFilter = "
        AND NOT (
            COALESCE(external_source, '') = 'all_drinks_nutrition_database_cz'
            OR COALESCE(category, '') LIKE 'Nápoj%'
        )";
}

$params[] = $query;
$params[] = $prefix;
$sighiEnabled = has_sighi_tables($pdo);
$sighiSelect = $sighiEnabled ? sighi_select_sql('foods') : sighi_empty_select_sql();
$sighiJoin = $sighiEnabled ? sighi_join_sql('foods') : '';

$stmt = $pdo->prepare("
    SELECT
        id,
        source,
        external_source,
        name_cs,
        name_en,
        category,
        default_unit,
        serving_grams,
        kcal_100g,
        protein_100g,
        carbs_100g,
        fat_100g,
        fiber_100g,
        sugar_100g,
        sodium_mg_100g,
        note,
        fodmap_level,
        histamine_level
        {$sighiSelect}
    FROM foods
    {$sighiJoin}
    WHERE
        (user_id IS NULL OR user_id = ?)
        AND (name_cs LIKE ? OR name_en LIKE ? OR external_code LIKE ?)
        {$typeFilter}
    ORDER BY
        CASE
            WHEN name_cs = ? THEN 0
            WHEN name_cs LIKE ? THEN 1
            ELSE 2
        END,
        name_cs ASC
    LIMIT 30
");

$stmt->execute($params);

echo json_encode(['foods' => $stmt->fetchAll()]);
