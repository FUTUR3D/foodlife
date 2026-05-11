<?php
require 'api-helpers.php';

$userId = require_json_user();

function ensure_day_health_logs_table(PDO $pdo): void
{
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS day_health_logs (
            id int(11) NOT NULL AUTO_INCREMENT,
            user_id int(11) NOT NULL,
            log_date date NOT NULL,
            toilet_entries mediumtext,
            mood_entries mediumtext,
            reactions mediumtext,
            created_at timestamp NOT NULL DEFAULT current_timestamp(),
            updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
            PRIMARY KEY (id),
            UNIQUE KEY unique_user_health_day (user_id, log_date),
            KEY idx_day_health_logs_user_date (user_id, log_date),
            CONSTRAINT day_health_logs_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ');
}

function clean_json_array($value): array
{
    if (!is_array($value)) {
        return [];
    }

    $encoded = json_encode($value, JSON_UNESCAPED_UNICODE);
    if ($encoded === false) {
        return [];
    }

    if (strlen($encoded) > 1024 * 1024) {
        json_error('health_log_too_large', 413);
    }

    $decoded = json_decode($encoded, true);
    return is_array($decoded) ? $decoded : [];
}

function json_array_text(array $value): string
{
    return json_encode($value, JSON_UNESCAPED_UNICODE);
}

function decode_json_array($value): array
{
    $decoded = json_decode((string) $value, true);
    return is_array($decoded) ? $decoded : [];
}

function day_health_payload(?array $row, string $date): array
{
    if (!$row) {
        return [
            'exists' => false,
            'date' => $date,
            'toiletEntries' => [],
            'moodEntries' => [],
            'reactions' => [],
            'updated_at' => '',
        ];
    }

    return [
        'exists' => true,
        'date' => $row['log_date'],
        'toiletEntries' => decode_json_array($row['toilet_entries'] ?? '[]'),
        'moodEntries' => decode_json_array($row['mood_entries'] ?? '[]'),
        'reactions' => decode_json_array($row['reactions'] ?? '[]'),
        'updated_at' => $row['updated_at'] ?? '',
    ];
}

try {
    ensure_day_health_logs_table($pdo);
    $requestDate = $_GET['date'] ?? null;

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = read_json_body();
        $date = valid_date_or_today($data['date'] ?? null);
        $requestDate = $date;

        $toiletEntries = clean_json_array($data['toiletEntries'] ?? []);
        $moodEntries = clean_json_array($data['moodEntries'] ?? []);
        $reactions = clean_json_array($data['reactions'] ?? []);

        $stmt = $pdo->prepare('
            INSERT INTO day_health_logs (user_id, log_date, toilet_entries, mood_entries, reactions)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                toilet_entries = VALUES(toilet_entries),
                mood_entries = VALUES(mood_entries),
                reactions = VALUES(reactions),
                updated_at = current_timestamp()
        ');
        $stmt->execute([
            $userId,
            $date,
            json_array_text($toiletEntries),
            json_array_text($moodEntries),
            json_array_text($reactions),
        ]);
    }

    $date = valid_date_or_today($requestDate);
    $stmt = $pdo->prepare('
        SELECT log_date, toilet_entries, mood_entries, reactions, updated_at
        FROM day_health_logs
        WHERE user_id = ? AND log_date = ?
        LIMIT 1
    ');
    $stmt->execute([$userId, $date]);

    echo json_encode([
        'ok' => true,
        'health' => day_health_payload($stmt->fetch() ?: null, $date),
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    log_error('day-health.php exception: ' . $e->getMessage());
    json_error('day_health_failed', 500);
}
