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
            COALESCE(foods.external_source, '') = 'all_drinks_nutrition_database_cz'
            OR COALESCE(foods.category, '') LIKE 'Nápoj%'
        )";
} elseif ($type === 'food') {
    $typeFilter = "
        AND NOT (
            COALESCE(foods.external_source, '') = 'all_drinks_nutrition_database_cz'
            OR COALESCE(foods.category, '') LIKE 'Nápoj%'
        )";
}

$params[] = $query;
$params[] = $prefix;
$sighiEnabled = has_sighi_tables($pdo);
$sighiSelect = $sighiEnabled ? sighi_select_sql('foods') : sighi_empty_select_sql();
$sighiJoin = $sighiEnabled ? sighi_join_sql('foods') : '';

$stmt = $pdo->prepare("
    SELECT
        foods.id AS id,
        foods.source AS source,
        foods.external_source AS external_source,
        foods.name_cs AS name_cs,
        foods.name_en AS name_en,
        foods.category AS category,
        foods.default_unit AS default_unit,
        foods.serving_grams AS serving_grams,
        foods.kcal_100g AS kcal_100g,
        foods.protein_100g AS protein_100g,
        foods.carbs_100g AS carbs_100g,
        foods.fat_100g AS fat_100g,
        foods.fiber_100g AS fiber_100g,
        foods.sugar_100g AS sugar_100g,
        foods.sodium_mg_100g AS sodium_mg_100g,
        foods.note AS note,
        foods.fodmap_level AS fodmap_level,
        foods.histamine_level AS histamine_level
        {$sighiSelect}
    FROM foods
    {$sighiJoin}
    WHERE
        (foods.user_id IS NULL OR foods.user_id = ?)
        AND (foods.name_cs LIKE ? OR foods.name_en LIKE ? OR foods.external_code LIKE ?)
        {$typeFilter}
    ORDER BY
        CASE
            WHEN foods.name_cs = ? THEN 0
            WHEN foods.name_cs LIKE ? THEN 1
            ELSE 2
        END,
        foods.name_cs ASC
    LIMIT 30
");

$stmt->execute($params);

echo json_encode(['foods' => $stmt->fetchAll()]);
