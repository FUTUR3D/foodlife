<?php
require_once 'api-helpers.php';

function ensure_recipe_tables(PDO $pdo): void
{
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS recipes (
            id int(11) NOT NULL AUTO_INCREMENT,
            user_id int(11) DEFAULT NULL,
            title varchar(255) NOT NULL,
            description text DEFAULT NULL,
            meal_type varchar(50) DEFAULT NULL,
            servings decimal(6,2) NOT NULL DEFAULT 1.00,
            prep_minutes int(11) DEFAULT NULL,
            instructions text DEFAULT NULL,
            is_public tinyint(1) NOT NULL DEFAULT 0,
            goal_type enum("none","lose_weight","maintain_weight","gain_weight","digestive_comfort","low_fodmap","low_histamine") NOT NULL DEFAULT "none",
            created_at timestamp NULL DEFAULT current_timestamp(),
            updated_at timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
            PRIMARY KEY (id),
            KEY idx_recipes_user (user_id),
            KEY idx_recipes_meal_type (meal_type),
            KEY idx_recipes_goal (goal_type),
            CONSTRAINT recipes_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_czech_ci
    ');

    $pdo->exec('
        CREATE TABLE IF NOT EXISTS recipe_items (
            id int(11) NOT NULL AUTO_INCREMENT,
            recipe_id int(11) NOT NULL,
            food_id int(11) DEFAULT NULL,
            custom_name varchar(255) DEFAULT NULL,
            amount decimal(10,2) NOT NULL,
            unit varchar(30) NOT NULL DEFAULT "g",
            grams decimal(10,2) DEFAULT NULL,
            note varchar(255) DEFAULT NULL,
            sort_order int(11) NOT NULL DEFAULT 0,
            PRIMARY KEY (id),
            KEY idx_recipe_items_recipe (recipe_id),
            KEY idx_recipe_items_food (food_id),
            CONSTRAINT recipe_items_ibfk_1 FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE,
            CONSTRAINT recipe_items_ibfk_2 FOREIGN KEY (food_id) REFERENCES foods (id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_czech_ci
    ');

    $pdo->exec('ALTER TABLE recipe_items ADD COLUMN IF NOT EXISTS custom_name varchar(255) DEFAULT NULL AFTER food_id');
    $pdo->exec('ALTER TABLE recipe_items MODIFY food_id int(11) DEFAULT NULL');

    $pdo->exec('
        CREATE TABLE IF NOT EXISTS recipe_meal_types (
            id int(11) NOT NULL AUTO_INCREMENT,
            recipe_id int(11) NOT NULL,
            meal_type varchar(50) NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uniq_recipe_meal_type (recipe_id, meal_type),
            KEY idx_recipe_meal_types_type (meal_type),
            CONSTRAINT recipe_meal_types_ibfk_1 FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_czech_ci
    ');

    $pdo->exec('
        INSERT IGNORE INTO recipe_meal_types (recipe_id, meal_type)
        SELECT id, meal_type
        FROM recipes
        WHERE meal_type IS NOT NULL AND meal_type <> ""
    ');
}

function valid_meal_type(string $mealType): string
{
    $mealType = trim($mealType);
    $allowed = ['snidane', 'svacina1', 'obed', 'svacina2', 'vecere', 'piti', 'ostatni'];
    return in_array($mealType, $allowed, true) ? $mealType : 'ostatni';
}

function valid_meal_types(array $mealTypes): array
{
    $allowed = ['snidane', 'svacina1', 'obed', 'svacina2', 'vecere', 'piti', 'ostatni'];
    $valid = [];

    foreach ($mealTypes as $mealType) {
        $mealType = trim((string) $mealType);
        if (in_array($mealType, $allowed, true) && !in_array($mealType, $valid, true)) {
            $valid[] = $mealType;
        }
    }

    return $valid;
}
