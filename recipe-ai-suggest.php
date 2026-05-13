<?php
require 'recipe-helpers.php';

$userId = require_json_user();
$data = read_json_body();

function clean_text($value, int $maxLength = 500): string
{
    $text = trim((string) $value);
    if (function_exists('mb_substr')) {
        return mb_substr($text, 0, $maxLength);
    }
    return substr($text, 0, $maxLength);
}

function clean_target_kcal($value): int
{
    $kcal = (int) $value;
    if ($kcal <= 0) {
        return 550;
    }
    return max(150, min(1400, $kcal));
}

function text_has(string $text, array $needles): bool
{
    $haystack = function_exists('mb_strtolower') ? mb_strtolower($text, 'UTF-8') : strtolower($text);
    foreach ($needles as $needle) {
        $needle = function_exists('mb_strtolower') ? mb_strtolower($needle, 'UTF-8') : strtolower($needle);
        if ($needle !== '' && strpos($haystack, $needle) !== false) {
            return true;
        }
    }
    return false;
}

function food_role(array $food): string
{
    $name = (string) ($food['name_cs'] ?? '');
    $category = (string) ($food['category'] ?? '');
    $text = $name . ' ' . $category;
    $protein = (float) ($food['protein_100g'] ?? 0);
    $carbs = (float) ($food['carbs_100g'] ?? 0);
    $fat = (float) ($food['fat_100g'] ?? 0);
    $kcal = (float) ($food['kcal_100g'] ?? 0);

    if (text_has($text, ['kuře', 'krůt', 'vejce', 'tvaroh', 'skyr', 'jogurt', 'tofu', 'tempeh', 'ryba', 'losos', 'tuňák', 'sýr', 'čočka', 'fazole', 'cizrna'])) {
        return 'protein';
    }
    if (text_has($text, ['rýže', 'brambor', 'těstovin', 'oves', 'vločky', 'chléb', 'pečivo', 'pohanka', 'quinoa', 'kuskus', 'bulgur', 'banán'])) {
        return 'carb';
    }
    if (text_has($text, ['salát', 'okurka', 'rajče', 'mrkev', 'cuketa', 'brokolice', 'špenát', 'paprika', 'zelenina'])) {
        return 'veg';
    }
    if (text_has($text, ['olej', 'máslo', 'avokádo', 'ořech', 'semín', 'tahini'])) {
        return 'fat';
    }
    if ($protein >= 8 && $protein >= $carbs && $protein >= $fat) return 'protein';
    if ($carbs >= 15 && $carbs >= $protein) return 'carb';
    if ($fat >= 12) return 'fat';
    if ($kcal > 0 && $kcal <= 80) return 'veg';
    return 'extra';
}

function role_amount(string $role, string $mealType): int
{
    if (in_array($mealType, ['snidane', 'svacina1', 'svacina2'], true)) {
        if ($role === 'protein') return 150;
        if ($role === 'carb') return 60;
        if ($role === 'veg') return 100;
        if ($role === 'fat') return 12;
        return 100;
    }

    if ($role === 'protein') return 140;
    if ($role === 'carb') return 160;
    if ($role === 'veg') return 140;
    if ($role === 'fat') return 12;
    return 100;
}

function item_kcal(array $item): float
{
    return ((float) ($item['kcal_100g'] ?? 0)) * ((float) ($item['grams'] ?? 0)) / 100;
}

function recipe_totals(array $items): array
{
    $kcal = 0;
    foreach ($items as $item) {
        $kcal += item_kcal($item);
    }
    return ['kcal' => round($kcal)];
}

function sort_food_candidates(array $foods, string $goalType, string $prompt): array
{
    usort($foods, function ($a, $b) use ($goalType, $prompt) {
        $scoreA = candidate_score($a, $goalType, $prompt);
        $scoreB = candidate_score($b, $goalType, $prompt);
        return $scoreB <=> $scoreA;
    });
    return $foods;
}

function candidate_score(array $food, string $goalType, string $prompt): int
{
    $score = 0;
    $name = (string) ($food['name_cs'] ?? '');
    $category = (string) ($food['category'] ?? '');
    $text = $name . ' ' . $category;
    $protein = (float) ($food['protein_100g'] ?? 0);
    $kcal = (float) ($food['kcal_100g'] ?? 0);
    $sighiScore = $food['sighi_score'] === null ? null : (int) $food['sighi_score'];

    if ($protein >= 10) $score += 8;
    if ($kcal > 0) $score += 4;
    if ($sighiScore !== null) $score += max(0, 4 - $sighiScore);
    if ($goalType === 'low_histamine') {
        if ($sighiScore === 0) $score += 18;
        if ($sighiScore !== null && $sighiScore >= 2) $score -= 30;
    }
    if ($goalType === 'lose_weight' && $kcal > 0 && $kcal <= 180) $score += 6;
    if ($goalType === 'gain_weight' && $kcal >= 180) $score += 6;
    if ($goalType === 'digestive_comfort' && text_has($text, ['smažen', 'uzen', 'alkohol'])) $score -= 10;

    $words = preg_split('/\s+/', clean_text($prompt, 160));
    foreach ($words ?: [] as $word) {
        if (strlen($word) >= 4 && text_has($text, [$word])) $score += 10;
    }

    return $score;
}

