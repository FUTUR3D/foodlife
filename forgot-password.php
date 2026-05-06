<?php
require 'config.php';

$language = $_SESSION['ui_language'] ?? 'cz';
$message = null;
$error = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');

    if ($email === '') {
        $error = $language === 'en' ? 'Enter your email.' : 'Zadej e-mail.';
    } else {
        $stmt = $pdo->prepare('SELECT id, reset_requested_at, reset_request_count FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user) {
            $now = time();
            $lastRequest = !empty($user['reset_requested_at']) ? strtotime($user['reset_requested_at']) : 0;
            $count = (int) ($user['reset_request_count'] ?? 0);

            if ($lastRequest < ($now - 3600)) {
                $count = 0;
            }

            if ($count >= 3) {
                $error = $language === 'en'
                    ? 'Too many requests. Try again later.'
                    : 'Bylo odesláno příliš mnoho žádostí. Zkus to prosím později.';
            } else {
                $token = bin2hex(random_bytes(32));
                $expires = date('Y-m-d H:i:s', $now + 3600);

                $stmt = $pdo->prepare('
                    UPDATE users
                    SET reset_token = ?,
                        reset_expires = ?,
                        reset_requested_at = NOW(),
                        reset_request_count = ?
                    WHERE email = ?
                ');
                $stmt->execute([$token, $expires, $count + 1, $email]);

                $resetLink = app_base_url() . '/reset-password.php?token=' . urlencode($token);
                $subject = $language === 'en' ? 'Password reset - FoodLife' : 'Reset hesla - FoodLife';
                $body = $language === 'en'
                    ? "To reset your password click the link:\n\n" . $resetLink . "\n\nThe link is valid for 1 hour."
                    : "Pro reset hesla klikni na tento odkaz:\n\n" . $resetLink . "\n\nOdkaz platí 1 hodinu.";

                $fromEmail = 'info@bloco.cz';
                $headers = "From: FoodLife <$fromEmail>\r\n";
                $headers .= "Reply-To: $fromEmail\r\n";
                $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

                @mail($email, $subject, $body, $headers);
                $message = $language === 'en'
                    ? 'If the email exists, we have sent a reset link.'
                    : 'Pokud e-mail existuje, poslali jsme odkaz pro reset hesla.';
            }
        } else {
            $message = $language === 'en'
                ? 'If the email exists, we have sent a reset link.'
                : 'Pokud e-mail existuje, poslali jsme odkaz pro reset hesla.';
        }
    }
}

$page_title = $language === 'en' ? 'Forgot password' : 'Zapomenuté heslo';
include 'header.php';
?>

<form method="post" class="auth-card">
    <h1 class="auth-title"><?= $language === 'en' ? 'Forgot password' : 'Zapomenuté heslo' ?></h1>
    <p class="auth-subtitle">
        <?= $language === 'en' ? 'Enter your email and we will send a reset link.' : 'Zadej e-mail a pošleme ti odkaz pro reset.' ?>
    </p>

    <?php if ($message): ?>
        <div class="auth-success"><?= htmlspecialchars($message) ?></div>
    <?php endif; ?>

    <?php if ($error): ?>
        <div class="auth-error"><?= htmlspecialchars($error) ?></div>
    <?php endif; ?>

    <div class="row">
        <label><?= $language === 'en' ? 'E-mail' : 'E-mail' ?></label>
        <input type="email" name="email" value="<?= htmlspecialchars($_POST['email'] ?? '') ?>" required>
    </div>

    <div class="auth-actions">
        <button type="submit"><?= $language === 'en' ? 'Send reset link' : 'Poslat odkaz pro reset' ?></button>
    </div>

    <p class="auth-links"><a href="login.php"><?= $language === 'en' ? 'Back to sign in' : 'Zpět na přihlášení' ?></a></p>
</form>

<?php include 'footer.php'; ?>
