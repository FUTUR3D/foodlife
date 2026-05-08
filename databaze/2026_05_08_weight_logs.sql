CREATE TABLE IF NOT EXISTS `weight_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `log_date` date NOT NULL,
  `weight` decimal(5,2) NOT NULL,
  `note` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_weight_day` (`user_id`,`log_date`),
  KEY `idx_weight_logs_user_date` (`user_id`,`log_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_czech_ci;

ALTER TABLE `weight_logs`
  ADD COLUMN IF NOT EXISTS `note` varchar(255) DEFAULT NULL AFTER `weight`;

ALTER TABLE `weight_logs`
  ADD COLUMN IF NOT EXISTS `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() AFTER `created_at`;