function pick_by_role(array $foods, string $role, array $usedIds, string $goalType, string $prompt): ?array
{
    foreach (sort_food_candidates($foods, $goalType, $prompt) as $food) {
        if (in_array((int) $food['id'], $usedIds, true)) continue;
        if (food_role($food) === $role) return $food;
    }

    foreach (sort_food_candidates($foods, $goalType, $prompt) as $food) {
        if (!in_array((int) $food['id'], $usedIds, true)) return $food;
    }

    return null;
}

function build_local_recipe(array $foods, string $mealType, string $goalType, int $targetKcal, string $prompt): array
{
    $mealLabels = [
        'snidane' => 'snídaně',
        'svacina1' => 'svačina',
        'obed' => 'oběd',
        'svacina2' => 'svačina',
        'vecere' => 'večeře',
        'ostatni' => 'jídlo',
    ];
    $roles = in_array($mealType, ['snidane', 'svacina1', 'svacina2'], true)
        ? ['protein', 'carb', 'extra']
        : ['protein', 'carb', 'veg', 'fat'];

    $items = [];
    $used = [];
    foreach ($roles as $role) {
        $food = pick_by_role($foods, $role, $used, $goalType, $prompt);
        if (!$food) continue;
        $used[] = (int) $food['id'];
        $grams = role_amount(food_role($food), $mealType);
        $items[] = food_to_recipe_item($food, $grams);
    }

    if (!$items) {
        json_error('no_food_candidates', 422);
    }

    $currentKcal = max(1, recipe_totals($items)['kcal']);
    $scale = max(0.6, min(1.75, $targetKcal / $currentKcal));
    foreach ($items as &$item) {
        $role = food_role($item);
        if ($role === 'veg') continue;
        $item['amount'] = max(5, round($item['amount'] * $scale));
        $item['grams'] = $item['amount'];
    }
    unset($item);

    $names = array_slice(array_map(fn($item) => $item['name'], $items), 0, 2);
    $title = 'Návrh: ' . ucfirst($mealLabels[$mealType] ?? 'jídlo') . ' - ' . implode(' + ', $names);

    return [
        'source' => 'local',
        'recipe' => [
            'title' => $title,
            'note' => 'Návrh složený z potravin v databázi FoodLife. Před uložením si prosím dolaď množství a postup podle reality.',
            'instructions' => "1. Připrav a odvaž suroviny.\n2. Tepelně uprav suroviny, které to vyžadují.\n3. Spoj na talíři a dochuť podle tolerance.",
            'prep_minutes' => 10,
            'cook_minutes' => in_array($mealType, ['snidane', 'svacina1', 'svacina2'], true) ? 0 : 15,
            'servings' => 1,
            'difficulty' => 'easy',
            'goal_type' => $goalType,
            'carb_level' => 'unknown',
            'ai_prompt' => $prompt,
            'meal_types' => [$mealType],
            'items' => $items,
            'totals' => recipe_totals($items),
        ],
    ];
}

function food_to_recipe_item(array $food, int $grams): array
{
    return [
        'id' => 'ai_' . (int) $food['id'] . '_' . uniqid(),
        'food_id' => (int) $food['id'],
        'name' => $food['name_cs'],
        'custom_name' => null,
        'amount' => $grams,
        'unit' => 'g',
        'grams' => $grams,
        'serving_grams' => $food['serving_grams'] === null ? null : (float) $food['serving_grams'],
        'note' => '',
        'kcal_100g' => $food['kcal_100g'] === null ? null : (float) $food['kcal_100g'],
        'protein_100g' => $food['protein_100g'] === null ? null : (float) $food['protein_100g'],
        'carbs_100g' => $food['carbs_100g'] === null ? null : (float) $food['carbs_100g'],
        'fat_100g' => $food['fat_100g'] === null ? null : (float) $food['fat_100g'],
        'fiber_100g' => $food['fiber_100g'] === null ? null : (float) $food['fiber_100g'],
        'sighi_id' => $food['sighi_id'] === null ? null : (int) $food['sighi_id'],
        'sighi_food' => $food['sighi_food'] ?? null,
        'sighi_score_raw' => $food['sighi_score_raw'] ?? null,
        'sighi_score' => $food['sighi_score'] === null ? null : (int) $food['sighi_score'],
        'histamine_marker' => $food['histamine_marker'] ?? null,
        'other_amines_marker' => $food['other_amines_marker'] ?? null,
        'liberator_marker' => $food['liberator_marker'] ?? null,
        'inhibitor_marker' => $food['inhibitor_marker'] ?? null,
        'uncertain_marker' => $food['uncertain_marker'] ?? null,
        'other_marker' => $food['other_marker'] ?? null,
        'sighi_notes' => $food['sighi_notes'] ?? null,
        'sighi_approved' => $food['sighi_approved'] === null ? null : (int) $food['sighi_approved'],
        'sighi_confidence' => $food['sighi_confidence'] === null ? null : (int) $food['sighi_confidence'],
        'sighi_match_method' => $food['sighi_match_method'] ?? null,
    ];
}

