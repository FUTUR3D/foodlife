<?php
require 'config.php';

$language = $_SESSION['ui_language'] ?? 'cz';
$error = null;
$show_resend = false;

if (!empty($_SESSION['user_id']) && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: index.html');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['do_login'])) {
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    if ($email === '' || $password === '') {
        $error = $language === 'en' ? 'Please fill in both fields.' : 'Vyplň prosím oba údaje.';
    } else {
        $stmt = $pdo->prepare('SELECT id, password_hash, IFNULL(email_verified, 0) AS email_verified FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password_hash'])) {
            if (empty($user['email_verified'])) {
                $error = $language === 'en'
                    ? 'Email is not verified. Check your inbox.'
                    : 'E-mail není ověřen. Zkontroluj svou schránku.';
                $show_resend = true;
            } else {
                session_regenerate_id(true);
                $_SESSION['user_id'] = (int) $user['id'];
                header('Location: index.html');
                exit;
            }
        } else {
            $error = $language === 'en' ? 'Invalid email or password.' : 'Neplatný e-mail nebo heslo.';
            $show_resend = !empty($user) && empty($user['email_verified']);
        }
    }
}

$page_title = $language === 'en' ? 'Sign in' : 'Přihlášení';
include 'header.php';
?>

<form method="post" class="auth-card">
    <h1 class="auth-title"><?= $language === 'en' ? 'Sign in' : 'Přihlášení' ?></h1>
    <p class="auth-subtitle">
        <?= $language === 'en' ? 'Access your FoodLife profile.' : 'Přihlas se do svého profilu FoodLife.' ?>
    </p>

    <?php if ($error): ?>
        <div class="auth-error">
            <?= htmlspecialchars($error) ?>
            <?php if ($show_resend): ?>
                <div style="margin-top:8px;">
                    <a href="resend-verification.php?email=<?= urlencode($_POST['email'] ?? '') ?>">
                        <?= $language === 'en' ? 'Resend verification' : 'Odeslat ověření znovu' ?>
                    </a>
                </div>
            <?php endif; ?>
        </div>
    <?php endif; ?>

    <div class="row">
        <label><?= $language === 'en' ? 'E-mail' : 'E-mail' ?></label>
        <input type="email" name="email" value="<?= htmlspecialchars($_POST['email'] ?? '') ?>" required>
    </div>

    <div class="row">
        <label><?= $language === 'en' ? 'Password' : 'Heslo' ?></label>
        <input type="password" name="password" required>
    </div>

    <div class="auth-actions">
        <button type="submit" name="do_login" value="1">
            <?= $language === 'en' ? 'Sign in' : 'Přihlásit se' ?>
        </button>
    </div>

    <p class="auth-links">
        <a href="forgot-password.php"><?= $language === 'en' ? 'Forgot password?' : 'Zapomenuté heslo?' ?></a><br>
        <a href="register.php">
            <?= $language === 'en' ? "Don't have an account? Register" : 'Ještě nemáš účet? Zaregistruj se' ?>
        </a>
    </p>
</form>

<?php include 'footer.php'; ?>
