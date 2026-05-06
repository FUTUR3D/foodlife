<?php
require 'api-helpers.php';

$userId = require_json_user();
$data = read_json_body();
$foodId = isset($data['id']) ? (int) $data['id'] : 0;

if ($foodId <= 0) {
    json_error('missing_food_id');
}

try {
    $stmt = $pdo->prepare('DELETE FROM foods WHERE id = ? AND user_id = ? AND source = "user"');
    $stmt->execute([$foodId, $userId]);

    echo json_encode(['ok' => true]);
} catch (Exception $e) {
    log_error('food-delete.php exception: ' . $e->getMessage());
    json_error('delete_failed', 500);
}