function gemini_api_key(): string
{
    global $GEMINI_API_KEY;

    $key = trim((string) ($GEMINI_API_KEY ?? ''));
    if ($key !== '') {
        return $key;
    }

    return trim((string) getenv('GEMINI_API_KEY'));
}

function json_from_gemini_text(string $text): ?array
{
    $text = trim($text);
    $decoded = json_decode($text, true);
    if (is_array($decoded)) {
        return $decoded;
    }

    if (preg_match('/```(?:json)?\s*(.*?)```/is', $text, $match)) {
        $decoded = json_decode(trim($match[1]), true);
        if (is_array($decoded)) {
            return $decoded;
        }
    }

    $start = strpos($text, '{');
    $end = strrpos($text, '}');
    if ($start !== false && $end !== false && $end > $start) {
        $decoded = json_decode(substr($text, $start, $end - $start + 1), true);
        if (is_array($decoded)) {
            return $decoded;
        }
    }

    return null;
}

function build_gemini_food_context(array $foods, string $goalType, string $prompt): array
{
    $sorted = array_slice(sort_food_candidates($foods, $goalType, $prompt), 0, 90);
    return array_map(function ($food) {
        return [
            'id' => (int) $food['id'],
            'name' => $food['name_cs'],
            'category' => $food['category'],
            'kcal_100g' => $food['kcal_100g'] === null ? null : round((float) $food['kcal_100g'], 1),
            'protein_100g' => $food['protein_100g'] === null ? null : round((float) $food['protein_100g'], 1),
            'carbs_100g' => $food['carbs_100g'] === null ? null : round((float) $food['carbs_100g'], 1),
            'fat_100g' => $food['fat_100g'] === null ? null : round((float) $food['fat_100g'], 1),
            'sighi_score' => $food['sighi_score'] === null ? null : (int) $food['sighi_score'],
        ];
    }, $sorted);
}

function call_gemini_recipe(array $foods, string $mealType, string $goalType, int $targetKcal, string $prompt): ?array
{
    $apiKey = gemini_api_key();
    if ($apiKey === '' || !function_exists('curl_init')) {
        return null;
    }

    $foodContext = build_gemini_food_context($foods, $goalType, $prompt);
    if (!$foodContext) {
        return null;
    }

    $requestText = "Jsi asistent pro českou aplikaci FoodLife. Navrhni jeden praktický recept jen z povolených potravin níže. "
        . "Nesmíš použít žádnou potravinu mimo seznam a u položek vrať pouze food_id ze seznamu. "
        . "Zohledni cíl, kcal, trávení a pokud je cíl low_histamine, preferuj potraviny se sighi_score 0 nebo null a vyhýbej se 2-3. "
        . "Vrať pouze validní JSON bez komentáře.\n\n"
        . "Typ jídla: {$mealType}\nCíl: {$goalType}\nCílové kcal: {$targetKcal}\nZadání uživatele: {$prompt}\n\n"
        . "Povolené potraviny JSON:\n" . json_encode($foodContext, JSON_UNESCAPED_UNICODE) . "\n\n"
        . "Výstupní JSON tvar: {\"title\":\"...\",\"note\":\"...\",\"instructions\":\"1. ...\\n2. ...\",\"prep_minutes\":10,\"cook_minutes\":15,\"servings\":1,\"difficulty\":\"easy\",\"carb_level\":\"unknown\",\"items\":[{\"food_id\":123,\"grams\":150,\"note\":\"\"}]}";

    $payload = [
        'contents' => [[
            'role' => 'user',
            'parts' => [['text' => $requestText]],
        ]],
        'generationConfig' => [
            'temperature' => 0.35,
            'responseMimeType' => 'application/json',
        ],
    ];

    $ch = curl_init('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'x-goog-api-key: ' . $apiKey,
        ],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
        CURLOPT_TIMEOUT => 18,
    ]);

    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($raw === false || $status < 200 || $status >= 300) {
        log_error('Gemini recipe generation failed: HTTP ' . $status . ' ' . $curlError . ' ' . substr((string) $raw, 0, 500));
        return null;
    }

    $response = json_decode($raw, true);
    $text = $response['candidates'][0]['content']['parts'][0]['text'] ?? '';
    $recipe = json_from_gemini_text((string) $text);
    if (!$recipe || empty($recipe['items']) || !is_array($recipe['items'])) {
        return null;
    }

    return normalize_gemini_recipe($recipe, $foods, $mealType, $goalType, $prompt);
}

