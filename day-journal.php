<?php
require 'api-helpers.php';

$userId = require_json_user();

function ensure_day_journals_table(PDO $pdo): void
{
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS day_journals (
            id int(11) NOT NULL AUTO_INCREMENT,
            user_id int(11) NOT NULL,
            journal_date date NOT NULL,
            title varchar(160) DEFAULT NULL,
            content_html mediumtext,
            content_text text,
            created_at timestamp NOT NULL DEFAULT current_timestamp(),
            updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
            PRIMARY KEY (id),
            UNIQUE KEY unique_user_journal_day (user_id, journal_date),
            KEY idx_day_journals_user_date (user_id, journal_date),
            CONSTRAINT day_journals_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ');
}

function clean_journal_title($value): ?string
{
    $title = trim((string) $value);
    if ($title === '') {
        return null;
    }

    if (function_exists('mb_substr')) {
        return mb_substr($title, 0, 160);
    }

    return substr($title, 0, 160);
}

function clean_journal_text($value): ?string
{
    $text = trim((string) $value);
    return $text === '' ? null : $text;
}

function clean_journal_html($value): ?string
{
    $html = trim((string) $value);
    if ($html === '') {
        return null;
    }

    if (strlen($html) > 5 * 1024 * 1024) {
        json_error('journal_too_large', 413);
    }

    $allowedTags = '<p><br><strong><b><em><i><u><h3><ul><ol><li><blockquote><figure><figcaption><img>';
    $html = strip_tags($html, $allowedTags);
    $html = preg_replace('/\son\w+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)/i', '', $html);
    $html = preg_replace('/\sstyle\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)/i', '', $html);
    $html = preg_replace('/\s(href|src)\s*=\s*([\'"])\s*javascript:[^\'"]*\2/i', ' $1="#"', $html);

    return trim($html) === '' ? null : trim($html);
}

function journal_payload(?array $row, string $date): array
{
    if (!$row) {
        return [
            'date' => $date,
            'title' => '',
            'html' => '',
            'text' => '',
            'updated_at' => '',
        ];
    }

    return [
        'date' => $row['journal_date'],
        'title' => $row['title'] ?? '',
        'html' => $row['content_html'] ?? '',
        'text' => $row['content_text'] ?? '',
        'updated_at' => $row['updated_at'] ?? '',
    ];
}

try {
    ensure_day_journals_table($pdo);
    $requestDate = $_GET['date'] ?? null;

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = read_json_body();
        $date = valid_date_or_today($data['date'] ?? null);
        $requestDate = $date;
        $title = clean_journal_title($data['title'] ?? '');
        $html = clean_journal_html($data['html'] ?? '');
        $text = clean_journal_text($data['text'] ?? '');

        $stmt = $pdo->prepare('
            INSERT INTO day_journals (user_id, journal_date, title, content_html, content_text)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                title = VALUES(title),
                content_html = VALUES(content_html),
                content_text = VALUES(content_text),
                updated_at = current_timestamp()
        ');
        $stmt->execute([$userId, $date, $title, $html, $text]);
    }

    $date = valid_date_or_today($requestDate);
    $stmt = $pdo->prepare('
        SELECT journal_date, title, content_html, content_text, updated_at
        FROM day_journals
        WHERE user_id = ? AND journal_date = ?
        LIMIT 1
    ');
    $stmt->execute([$userId, $date]);

    echo json_encode([
        'ok' => true,
        'journal' => journal_payload($stmt->fetch() ?: null, $date),
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    log_error('day-journal.php exception: ' . $e->getMessage());
    json_error('journal_failed', 500);
}
