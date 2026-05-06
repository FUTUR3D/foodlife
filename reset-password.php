<?php
require 'config.php';

$language = $_SESSION['ui_language'] ?? 'cz';
$token = $_GET['token'] ?? '';
$error = null;
$message = null;
$validToken = false;

if ($token) {
    $stmt = $pdo->prepare('SELECT id FROM users WHERE reset_token = ? AND reset_expires > NOW()');
    $stmt->execute([$token]);
    $user = $stmt->fetch();

    if ($user) {
        $validToken = true;
    } else {
        $error = $language === 'en' ? 'The link is invalid or expired.' : 'Odkaz je neplatný nebo vypršel.';
    }
} else {
    $error = $language === 'en' ? 'Missing reset token.' : 'Chybí resetovací token.';
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $validToken) {
    $password1 = $_POST['password1'] ?? '';
    $password2 = $_POST['password2'] ?? '';

    if (strlen($password1) < 8 || !preg_match('/[0-9]/', $password1) || !preg_match('/[A-Za-z]/', $password1)) {
        $error = $language === 'en'
            ? 'Password must be at least 8 characters and include letters and numbers.'
            : 'Heslo musí mít alespoň 8 znaků a obsahovat písmena a číslice.';
    } elseif ($password1 !== $password2) {
        $error = $language === 'en' ? 'Passwords do not match.' : 'Hesla se neshodují.';
    } else {
        $hash = password_hash($password1, PASSWORD_DEFAULT);

        $stmt = $pdo->prepare('
            UPDATE users
            SET password_hash = ?,
                reset_token = NULL,
                reset_expires = NULL,
                reset_request_count = 0,
                reset_requested_at = NULL
            WHERE reset_token = ?
        ');
        $stmt->execute([$hash, $token]);

        $message = $language === 'en'
            ? 'Password changed. You can sign in now.'
            : 'Heslo bylo změněno. Nyní se můžeš přihlásit.';
        $validToken = false;
    }
}

$page_title = $language === 'en' ? 'Password reset' : 'Reset hesla';
include 'header.php';
?>

<form method="post" class="auth-card">
    <h1 class="auth-title"><?= $language === 'en' ? 'Password reset' : 'Reset hesla' ?></h1>

    <?php if ($message): ?>
        <div class="auth-success"><?= htmlspecialchars($message) ?></div>
        <p class="auth-links"><a href="login.php"><?= $language === 'en' ? 'Go to sign in' : 'Přejít na přihlášení' ?></a></p>
    <?php elseif ($error): ?>
        <div class="auth-error"><?= htmlspecialchars($error) ?></div>
        <p class="auth-links"><a href="forgot-password.php"><?= $language === 'en' ? 'Try again' : 'Zkusit znovu' ?></a></p>
    <?php elseif ($validToken): ?>
        <div class="row">
            <label><?= $language === 'en' ? 'New password' : 'Nové heslo' ?></label>
            <input type="password" name="password1" required>
        </div>

        <div class="row">
            <label><?= $language === 'en' ? 'Confirm password' : 'Potvrzení hesla' ?></label>
            <input type="password" name="password2" required>
        </div>

        <div class="auth-actions">
            <button type="submit"><?= $language === 'en' ? 'Change password' : 'Změnit heslo' ?></button>
        </div>
    <?php endif; ?>
</form>

<?php include 'footer.php'; ?>
