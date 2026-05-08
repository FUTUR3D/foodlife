-- FoodLife smart recipes foundation.
-- Import after foods/NutriDatabaze import. Safe to run repeatedly.

SET NAMES utf8mb4;

ALTER TABLE `recipes`
  ADD COLUMN IF NOT EXISTS `source` enum('system','user','ai') NOT NULL DEFAULT 'user' AFTER `user_id`,
  ADD COLUMN IF NOT EXISTS `recipe_key` varchar(120) DEFAULT NULL AFTER `source`,
  ADD COLUMN IF NOT EXISTS `cook_minutes` int(11) DEFAULT NULL AFTER `prep_minutes`,
  ADD COLUMN IF NOT EXISTS `difficulty` enum('easy','medium','hard') NOT NULL DEFAULT 'easy' AFTER `instructions`,
  ADD COLUMN IF NOT EXISTS `carb_level` enum('unknown','low','medium','high') NOT NULL DEFAULT 'unknown' AFTER `goal_type`,
  ADD COLUMN IF NOT EXISTS `digestion_score` tinyint(3) DEFAULT NULL AFTER `carb_level`,
  ADD COLUMN IF NOT EXISTS `protein_score` tinyint(3) DEFAULT NULL AFTER `digestion_score`,
  ADD COLUMN IF NOT EXISTS `ai_prompt` text DEFAULT NULL AFTER `protein_score`,
  ADD COLUMN IF NOT EXISTS `ai_model` varchar(80) DEFAULT NULL AFTER `ai_prompt`,
  ADD COLUMN IF NOT EXISTS `parent_recipe_id` int(11) DEFAULT NULL AFTER `ai_model`;

CREATE UNIQUE INDEX IF NOT EXISTS `uniq_recipe_key` ON `recipes` (`recipe_key`);
CREATE INDEX IF NOT EXISTS `idx_recipes_source` ON `recipes` (`source`);

CREATE TABLE IF NOT EXISTS `recipe_tags` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(80) NOT NULL,
  `label_cs` varchar(120) NOT NULL,
  `label_en` varchar(120) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_recipe_tag_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_czech_ci;

CREATE TABLE IF NOT EXISTS `recipe_tag_links` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `recipe_id` int(11) NOT NULL,
  `tag_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_recipe_tag_link` (`recipe_id`,`tag_id`),
  KEY `idx_recipe_tag_links_tag` (`tag_id`),
  CONSTRAINT `recipe_tag_links_recipe_fk` FOREIGN KEY (`recipe_id`) REFERENCES `recipes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `recipe_tag_links_tag_fk` FOREIGN KEY (`tag_id`) REFERENCES `recipe_tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_czech_ci;

CREATE TABLE IF NOT EXISTS `recipe_feedback` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `recipe_id` int(11) NOT NULL,
  `rating` tinyint(3) DEFAULT NULL,
  `bloating_level` tinyint(3) DEFAULT NULL,
  `energy_level` tinyint(3) DEFAULT NULL,
  `digestion_note` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_recipe_feedback_user` (`user_id`),
  KEY `idx_recipe_feedback_recipe` (`recipe_id`),
  CONSTRAINT `recipe_feedback_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `recipe_feedback_recipe_fk` FOREIGN KEY (`recipe_id`) REFERENCES `recipes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_czech_ci;

CREATE TABLE IF NOT EXISTS `recipe_substitutions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `recipe_id` int(11) NOT NULL,
  `original_food_id` int(11) NOT NULL,
  `replacement_food_id` int(11) NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_recipe_substitutions_recipe` (`recipe_id`),
  KEY `idx_recipe_substitutions_original` (`original_food_id`),
  KEY `idx_recipe_substitutions_replacement` (`replacement_food_id`),
  CONSTRAINT `recipe_substitutions_recipe_fk` FOREIGN KEY (`recipe_id`) REFERENCES `recipes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `recipe_substitutions_original_fk` FOREIGN KEY (`original_food_id`) REFERENCES `foods` (`id`) ON DELETE CASCADE,
  CONSTRAINT `recipe_substitutions_replacement_fk` FOREIGN KEY (`replacement_food_id`) REFERENCES `foods` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_czech_ci;

INSERT INTO `recipe_tags` (`code`, `label_cs`, `label_en`) VALUES
('weight_loss', 'hubnutí', 'weight loss'),
('high_protein', 'vysoký protein', 'high protein'),
('low_carb', 'nízkosacharidové', 'low carb'),
('digestive_comfort', 'šetří trávení', 'digestive comfort'),
('low_histamine', 'nízký histamin', 'low histamine'),
('low_fodmap', 'low FODMAP', 'low FODMAP'),
('quick', 'rychlé', 'quick'),
('warm_meal', 'teplé jídlo', 'warm meal'),
('vegetarian', 'vegetariánské', 'vegetarian'),
('evening_light', 'lehčí večeře', 'light dinner')
ON DUPLICATE KEY UPDATE
  `label_cs` = VALUES(`label_cs`),
  `label_en` = VALUES(`label_en`);

