-- Profil uživatele pro první nastavení po registraci.
-- Lze importovat opakovaně.

CREATE TABLE IF NOT EXISTS `user_profiles` (
  `user_id` int(11) NOT NULL,
  `full_name` varchar(120) DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `weight_kg` decimal(5,2) DEFAULT NULL,
  `height_cm` decimal(5,2) DEFAULT NULL,
  `gender` varchar(40) DEFAULT NULL,
  `origin_place` varchar(120) DEFAULT NULL,
  `body_type` varchar(60) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`user_id`),
  CONSTRAINT `user_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_czech_ci;
