-- Multiple day-part tags for saved FoodLife recipes.
-- Safe to run repeatedly.

CREATE TABLE IF NOT EXISTS `recipe_meal_types` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `recipe_id` int(11) NOT NULL,
  `meal_type` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_recipe_meal_type` (`recipe_id`,`meal_type`),
  KEY `idx_recipe_meal_types_type` (`meal_type`),
  CONSTRAINT `recipe_meal_types_ibfk_1` FOREIGN KEY (`recipe_id`) REFERENCES `recipes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_czech_ci;

INSERT IGNORE INTO `recipe_meal_types` (`recipe_id`, `meal_type`)
SELECT `id`, `meal_type`
FROM `recipes`
WHERE `meal_type` IS NOT NULL AND `meal_type` <> '';