INSERT INTO `recipes` (`user_id`, `source`, `recipe_key`, `title`, `description`, `meal_type`, `servings`, `prep_minutes`, `cook_minutes`, `instructions`, `difficulty`, `is_public`, `goal_type`, `carb_level`, `digestion_score`, `protein_score`) VALUES
(NULL, 'system', 'sys_chicken_zucchini_bowl', 'Kuřecí miska s cuketou a rýží', 'Lehký oběd nebo večeře s vysokým podílem bílkovin a dobře upravitelnými sacharidy.', 'obed', 1, 10, 18, 'Kuřecí maso osol, opeč na pánvi, přidej cuketu a podávej s rýží. Pro hubnutí zmenši porci rýže a přidej zeleninu.', 'easy', 1, 'lose_weight', 'medium', 8, 9),
(NULL, 'system', 'sys_turkey_potato_plate', 'Krůtí talíř s bramborem a zeleninou', 'Jednoduché teplé jídlo pro stabilní energii bez těžkých omáček.', 'obed', 1, 10, 22, 'Krůtí maso opeč nebo upeč, brambory uvař a přidej jemnou zeleninu. Tuk drž nízko.', 'easy', 1, 'maintain_weight', 'medium', 8, 9),
(NULL, 'system', 'sys_salmon_potato_salad', 'Losos s bramborem a salátem', 'Syté jídlo s kvalitními tuky, vhodné pro oběd.', 'obed', 1, 10, 20, 'Lososa upeč, brambory uvař a podávej se salátem. Pokud vadí histamin, použij vždy velmi čerstvou rybu.', 'medium', 1, 'maintain_weight', 'medium', 6, 8),
(NULL, 'system', 'sys_egg_spinach_dinner', 'Vejce se špenátem a jogurtovým dipem', 'Rychlá nízkosacharidová večeře s bílkovinami.', 'vecere', 1, 6, 10, 'Vejce připrav na pánvi, přidej špenát a podávej s jogurtovým dipem. Večer drž přílohu malou nebo žádnou.', 'easy', 1, 'lose_weight', 'low', 8, 8),
(NULL, 'system', 'sys_cottage_berries_oats', 'Tvaroh s ovocem a ovesnými vločkami', 'Rychlá snídaně s bílkovinami, kterou lze snadno zmenšit nebo zvětšit.', 'snidane', 1, 5, 0, 'Smíchej tvaroh, ovoce a menší dávku vloček. Při hubnutí drž vločky okolo 30 g.', 'easy', 1, 'lose_weight', 'medium', 7, 8),
(NULL, 'system', 'sys_yogurt_banana_oats', 'Jogurt s banánem a vločkami', 'Jemná snídaně nebo svačina po pohybu.', 'snidane', 1, 4, 0, 'Jogurt promíchej s banánem a vločkami. Pro nižší sacharidy dej jen polovinu banánu.', 'easy', 1, 'maintain_weight', 'medium', 7, 6),
(NULL, 'system', 'sys_rice_chicken_carrot', 'Rýže s kuřetem a mrkví', 'Jednoduché jídlo pro citlivější trávení.', 'obed', 1, 8, 18, 'Uvař rýži, kuře připrav jednoduše na pánvi nebo ve vodě a přidej dušenou mrkev.', 'easy', 1, 'digestive_comfort', 'medium', 9, 8),
(NULL, 'system', 'sys_tuna_egg_salad', 'Salát s tuňákem a vejcem', 'Rychlé proteinové jídlo s nižší dávkou sacharidů.', 'vecere', 1, 8, 8, 'Uvař vejce, smíchej salát, tuňáka a jogurtový dresink. Pokud řešíš histamin, nahraď tuňáka čerstvým kuřetem.', 'easy', 1, 'lose_weight', 'low', 5, 9),
(NULL, 'system', 'sys_lentil_veg_bowl', 'Čočková miska se zeleninou', 'Syté vegetariánské jídlo s vlákninou.', 'obed', 1, 10, 20, 'Čočku uvař do měkka a přidej zeleninu. Pokud nadýmá, zmenši porci čočky a zkus ji dobře propláchnout.', 'easy', 1, 'maintain_weight', 'medium', 4, 6),
(NULL, 'system', 'sys_light_kefir_snack', 'Kefír s ovocem', 'Lehká svačina, která může podpořit příjem bílkovin.', 'svacina1', 1, 3, 0, 'Kefír nalij do misky nebo sklenice a přidej menší porci ovoce. Při citlivosti na laktózu nahraď bezlaktózovou variantou.', 'easy', 1, 'digestive_comfort', 'medium', 6, 5)
ON DUPLICATE KEY UPDATE
  `title` = VALUES(`title`),
  `description` = VALUES(`description`),
  `meal_type` = VALUES(`meal_type`),
  `servings` = VALUES(`servings`),
  `prep_minutes` = VALUES(`prep_minutes`),
  `cook_minutes` = VALUES(`cook_minutes`),
  `instructions` = VALUES(`instructions`),
  `difficulty` = VALUES(`difficulty`),
  `is_public` = VALUES(`is_public`),
  `goal_type` = VALUES(`goal_type`),
  `carb_level` = VALUES(`carb_level`),
  `digestion_score` = VALUES(`digestion_score`),
  `protein_score` = VALUES(`protein_score`);

