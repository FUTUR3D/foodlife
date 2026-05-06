<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (isset($_POST['ui_language'])) {
    $_SESSION['ui_language'] = $_POST['ui_language'] === 'en' ? 'en' : 'cz';
    header('Location: ' . strtok($_SERVER['REQUEST_URI'], '?'));
    exit;
}

$language = $_SESSION['ui_language'] ?? 'cz';
$page_title = $page_title ?? ($language === 'en' ? 'FoodLife' : 'FoodLife');
?>
<!DOCTYPE html>
<html lang="<?= $language === 'en' ? 'en' : 'cs' ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($page_title) ?></title>
    <link rel="stylesheet" href="app.css?v=1">
</head>
<body>
<div class="app-shell">
    <header class="app-header">
        <a class="app-logo" href="index.html">
            <span class="app-logo-mark">F</span>
            <span class="app-logo-text">FoodLife</span>
        </a>

        <form method="post" class="app-lang-form">
            <div class="language-switch small">
                <input type="radio" name="ui_language" id="ui_lang_cz" value="cz"
                    <?= $language === 'cz' ? 'checked' : '' ?>
                    onchange="this.form.submit()">
                <label for="ui_lang_cz">CZ</label>

                <input type="radio" name="ui_language" id="ui_lang_en" value="en"
                    <?= $language === 'en' ? 'checked' : '' ?>
                    onchange="this.form.submit()">
                <label for="ui_lang_en">EN</label>
            </div>
        </form>
    </header>

    <main class="app-main">
