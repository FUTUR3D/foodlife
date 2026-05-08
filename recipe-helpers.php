<?php
require_once 'api-helpers.php';

function ensure_recipe_tables(PDO $pdo): void
{
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS recipes (
            id int(11) NOT NULL AUTO_INCREMENT,
            user_id int(11) DEFAULT NULL,
            source enum("system","user","ai") NOT NULL DEFAULT "user",
            recipe_key varchar(120) DEFAULT NULL,
            title varchar(255) NOT NULL,
            description text DEFAULT NULL,
            meal_type varchar(50) DEFAULT NULL,
            servings decimal(6,2) NOT NULL DEFAULT 1.00,
            prep_minutes int(11) DEFAULT NULL,
            cook_minutes int(11) DEFAULT NULL,
            instructions text DEFAULT NULL,
            difficulty enum("easy","medium","hard") NOT NULL DEFAULT "easy",
            is_public tinyint(1) NOT NULL DEFAULT 0,
            goal_type enum("none","lose_weight","maintain_weight","gain_weight","digestive_comfort","low_fodmap","low_histamine") NOT NULL DEFAULT "none",
            carb_level enum("unknown","low","medium","high") NOT NULL DEFAULT "unknown",
            digestion_score tinyint(3) DEFAULT NULL,
            protein_score tinyint(3) DEFAULT NULL,
            ai_prompt text DEFAULT NULL,
            ai_model varchar(80) DEFAULT NULL,
            parent_recipe_id int(11) DEFAULT NULL,
            created_at timestamp NULL DEFAULT current_timestamp(),
            updated_at timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
            PRIMARY KEY (id),
            UNIQUE KEY uniq_recipe_key (recipe_key),
            KEY idx_recipes_user (user_id),
            KEY idx_recipes_source (source),
            KEY idx_recipes_meal_type (meal_type),
            KEY idx_recipes_goal (goal_type),
            KEY idx_recipes_parent (parent_recipe_id),
            CONSTRAINT recipes_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
            CONSTRAINT recipes_parent_fk FOREIGN KEY (parent_recipe_id) REFERENCES recipes (id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_czech_ci
    ');

    $pdo->exec('ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source enum("system","user","ai") NOT NULL DEFAULT "user" AFTER user_id');
    $pdo->exec('ALTER TABLE recipes ADD COLUMN IF NOT EXISTS recipe_key varchar(120) DEFAULT NULL AFTER source');
    $pdo->exec('ALTER TABLE recipes ADD COLUMN IF NOT EXISTS cook_minutes int(11) DEFAULT NULL AFTER prep_minutes');
    $pdo->exec('ALTER TABLE recipes ADD COLUMN IF NOT EXISTS difficulty enum("easy","medium","hard") NOT NULL DEFAULT "easy" AFTER instructions');
    $pdo->exec('ALTER TABLE recipes ADD COLUMN IF NOT EXISTS carb_level enum("unknown","low","medium","high") NOT NULL DEFAULT "unknown" AFTER goal_type');
    $pdo->exec('ALTER TABLE recipes ADD COLUMN IF NOT EXISTS digestion_score tinyint(3) DEFAULT NULL AFTER carb_level');
    $pdo->exec('ALTER TABLE recipes ADD COLUMN IF NOT EXISTS protein_score tinyint(3) DEFAULT NULL AFTER digestion_score');
    $pdo->exec('ALTER TABLE recipes ADD COLUMN IF NOT EXISTS ai_prompt text DEFAULT NULL AFTER protein_score');
    $pdo->exec('ALTER TABLE recipes ADD COLUMN IF NOT EXISTS ai_model varchar(80) DEFAULT NULL AFTER ai_prompt');
    $pdo->exec('ALTER TABLE recipes ADD COLUMN IF NOT EXISTS parent_recipe_id int(11) DEFAULT NULL AFTER ai_model');
    $pdo->exec('CREATE UNIQUE INDEX IF NOT EXISTS uniq_recipe_key ON recipes (recipe_key)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_recipes_source ON recipes (source)');
    $pdo->exec('UPDATE recipes SET source = "user" WHERE source IS NULL');

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
        CREATE TABLE IF NOT EXISTS recipe_tags (
            id int(11) NOT NULL AUTO_INCREMENT,
            code varchar(80) NOT NULL,
            label_cs varchar(120) NOT NULL,
            label_en varchar(120) DEFAULT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uniq_recipe_tag_code (code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_czech_ci
    ');

    $pdo->exec('
        CREATE TABLE IF NOT EXISTS recipe_tag_links (
            id int(11) NOT NULL AUTO_INCREMENT,
            recipe_id int(11) NOT NULL,
            tag_id int(11) NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uniq_recipe_tag_link (recipe_id, tag_id),
            KEY idx_recipe_tag_links_tag (tag_id),
            CONSTRAINT recipe_tag_links_recipe_fk FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE,
            CONSTRAINT recipe_tag_links_tag_fk FOREIGN KEY (tag_id) REFERENCES recipe_tags (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_czech_ci
    ');

    $pdo->exec('
        CREATE TABLE IF NOT EXISTS recipe_feedback (
            id int(11) NOT NULL AUTO_INCREMENT,
            user_id int(11) NOT NULL,
            recipe_id int(11) NOT NULL,
            rating tinyint(3) DEFAULT NULL,
            bloating_level tinyint(3) DEFAULT NULL,
            energy_level tinyint(3) DEFAULT NULL,
            digestion_note text DEFAULT NULL,
            created_at timestamp NULL DEFAULT current_timestamp(),
            PRIMARY KEY (id),
            KEY idx_recipe_feedback_user (user_id),
            KEY idx_recipe_feedback_recipe (recipe_id),
            CONSTRAINT recipe_feedback_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            CONSTRAINT recipe_feedback_recipe_fk FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_czech_ci
    ');

    $pdo->exec('
        CREATE TABLE IF NOT EXISTS recipe_substitutions (
            id int(11) NOT NULL AUTO_INCREMENT,
            recipe_id int(11) NOT NULL,
            original_food_id int(11) NOT NULL,
            replacement_food_id int(11) NOT NULL,
            reason varchar(255) DEFAULT NULL,
            PRIMARY KEY (id),
            KEY idx_recipe_substitutions_recipe (recipe_id),
            KEY idx_recipe_substitutions_original (original_food_id),
            KEY idx_recipe_substitutions_replacement (replacement_food_id),
            CONSTRAINT recipe_substitutions_recipe_fk FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE,
            CONSTRAINT recipe_substitutions_original_fk FOREIGN KEY (original_food_id) REFERENCES foods (id) ON DELETE CASCADE,
            CONSTRAINT recipe_substitutions_replacement_fk FOREIGN KEY (replacement_food_id) REFERENCES foods (id) ON DELETE CASCADE
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