<?php
require 'recipe-helpers.php';

$userId = require_json_user();
$data = read_json_body();
$recipeId = isset($data['recipe_id']) ? (int) $data['recipe_id'] : 0;

if ($recipeId <= 0) {
    json_error('missing_recipe_id');
}

try {
    ensure_recipe_tables($pdo);

    $stmt = $pdo->prepare('DELETE FROM recipes WHERE id = ? AND user_id = ?');
    $stmt->execute([$recipeId, $userId]);

    echo json_encode(['ok' => true]);
} catch (Exception $e) {
    log_error('recipe-delete.php exception: ' . $e->getMessage());
    json_error('recipe_delete_failed', 500);
}
