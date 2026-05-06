-- FoodLife default portions for easier meal entry.
-- Import after NutriDatabaze foods. Values are practical estimates, not exact lab data.

SET NAMES utf8mb4;

UPDATE `foods`
SET `default_unit` = 'g',
    `serving_grams` = NULL
WHERE `external_source` = 'NutriDatabaze-v10.25';

-- Fruit, edible portion.
UPDATE `foods` SET `default_unit` = 'ks', `serving_grams` = 150 WHERE `external_source` = 'NutriDatabaze-v10.25' AND `name_cs` LIKE 'Banán%';
UPDATE `foods` SET `default_unit` = 'ks', `serving_grams` = 150 WHERE `external_source` = 'NutriDatabaze-v10.25' AND `name_cs` LIKE 'Jablk%';
UPDATE `foods` SET `default_unit` = 'ks', `serving_grams` = 140 WHERE `external_source` = 'NutriDatabaze-v10.25' AND `name_cs` LIKE 'Hrušk%';
UPDATE `foods` SET `default_unit` = 'ks', `serving_grams` = 130 WHERE `external_source` = 'NutriDatabaze-v10.25' AND `name_cs` LIKE 'Pomeranč%';
UPDATE `foods` SET `default_unit` = 'ks', `serving_grams` = 90 WHERE `external_source` = 'NutriDatabaze-v10.25' AND `name_cs` LIKE 'Mandarink%';
UPDATE `foods` SET `default_unit` = 'ks', `serving_grams` = 80 WHERE `external_source` = 'NutriDatabaze-v10.25' AND `name_cs` LIKE 'Kiwi%';
UPDATE `foods` SET `default_unit` = 'ks', `serving_grams` = 200 WHERE `external_source` = 'NutriDatabaze-v10.25' AND `name_cs` LIKE 'Grapefruit%';
UPDATE `foods` SET `default_unit` = 'ks', `serving_grams` = 70 WHERE `external_source` = 'NutriDatabaze-v10.25' AND `name_cs` LIKE 'Brosk%';
UPDATE `foods` SET `default_unit` = 'ks', `serving_grams` = 65 WHERE `external_source` = 'NutriDatabaze-v10.25' AND `name_cs` LIKE 'Meruňk%';
UPDATE `foods` SET `default_unit` = 'ks', `serving_grams` = 60 WHERE `external_source` = 'NutriDatabaze-v10.25' AND `name_cs` LIKE 'Švestk%';

-- Common single-piece foods.
UPDATE `foods` SET `default_unit` = 'ks', `serving_grams` = 50 WHERE `external_source` = 'NutriDatabaze-v10.25' AND `name_cs` LIKE 'Vejce%';
UPDATE `foods` SET `default_unit` = 'ks', `serving_grams` = 45 WHERE `external_source` = 'NutriDatabaze-v10.25' AND `name_cs` LIKE 'Rohlík%';
UPDATE `foods` SET `default_unit` = 'ks', `serving_grams` = 60 WHERE `external_source` = 'NutriDatabaze-v10.25' AND `name_cs` LIKE 'Housk%';
UPDATE `foods` SET `default_unit` = 'plátek', `serving_grams` = 40 WHERE `external_source` = 'NutriDatabaze-v10.25' AND `name_cs` LIKE 'Chléb%';
UPDATE `foods` SET `default_unit` = 'plátek', `serving_grams` = 25 WHERE `external_source` = 'NutriDatabaze-v10.25' AND `name_cs` LIKE 'Sýr%' AND `name_cs` NOT LIKE '%strouhan%';
UPDATE `foods` SET `default_unit` = 'plátek', `serving_grams` = 20 WHERE `external_source` = 'NutriDatabaze-v10.25' AND (`name_cs` LIKE 'Šunka%' OR `name_cs` LIKE 'Salám%');

-- Typical servings.
UPDATE `foods` SET `default_unit` = 'porce', `serving_grams` = 150 WHERE `external_source` = 'NutriDatabaze-v10.25' AND `name_cs` LIKE 'Rýže%' AND `name_cs` NOT LIKE '%syrov%';
UPDATE `foods` SET `default_unit` = 'porce', `serving_grams` = 180 WHERE `external_source` = 'NutriDatabaze-v10.25' AND `name_cs` LIKE 'Těstovin%' AND `name_cs` NOT LIKE '%syrov%';
UPDATE `foods` SET `default_unit` = 'porce', `serving_grams` = 200 WHERE `external_source` = 'NutriDatabaze-v10.25' AND `name_cs` LIKE 'Brambor%';
UPDATE `foods` SET `default_unit` = 'porce', `serving_grams` = 150 WHERE `external_source` = 'NutriDatabaze-v10.25' AND `name_cs` LIKE 'Jogurt%';
UPDATE `foods` SET `default_unit` = 'porce', `serving_grams` = 50 WHERE `external_source` = 'NutriDatabaze-v10.25' AND `name_cs` LIKE 'Ovesn%';
UPDATE `foods` SET `default_unit` = 'porce', `serving_grams` = 120 WHERE `external_source` = 'NutriDatabaze-v10.25' AND (`name_cs` LIKE 'Kuřec%' OR `name_cs` LIKE 'Krůt%');
UPDATE `foods` SET `default_unit` = 'porce', `serving_grams` = 150 WHERE `external_source` = 'NutriDatabaze-v10.25' AND (`name_cs` LIKE '%ryba%' OR `name_cs` LIKE 'Losos%' OR `name_cs` LIKE 'Tresk%');

-- Drinks.
UPDATE `foods` SET `default_unit` = 'ml', `serving_grams` = 250 WHERE `external_source` = 'NutriDatabaze-v10.25' AND (`name_cs` LIKE 'Voda%' OR `name_cs` LIKE 'Čaj%' OR `name_cs` LIKE 'Káva%');
UPDATE `foods` SET `default_unit` = 'ml', `serving_grams` = 250 WHERE `external_source` = 'NutriDatabaze-v10.25' AND (`name_cs` LIKE 'Mléko%' OR `name_cs` LIKE 'Džus%' OR `name_cs` LIKE 'Nápoj%');
