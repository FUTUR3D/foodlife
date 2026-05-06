<?php
require 'config.php';

header('Content-Type: application/json; charset=UTF-8');

if (empty($_SESSION['user_id'])) {
    echo json_encode(['loggedIn' => false, 'email' => '']);
    exit;
}

$stmt = $pdo->prepare('SELECT email FROM users WHERE id = ?');
$stmt->execute([(int) $_SESSION['user_id']]);
$user = $stmt->fetch();

if (!$user) {
    session_destroy();
    echo json_encode(['loggedIn' => false, 'email' => '']);
    exit;
}

echo json_encode([
    'loggedIn' => true,
    'email' => $user['email'],
]);
