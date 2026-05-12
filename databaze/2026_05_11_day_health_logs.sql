CREATE TABLE IF NOT EXISTS day_health_logs (
    id int(11) NOT NULL AUTO_INCREMENT,
    user_id int(11) NOT NULL,
    log_date date NOT NULL,
    exercise_entries mediumtext,
    toilet_entries mediumtext,
    mood_entries mediumtext,
    reactions mediumtext,
    created_at timestamp NOT NULL DEFAULT current_timestamp(),
    updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id),
    UNIQUE KEY unique_user_health_day (user_id, log_date),
    KEY idx_day_health_logs_user_date (user_id, log_date),
    CONSTRAINT day_health_logs_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
