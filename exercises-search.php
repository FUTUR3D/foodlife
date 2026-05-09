<?php
require 'api-helpers.php';

require_json_user();

$query = trim($_GET['q'] ?? '');

if (strlen($query) < 2) {
    echo json_encode(['exercises' => []]);
    exit;
}

$like = '%' . $query . '%';
$prefix = $query . '%';

try {
    $stmt = $pdo->prepare("
        SELECT
            id,
            slug,
            name_cs,
            name_en,
            category,
            calc_unit,
            met,
            kcal_per_rep,
            kcal_per_km_per_kg,
            default_amount,
            intensity,
            note,
            source_url
        FROM exercises
        WHERE
            active = 1
            AND (
                name_cs LIKE ?
                OR name_en LIKE ?
                OR category LIKE ?
                OR slug LIKE ?
            )
        ORDER BY
            CASE
                WHEN name_cs = ? THEN 0
                WHEN name_cs LIKE ? THEN 1
                ELSE 2
            END,
            category ASC,
            name_cs ASC
        LIMIT 30
    ");

    $stmt->execute([$like, $like, $like, $like, $query, $prefix]);
    echo json_encode(['exercises' => $stmt->fetchAll()]);
} catch (PDOException $e) {
    log_error('exercises-search failed: ' . $e->getMessage());
    json_error('exercise_database_missing', 500);
}