DELETE ri FROM `recipe_items` ri JOIN `recipes` r ON r.id = ri.recipe_id WHERE r.source = 'system' AND r.recipe_key LIKE 'sys_%';
DELETE rmt FROM `recipe_meal_types` rmt JOIN `recipes` r ON r.id = rmt.recipe_id WHERE r.source = 'system' AND r.recipe_key LIKE 'sys_%';
DELETE rtl FROM `recipe_tag_links` rtl JOIN `recipes` r ON r.id = rtl.recipe_id WHERE r.source = 'system' AND r.recipe_key LIKE 'sys_%';

INSERT IGNORE INTO `recipe_meal_types` (`recipe_id`, `meal_type`) SELECT id, meal_type FROM `recipes` WHERE source = 'system' AND recipe_key LIKE 'sys_%';
INSERT IGNORE INTO `recipe_meal_types` (`recipe_id`, `meal_type`) SELECT id, 'vecere' FROM `recipes` WHERE recipe_key IN ('sys_chicken_zucchini_bowl','sys_turkey_potato_plate');
INSERT IGNORE INTO `recipe_meal_types` (`recipe_id`, `meal_type`) SELECT id, 'svacina1' FROM `recipes` WHERE recipe_key IN ('sys_cottage_berries_oats','sys_yogurt_banana_oats');
INSERT IGNORE INTO `recipe_meal_types` (`recipe_id`, `meal_type`) SELECT id, 'svacina2' FROM `recipes` WHERE recipe_key IN ('sys_cottage_berries_oats','sys_yogurt_banana_oats','sys_light_kefir_snack');

INSERT IGNORE INTO `recipe_tag_links` (`recipe_id`, `tag_id`)
SELECT r.id, rt.id FROM `recipes` r JOIN `recipe_tags` rt ON rt.code IN ('weight_loss','high_protein','quick') WHERE r.recipe_key IN ('sys_chicken_zucchini_bowl','sys_egg_spinach_dinner','sys_cottage_berries_oats','sys_tuna_egg_salad');
INSERT IGNORE INTO `recipe_tag_links` (`recipe_id`, `tag_id`)
SELECT r.id, rt.id FROM `recipes` r JOIN `recipe_tags` rt ON rt.code IN ('digestive_comfort','quick') WHERE r.recipe_key IN ('sys_rice_chicken_carrot','sys_light_kefir_snack');
INSERT IGNORE INTO `recipe_tag_links` (`recipe_id`, `tag_id`)
SELECT r.id, rt.id FROM `recipes` r JOIN `recipe_tags` rt ON rt.code IN ('warm_meal','high_protein') WHERE r.recipe_key IN ('sys_chicken_zucchini_bowl','sys_turkey_potato_plate','sys_salmon_potato_salad','sys_rice_chicken_carrot');
INSERT IGNORE INTO `recipe_tag_links` (`recipe_id`, `tag_id`)
SELECT r.id, rt.id FROM `recipes` r JOIN `recipe_tags` rt ON rt.code IN ('low_carb','evening_light') WHERE r.recipe_key IN ('sys_egg_spinach_dinner','sys_tuna_egg_salad');
INSERT IGNORE INTO `recipe_tag_links` (`recipe_id`, `tag_id`)
SELECT r.id, rt.id FROM `recipes` r JOIN `recipe_tags` rt ON rt.code IN ('vegetarian') WHERE r.recipe_key IN ('sys_lentil_veg_bowl','sys_cottage_berries_oats','sys_yogurt_banana_oats','sys_light_kefir_snack');

