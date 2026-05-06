<?php
require 'api-helpers.php';

$userId = require_json_user();
$data = read_json_body();
$mealId = isset($data['meal_id']) ? (int) $data['meal_id'] : 0;

if ($mealId <= 0) {
    json_error('missing_meal_id');
}

$stmt = $pdo->prepare('DELETE FROM meals WHERE id = ? AND user_id = ?');
$stmt->execute([$mealId, $userId]);

echo json_encode(['ok' => true]);
