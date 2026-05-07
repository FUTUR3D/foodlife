<?php
require 'api-helpers.php';

$userId = require_json_user();

function ensure_user_profiles_table(PDO $pdo): void
{
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS user_profiles (
            user_id int(11) NOT NULL,
            full_name varchar(120) DEFAULT NULL,
            birth_date date DEFAULT NULL,
            weight_kg decimal(5,2) DEFAULT NULL,
            height_cm decimal(5,2) DEFAULT NULL,
            gender varchar(40) DEFAULT NULL,
            country_code char(2) DEFAULT NULL,
            origin_place varchar(120) DEFAULT NULL,
            body_type varchar(60) DEFAULT NULL,
            created_at timestamp NOT NULL DEFAULT current_timestamp(),
            updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
            PRIMARY KEY (user_id),
            CONSTRAINT user_profiles_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_czech_ci
    ');

    $pdo->exec('
        ALTER TABLE user_profiles
        ADD COLUMN IF NOT EXISTS country_code char(2) DEFAULT NULL AFTER gender
    ');
}

function decimal_to_text($value): string
{
    if ($value === null || $value === '') {
        return '';
    }

    return rtrim(rtrim((string) $value, '0'), '.');
}

function profile_from_row(?array $row, string $email): array
{
    if (!$row) {
        return [
            'name' => '',
            'email' => $email,
            'birthDate' => '',
            'weight' => '',
            'height' => '',
            'gender' => '',
            'countryCode' => '',
            'bodyType' => '',
        ];
    }

    return [
        'name' => $row['full_name'] ?? '',
        'email' => $email,
        'birthDate' => $row['birth_date'] ?? '',
        'weight' => decimal_to_text($row['weight_kg'] ?? ''),
        'height' => decimal_to_text($row['height_cm'] ?? ''),
        'gender' => $row['gender'] ?? '',
        'countryCode' => $row['country_code'] ?? '',
        'bodyType' => $row['body_type'] ?? '',
    ];
}

function is_complete_profile(array $profile): bool
{
    foreach (['name', 'birthDate', 'weight', 'height', 'gender', 'countryCode', 'bodyType'] as $field) {
        if (trim((string) ($profile[$field] ?? '')) === '') {
            return false;
        }
    }

    return true;
}

function clean_text(array $data, string $key, int $maxLength): string
{
    $value = trim((string) ($data[$key] ?? ''));
    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $maxLength);
    }

    return substr($value, 0, $maxLength);
}

function clean_decimal(array $data, string $key, float $min, float $max): ?float
{
    $raw = trim((string) ($data[$key] ?? ''));
    if ($raw === '') {
        return null;
    }

    $value = (float) str_replace(',', '.', $raw);
    if (!is_finite($value) || $value < $min || $value > $max) {
        return null;
    }

    return $value;
}

function clean_birth_date(array $data): string
{
    $date = trim((string) ($data['birthDate'] ?? ''));
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        return '';
    }

    [$year, $month, $day] = array_map('intval', explode('-', $date));
    if (!checkdate($month, $day, $year)) {
        return '';
    }

    return $date;
}

function clean_country_code(array $data): string
{
    $code = strtoupper(trim((string) ($data['countryCode'] ?? '')));
    return preg_match('/^[A-Z]{2}$/', $code) ? $code : '';
}

try {
    ensure_user_profiles_table($pdo);

    $userStmt = $pdo->prepare('SELECT email FROM users WHERE id = ?');
    $userStmt->execute([$userId]);
    $user = $userStmt->fetch();

    if (!$user) {
        json_error('user_not_found', 404);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = read_json_body();
        $profile = [
            'name' => clean_text($data, 'name', 120),
            'birthDate' => clean_birth_date($data),
            'weight' => clean_decimal($data, 'weight', 1, 500),
            'height' => clean_decimal($data, 'height', 1, 300),
            'gender' => clean_text($data, 'gender', 40),
            'countryCode' => clean_country_code($data),
            'bodyType' => clean_text($data, 'bodyType', 60),
        ];

        if (!is_complete_profile($profile)) {
            json_error('profile_incomplete');
        }

        $stmt = $pdo->prepare('
            INSERT INTO user_profiles (
                user_id,
                full_name,
                birth_date,
                weight_kg,
                height_cm,
                gender,
                country_code,
                origin_place,
                body_type
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)
            ON DUPLICATE KEY UPDATE
                full_name = VALUES(full_name),
                birth_date = VALUES(birth_date),
                weight_kg = VALUES(weight_kg),
                height_cm = VALUES(height_cm),
                gender = VALUES(gender),
                country_code = VALUES(country_code),
                origin_place = VALUES(origin_place),
                body_type = VALUES(body_type),
                updated_at = current_timestamp()
        ');
        $stmt->execute([
            $userId,
            $profile['name'],
            $profile['birthDate'],
            $profile['weight'],
            $profile['height'],
            $profile['gender'],
            $profile['countryCode'],
            $profile['bodyType'],
        ]);
    }

    $stmt = $pdo->prepare('SELECT * FROM user_profiles WHERE user_id = ?');
    $stmt->execute([$userId]);
    $profile = profile_from_row($stmt->fetch() ?: null, $user['email']);

    echo json_encode([
        'ok' => true,
        'profile' => $profile,
        'profileCompleted' => is_complete_profile($profile),
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    log_error('user-profile.php exception: ' . $e->getMessage());
    json_error('profile_failed', 500);
}