-- Recipe ingredients are linked to existing foods by Czech name patterns. Missing foods simply skip that ingredient.
INSERT INTO `recipe_items` (`recipe_id`, `food_id`, `amount`, `unit`, `grams`, `note`, `sort_order`)
SELECT r.id, f.id, x.amount, x.unit, x.grams, x.note, x.sort_order
FROM (
  SELECT 'sys_chicken_zucchini_bowl' recipe_key, 'Kuřec%' pattern, 140 amount, 'g' unit, 140 grams, 'kuřecí prsa nebo libové kuřecí maso' note, 1 sort_order UNION ALL
  SELECT 'sys_chicken_zucchini_bowl', 'Cuket%', 200, 'g', 200, 'jemně opečená', 2 UNION ALL
  SELECT 'sys_chicken_zucchini_bowl', 'Rýže%', 120, 'g', 120, 'uvařená, pro hubnutí lze snížit', 3 UNION ALL
  SELECT 'sys_turkey_potato_plate', 'Krůt%', 150, 'g', 150, 'libové maso', 1 UNION ALL
  SELECT 'sys_turkey_potato_plate', 'Brambor%', 180, 'g', 180, 'vařené', 2 UNION ALL
  SELECT 'sys_turkey_potato_plate', 'Mrkev%', 120, 'g', 120, 'dušená', 3 UNION ALL
  SELECT 'sys_salmon_potato_salad', 'Losos%', 140, 'g', 140, 'čerstvý', 1 UNION ALL
  SELECT 'sys_salmon_potato_salad', 'Brambor%', 160, 'g', 160, 'vařené', 2 UNION ALL
  SELECT 'sys_salmon_potato_salad', 'Salát%', 100, 'g', 100, 'čerstvá zelenina', 3 UNION ALL
  SELECT 'sys_egg_spinach_dinner', 'Vejce%', 2, 'ks', 100, '2 kusy', 1 UNION ALL
  SELECT 'sys_egg_spinach_dinner', 'Špenát%', 150, 'g', 150, 'krátce podušený', 2 UNION ALL
  SELECT 'sys_egg_spinach_dinner', 'Jogurt%', 80, 'g', 80, 'dip', 3 UNION ALL
  SELECT 'sys_cottage_berries_oats', 'Tvaroh%', 180, 'g', 180, 'polotučný nebo nízkotučný', 1 UNION ALL
  SELECT 'sys_cottage_berries_oats', 'Ovesn%', 30, 'g', 30, 'vločky', 2 UNION ALL
  SELECT 'sys_cottage_berries_oats', 'Jahod%', 80, 'g', 80, 'nebo jiné ovoce', 3 UNION ALL
  SELECT 'sys_yogurt_banana_oats', 'Jogurt%', 180, 'g', 180, 'bílý', 1 UNION ALL
  SELECT 'sys_yogurt_banana_oats', 'Banán%', 80, 'g', 80, 'menší porce', 2 UNION ALL
  SELECT 'sys_yogurt_banana_oats', 'Ovesn%', 30, 'g', 30, 'vločky', 3 UNION ALL
  SELECT 'sys_rice_chicken_carrot', 'Rýže%', 140, 'g', 140, 'uvařená', 1 UNION ALL
  SELECT 'sys_rice_chicken_carrot', 'Kuřec%', 130, 'g', 130, 'jednoduše připravené', 2 UNION ALL
  SELECT 'sys_rice_chicken_carrot', 'Mrkev%', 140, 'g', 140, 'dušená', 3 UNION ALL
  SELECT 'sys_tuna_egg_salad', 'Tuňák%', 100, 'g', 100, 've vlastní šťávě', 1 UNION ALL
  SELECT 'sys_tuna_egg_salad', 'Vejce%', 1, 'ks', 50, 'vařené', 2 UNION ALL
  SELECT 'sys_tuna_egg_salad', 'Salát%', 160, 'g', 160, 'listová zelenina', 3 UNION ALL
  SELECT 'sys_lentil_veg_bowl', 'Čočk%', 160, 'g', 160, 'uvařená', 1 UNION ALL
  SELECT 'sys_lentil_veg_bowl', 'Mrkev%', 100, 'g', 100, 'dušená', 2 UNION ALL
  SELECT 'sys_lentil_veg_bowl', 'Rýže%', 80, 'g', 80, 'volitelná menší příloha', 3 UNION ALL
  SELECT 'sys_light_kefir_snack', 'Kefír%', 250, 'ml', 250, 'bez cukru', 1 UNION ALL
  SELECT 'sys_light_kefir_snack', 'Jahod%', 80, 'g', 80, 'nebo borůvky', 2
) x
JOIN `recipes` r ON r.recipe_key = x.recipe_key
JOIN `foods` f ON f.id = (
  SELECT f2.id
  FROM `foods` f2
  WHERE f2.name_cs LIKE x.pattern
  ORDER BY CASE WHEN f2.source = 'user' THEN 1 ELSE 0 END, f2.name_cs ASC
  LIMIT 1
);