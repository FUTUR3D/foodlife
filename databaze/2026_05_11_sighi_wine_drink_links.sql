-- Doplnění ručních SIGHI vazeb pro vína z databáze nápojů.
-- Důvod: SIGHI má názvy jako "víno: červené", zatímco nápojová databáze má "Červené víno".
-- Jednoduché automatické párování podle názvu proto nemusí trefit konkrétní položku.

START TRANSACTION;

INSERT INTO `food_sighi_links` (`food_id`, `sighi_food_id`, `match_method`, `confidence`, `approved`, `note`)
SELECT f.`id`, sf.`id`, 'manual', 100, 1, 'Rucni mapovani napoju vino na SIGHI'
FROM `foods` f
JOIN (
  SELECT 'DRINK_CZ_0095' AS external_code, 'víno: červené' AS sighi_food
  UNION ALL SELECT 'DRINK_CZ_0096', 'víno: bílé'
  UNION ALL SELECT 'DRINK_CZ_0097', 'víno'
  UNION ALL SELECT 'DRINK_CZ_0098', 'šumivé víno'
  UNION ALL SELECT 'DRINK_CZ_0099', 'šumivé víno'
  UNION ALL SELECT 'DRINK_CZ_0100', 'šumivé víno'
  UNION ALL SELECT 'DRINK_CZ_0101', 'víno'
) map ON map.external_code = f.`external_code`
JOIN `sighi_foods` sf ON sf.`food` = map.sighi_food
WHERE f.`external_source` = 'all_drinks_nutrition_database_cz'
ON DUPLICATE KEY UPDATE
  `match_method` = VALUES(`match_method`),
  `confidence` = VALUES(`confidence`),
  `approved` = VALUES(`approved`),
  `note` = VALUES(`note`),
  `updated_at` = current_timestamp();

COMMIT;

