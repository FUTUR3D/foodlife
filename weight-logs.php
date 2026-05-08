<?php
require 'api-helpers.php';

$userId = require_json_user();

function ensure_weight_logs_table(PDO $pdo): void
{
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS weight_logs (
            id int(11) NOT NULL AUTO_INCREMENT,
            user_id int(11) NOT NULL,
            log_date date NOT NULL,
            weight decimal(5,2) NOT NULL,
            note varchar(255) DEFAULT NULL,
            created_at timestamp NULL DEFAULT current_timestamp(),
            updated_at timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
            PRIMARY KEY (id),
            UNIQUE KEY unique_user_weight_day (user_id, log_date),
            KEY idx_weight_logs_user_date (user_id, log_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_czech_ci
    ');

    $pdo->exec('ALTER TABLE weight_logs ADD COLUMN IF NOT EXISTS note varchar(255) DEFAULT NULL AFTER weight');
    $pdo->exec('ALTER TABLE weight_logs ADD COLUMN IF NOT EXISTS updated_at timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() AFTER created_at');
}

function decimal_text($value): string
{
    return rtrim(rtrim((string) $value, '0'), '.');
}

function clean_weight_value($value): ?float
{
    $raw = trim((string) $value);
    if ($raw === '') {
        return null;
    }

    $weight = (float) str_replace(',', '.', $raw);
    if (!is_finite($weight) || $weight < 1 || $weight > 500) {
        return null;
    }

    return round($weight, 2);
}

function clean_note_value($value): ?string
{
    $note = trim((string) $value);
    if ($note === '') {
        return null;
    }

    if (function_exists('mb_substr')) {
        return mb_substr($note, 0, 255);
    }

    return substr($note, 0, 255);
}

try {
    ensure_weight_logs_table($pdo);

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = read_json_body();
        $date = valid_date_or_today($data['date'] ?? null);
        $weight = clean_weight_value($data['weight'] ?? '');
        $note = clean_note_value($data['note'] ?? '');

        if ($weight === null) {
            json_error('invalid_weight');
        }

        $stmt = $pdo->prepare('
            INSERT INTO weight_logs (user_id, log_date, weight, note)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                weight = VALUES(weight),
                note = VALUES(note),
                updated_at = current_timestamp()
        ');
        $stmt->execute([$userId, $date, $weight, $note]);
    }

    $endDate = valid_date_or_today($_GET['end_date'] ?? null);
    $days = isset($_GET['days']) ? (int) $_GET['days'] : 370;
    $days = max(7, min(730, $days));

    $start = new DateTime($endDate);
    $start->modify('-' . ($days - 1) . ' days');
    $startDate = $start->format('Y-m-d');

    $stmt = $pdo->prepare('
        SELECT id, log_date, weight, note, created_at, updated_at
        FROM weight_logs
        WHERE user_id = ? AND log_date BETWEEN ? AND ?
        ORDER BY log_date ASC
    ');
    $stmt->execute([$userId, $startDate, $endDate]);

    $logs = array_map(static function ($row) {
        return [
            'id' => (int) $row['id'],
            'date' => $row['log_date'],
            'weight' => decimal_text($row['weight']),
            'note' => $row['note'] ?? '',
            'created_at' => $row['created_at'] ?? '',
            'updated_at' => $row['updated_at'] ?? '',
        ];
    }, $stmt->fetchAll());

    echo json_encode([
        'ok' => true,
        'startDate' => $startDate,
        'endDate' => $endDate,
        'logs' => $logs,
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    log_error('weight-logs.php exception: ' . $e->getMessage());
    json_error('weight_logs_failed', 500);
}
