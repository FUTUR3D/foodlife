<?php
require 'config.php';

function require_json_user(): int
{
    header('Content-Type: application/json; charset=UTF-8');

    if (empty($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'not_authenticated']);
        exit;
    }

    return (int) $_SESSION['user_id'];
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '{}', true);

    if (!is_array($data)) {
        http_response_code(400);
        echo json_encode(['error' => 'invalid_json']);
        exit;
    }

    return $data;
}

function valid_date_or_today(?string $date): string
{
    if ($date && preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        return $date;
    }

    return date('Y-m-d');
}

function json_error(string $code, int $status = 400): void
{
    http_response_code($status);
    echo json_encode(['error' => $code]);
    exit;
}