function normalize_gemini_recipe(array $recipe, array $foods, string $mealType, string $goalType, string $prompt): ?array
{
    $foodsById = [];
    foreach ($foods as $food) {
        $foodsById[(int) $food['id']] = $food;
    }

    $items = [];
    foreach ($recipe['items'] as $item) {
        $foodId = (int) ($item['food_id'] ?? 0);
        if (!$foodId || !isset($foodsById[$foodId])) {
            continue;
        }
        $grams = max(5, min(800, (int) ($item['grams'] ?? $item['amount'] ?? role_amount(food_role($foodsById[$foodId]), $mealType))));
        $recipeItem = food_to_recipe_item($foodsById[$foodId], $grams);
        $recipeItem['note'] = clean_text($item['note'] ?? '', 120);
        $items[] = $recipeItem;
    }

    if (!$items) {
        return null;
    }

    return [
        'source' => 'gemini',
        'recipe' => [
            'title' => clean_text($recipe['title'] ?? 'Gemini návrh receptu', 120),
            'note' => clean_text($recipe['note'] ?? 'Návrh vytvořený přes Gemini z potravin v databázi FoodLife.', 500),
            'instructions' => clean_text($recipe['instructions'] ?? '', 1800),
            'prep_minutes' => max(0, (int) ($recipe['prep_minutes'] ?? 10)),
            'cook_minutes' => max(0, (int) ($recipe['cook_minutes'] ?? 0)),
            'servings' => max(0.5, (float) ($recipe['servings'] ?? 1)),
            'difficulty' => in_array(($recipe['difficulty'] ?? 'easy'), ['easy', 'medium', 'hard'], true) ? $recipe['difficulty'] : 'easy',
            'goal_type' => $goalType,
            'carb_level' => in_array(($recipe['carb_level'] ?? 'unknown'), ['unknown', 'low', 'medium', 'high'], true) ? $recipe['carb_level'] : 'unknown',
            'ai_prompt' => $prompt,
            'meal_types' => [$mealType],
            'items' => $items,
            'totals' => recipe_totals($items),
        ],
    ];
}

try {
    ensure_recipe_tables($pdo);

    $mealTypes = valid_meal_types($data['meal_types'] ?? []);
    $mealType = $mealTypes[0] ?? valid_meal_type($data['meal_type'] ?? 'obed');
    $goalType = in_array(($data['goal_type'] ?? 'none'), ['none', 'lose_weight', 'maintain_weight', 'gain_weight', 'digestive_comfort', 'low_fodmap', 'low_histamine'], true)
        ? $data['goal_type']
        : 'none';
    $targetKcal = clean_target_kcal($data['target_kcal'] ?? 550);
    $prompt = clean_text($data['prompt'] ?? '');

    $sighiEnabled = has_sighi_tables($pdo);
    $sighiSelect = $sighiEnabled ? sighi_select_sql('foods') : sighi_empty_select_sql();
    $sighiJoin = $sighiEnabled ? sighi_join_sql('foods') : '';

    $stmt = $pdo->prepare("
        SELECT
            foods.id,
            foods.name_cs,
            foods.name_en,
            foods.category,
            foods.default_unit,
            foods.serving_grams,
            foods.kcal_100g,
            foods.protein_100g,
            foods.carbs_100g,
            foods.fat_100g,
            foods.fiber_100g
            {$sighiSelect}
        FROM foods
        {$sighiJoin}
        WHERE
            (foods.user_id IS NULL OR foods.user_id = ?)
            AND foods.name_cs IS NOT NULL
            AND foods.name_cs <> ''
            AND NOT (
                COALESCE(foods.external_source, '') = 'all_drinks_nutrition_database_cz'
                OR COALESCE(foods.category, '') LIKE 'Nápoj%'
            )
        ORDER BY
            CASE WHEN foods.kcal_100g IS NULL THEN 1 ELSE 0 END,
            foods.name_cs ASC
        LIMIT 1000
    ");
    $stmt->execute([$userId]);
    $foods = $stmt->fetchAll();

    $result = call_gemini_recipe($foods, $mealType, $goalType, $targetKcal, $prompt);
    if (!$result) {
        $result = build_local_recipe($foods, $mealType, $goalType, $targetKcal, $prompt);
    }
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    log_error('recipe-ai-suggest.php exception: ' . $e->getMessage());
    json_error('recipe_ai_suggest_failed', 500);
}
