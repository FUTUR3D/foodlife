<?php
require 'config.php';

$language = $_SESSION['ui_language'] ?? 'cz';
$error = null;
$message = null;

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(16));
}

$attempts = $_SESSION['register_attempts'] ?? [];
$threshold = time() - 3600;
$attempts = array_filter($attempts, static function ($time) use ($threshold) {
    return $time > $threshold;
});

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $attempts[] = time();
    $_SESSION['register_attempts'] = $attempts;

    if (count($attempts) > 5) {
        $error = $language === 'en' ? 'Too many attempts. Try again later.' : 'Příliš mnoho pokusů. Zkus to později.';
    } elseif (empty($_POST['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])) {
        $error = $language === 'en' ? 'Invalid request.' : 'Neplatný požadavek.';
    } elseif (!empty($_POST['hp'])) {
        $error = $language === 'en' ? 'Invalid input.' : 'Neplatný vstup.';
    } else {
        $email = trim($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';
        $password2 = $_POST['password2'] ?? '';

        if ($password !== $password2) {
            $error = $language === 'en' ? 'Passwords do not match.' : 'Hesla se neshodují.';
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $error = $language === 'en' ? 'Invalid email.' : 'Neplatný e-mail.';
        } elseif (strlen($password) < 8 || !preg_match('/[0-9]/', $password) || !preg_match('/[A-Za-z]/', $password)) {
            $error = $language === 'en'
                ? 'Password must be at least 8 characters and include letters and numbers.'
                : 'Heslo musí mít alespoň 8 znaků a obsahovat písmena a číslice.';
        } else {
            try {
                $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
                $stmt->execute([$email]);

                if ($stmt->fetch()) {
                    $error = $language === 'en' ? 'User with this email already exists.' : 'Uživatel s tímto e-mailem už existuje.';
                } else {
                    $hash = password_hash($password, PASSWORD_DEFAULT);
                    $verifyToken = bin2hex(random_bytes(32));
                    $verifyExpires = date('Y-m-d H:i:s', time() + 24 * 3600);

                    $stmt = $pdo->prepare('
                        INSERT INTO users (email, password_hash, email_verified, verify_token, verify_expires)
                        VALUES (?, ?, 0, ?, ?)
                    ');
                    $stmt->execute([$email, $hash, $verifyToken, $verifyExpires]);

                    $verifyLink = app_base_url() . '/verify-email.php?token=' . urlencode($verifyToken);
                    $subject = $language === 'en' ? 'Verify your email - FoodLife' : 'Ověř svůj e-mail - FoodLife';
                    $body = $language === 'en'
                        ? "Please verify your email by clicking the link:\n\n" . $verifyLink . "\n\nThis link is valid for 24 hours."
                        : "Prosím ověř svůj e-mail kliknutím na odkaz:\n\n" . $verifyLink . "\n\nOdkaz je platný 24 hodin.";

                    $fromEmail = 'info@bloco.cz';
                    $headers = "From: FoodLife <$fromEmail>\r\n";
                    $headers .= "Reply-To: $fromEmail\r\n";
                    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

                    @mail($email, $subject, $body, $headers);

                    $message = $language === 'en'
                        ? 'Account created. Check your email to verify the address.'
                        : 'Účet byl vytvořen. Zkontroluj svůj e-mail a ověř adresu.';
                    $_SESSION['csrf_token'] = bin2hex(random_bytes(16));
                }
            } catch (Exception $e) {
                $error = $language === 'en' ? 'Registration failed. Try again later.' : 'Registrace selhala. Zkus to prosím později.';
                log_error('register.php exception: ' . $e->getMessage());
            }
        }
    }
}

$page_title = $language === 'en' ? 'Register' : 'Registrace';
include 'header.php';
?>

<form method="post" class="auth-card">
    <h1 class="auth-title"><?= $language === 'en' ? 'Register' : 'Registrace' ?></h1>
    <p class="auth-subtitle"><?= $language === 'en' ? 'Create your FoodLife account.' : 'Vytvoř účet FoodLife.' ?></p>

    <?php if ($error): ?>
        <div class="auth-error"><?= htmlspecialchars($error) ?></div>
    <?php endif; ?>

    <?php if ($message): ?>
        <div class="auth-success"><?= htmlspecialchars($message) ?></div>
        <p class="auth-links"><a href="login.php"><?= $language === 'en' ? 'Sign in' : 'Přihlásit se' ?></a></p>
    <?php else: ?>
        <div class="row">
            <label><?= $language === 'en' ? 'E-mail' : 'E-mail' ?></label>
            <input type="email" name="email" value="<?= htmlspecialchars($_POST['email'] ?? '') ?>" required>
        </div>

        <div class="row">
            <label><?= $language === 'en' ? 'Password' : 'Heslo' ?></label>
            <input type="password" name="password" required>
        </div>

        <div class="row">
            <label><?= $language === 'en' ? 'Repeat password' : 'Heslo znovu' ?></label>
            <input type="password" name="password2" required>
        </div>

        <div style="display:none;">
            <label>Leave empty</label>
            <input type="text" name="hp" value="">
        </div>

        <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($_SESSION['csrf_token']) ?>">

        <div class="auth-actions">
            <button type="submit"><?= $language === 'en' ? 'Register' : 'Registrovat' ?></button>
        </div>

        <p class="auth-links">
            <?= $language === 'en' ? 'Already have an account?' : 'Už máš účet?' ?>
            <a href="login.php"><?= $language === 'en' ? 'Sign in' : 'Přihlas se' ?></a>
        </p>
    <?php endif; ?>
</form>

<?php include 'footer.php'; ?>
