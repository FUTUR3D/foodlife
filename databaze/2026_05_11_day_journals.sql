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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
