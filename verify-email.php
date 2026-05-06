<?php
require 'config.php';

$language = $_SESSION['ui_language'] ?? 'cz';
$error = null;
$message = null;
$token = $_GET['token'] ?? '';

if ($token === '') {
    $error = $language === 'en' ? 'Invalid token.' : 'Neplatný token.';
} else {
    try {
        $stmt = $pdo->prepare('SELECT id, verify_expires FROM users WHERE verify_token = ?');
        $stmt->execute([$token]);
        $user = $stmt->fetch();

        if (!$user) {
            $error = $language === 'en' ? 'Invalid or expired token.' : 'Neplatný nebo expirovaný token.';
        } elseif (!empty($user['verify_expires']) && strtotime($user['verify_expires']) < time()) {
            $error = $language === 'en' ? 'Verification link expired.' : 'Ověřovací odkaz vypršel.';
        } else {
            $stmt = $pdo->prepare('
                UPDATE users
                SET email_verified = 1,
                    verify_token = NULL,
                    verify_expires = NULL
                WHERE id = ?
            ');
            $stmt->execute([(int) $user['id']]);
            $message = $language === 'en' ? 'Email verified. You can sign in.' : 'E-mail ověřen. Můžeš se přihlásit.';
        }
    } catch (Exception $e) {
        $error = $language === 'en' ? 'Verification failed.' : 'Ověření selhalo.';
        log_error('verify-email.php exception: ' . $e->getMessage());
    }
}

$page_title = $language === 'en' ? 'Email verification' : 'Ověření e-mailu';
include 'header.php';
?>

<form class="auth-card">
    <h1 class="auth-title"><?= $language === 'en' ? 'Email verification' : 'Ověření e-mailu' ?></h1>

    <?php if ($message): ?>
        <div class="auth-success"><?= htmlspecialchars($message) ?></div>
        <p class="auth-links"><a href="login.php"><?= $language === 'en' ? 'Sign in' : 'Přihlásit se' ?></a></p>
    <?php else: ?>
        <?php if ($error): ?>
            <div class="auth-error"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>
        <p class="auth-links"><a href="register.php"><?= $language === 'en' ? 'Register' : 'Zaregistruj se' ?></a></p>
    <?php endif; ?>
</form>

<?php include 'footer.php'; ?>
