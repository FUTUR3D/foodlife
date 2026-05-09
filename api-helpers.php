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

function has_sighi_tables(PDO $pdo): bool
{
    static $hasTables = null;

    if ($hasTables !== null) {
        return $hasTables;
    }

    try {
        $pdo->query('SELECT 1 FROM sighi_foods LIMIT 1');
        $pdo->query('SELECT 1 FROM food_sighi_links LIMIT 1');
        $hasTables = true;
    } catch (Throwable $e) {
        $hasTables = false;
    }

    return $hasTables;
}

function sighi_select_sql(string $foodAlias = 'f'): string
{
    return ",
        sf.id AS sighi_id,
        sf.food AS sighi_food,
        sf.sighi_score_raw,
        sf.sighi_score,
        sf.histamine_marker,
        sf.other_amines_marker,
        sf.liberator_marker,
        sf.inhibitor_marker,
        sf.uncertain_marker,
        sf.other_marker,
        sf.notes AS sighi_notes,
        fsl.approved AS sighi_approved,
        fsl.confidence AS sighi_confidence,
        fsl.match_method AS sighi_match_method";
}

function sighi_empty_select_sql(): string
{
    return ",
        NULL AS sighi_id,
        NULL AS sighi_food,
        NULL AS sighi_score_raw,
        NULL AS sighi_score,
        NULL AS histamine_marker,
        NULL AS other_amines_marker,
        NULL AS liberator_marker,
        NULL AS inhibitor_marker,
        NULL AS uncertain_marker,
        NULL AS other_marker,
        NULL AS sighi_notes,
        NULL AS sighi_approved,
        NULL AS sighi_confidence,
        NULL AS sighi_match_method";
}

function sighi_join_sql(string $foodAlias = 'f'): string
{
    return "
        LEFT JOIN food_sighi_links fsl ON fsl.id = (
            SELECT l.id
            FROM food_sighi_links l
            WHERE l.food_id = {$foodAlias}.id
                AND (l.approved = 1 OR l.confidence >= 70)
            ORDER BY l.approved DESC, l.confidence DESC, l.id ASC
            LIMIT 1
        )
        LEFT JOIN sighi_foods sf ON sf.id = fsl.sighi_food_id";
}

function sighi_payload(array $row): array
{
    return [
        'sighi_id' => $row['sighi_id'] === null ? null : (int) $row['sighi_id'],
        'sighi_food' => $row['sighi_food'] ?? null,
        'sighi_score_raw' => $row['sighi_score_raw'] ?? null,
        'sighi_score' => $row['sighi_score'] === null ? null : (int) $row['sighi_score'],
        'histamine_marker' => $row['histamine_marker'] ?? null,
        'other_amines_marker' => $row['other_amines_marker'] ?? null,
        'liberator_marker' => $row['liberator_marker'] ?? null,
        'inhibitor_marker' => $row['inhibitor_marker'] ?? null,
        'uncertain_marker' => $row['uncertain_marker'] ?? null,
        'other_marker' => $row['other_marker'] ?? null,
        'sighi_notes' => $row['sighi_notes'] ?? null,
        'sighi_approved' => $row['sighi_approved'] === null ? null : (int) $row['sighi_approved'],
        'sighi_confidence' => $row['sighi_confidence'] === null ? null : (int) $row['sighi_confidence'],
        'sighi_match_method' => $row['sighi_match_method'] ?? null,
    ];
}
