<?php
require 'config.php';

$language = $_SESSION['ui_language'] ?? 'cz';
$error = null;
$message = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');

    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error = $language === 'en' ? 'Please provide a valid email.' : 'Zadej platný e-mail.';
    } else {
        try {
            $stmt = $pdo->prepare('SELECT id, email_verified FROM users WHERE email = ?');
            $stmt->execute([$email]);
            $user = $stmt->fetch();

            if (!$user) {
                $message = $language === 'en'
                    ? 'If the email exists, a verification mail was sent.'
                    : 'Pokud e-mail existuje, ověřovací e-mail byl odeslán.';
            } elseif (!empty($user['email_verified'])) {
                $message = $language === 'en'
                    ? 'Email already verified. You can sign in.'
                    : 'E-mail již byl ověřen. Můžeš se přihlásit.';
            } else {
                try {
                    $pdo->exec('
                        ALTER TABLE users
                        ADD COLUMN IF NOT EXISTS resend_verify_requested_at DATETIME NULL,
                        ADD COLUMN IF NOT EXISTS resend_verify_count INT DEFAULT 0
                    ');
                } catch (Exception $e) {
                    log_error('resend-verification alter ignored: ' . $e->getMessage());
                }

                $stmt = $pdo->prepare('SELECT resend_verify_requested_at, resend_verify_count FROM users WHERE id = ?');
                $stmt->execute([(int) $user['id']]);
                $limits = $stmt->fetch();

                $now = time();
                $lastRequest = !empty($limits['resend_verify_requested_at']) ? strtotime($limits['resend_verify_requested_at']) : 0;
                $count = (int) ($limits['resend_verify_count'] ?? 0);

                if ($lastRequest < ($now - 3600)) {
                    $count = 0;
                }

                if ($count >= 3) {
                    $error = $language === 'en'
                        ? 'Too many resend attempts. Try again later.'
                        : 'Příliš mnoho požadavků na znovu odeslání. Zkus to později.';
                } else {
                    $verifyToken = bin2hex(random_bytes(32));
                    $verifyExpires = date('Y-m-d H:i:s', time() + 24 * 3600);

                    $stmt = $pdo->prepare('
                        UPDATE users
                        SET verify_token = ?,
                            verify_expires = ?,
                            resend_verify_requested_at = NOW(),
                            resend_verify_count = ?
                        WHERE id = ?
                    ');
                    $stmt->execute([$verifyToken, $verifyExpires, $count + 1, (int) $user['id']]);

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
                        ? 'If the email exists, we sent a verification link.'
                        : 'Pokud e-mail existuje, poslali jsme ověřovací odkaz.';
                }
            }
        } catch (Exception $e) {
            $error = $language === 'en'
                ? 'Could not resend verification. Try later.'
                : 'Nepodařilo se znovu odeslat ověřovací e-mail. Zkus později.';
            log_error('resend-verification.php exception: ' . $e->getMessage());
        }
    }
}

$page_title = $language === 'en' ? 'Resend verification' : 'Znovu odeslat ověření';
include 'header.php';
?>

<form method="post" class="auth-card">
    <h1 class="auth-title"><?= $language === 'en' ? 'Resend verification' : 'Znovu odeslat ověření' ?></h1>
    <p class="auth-subtitle">
        <?= $language === 'en' ? 'Enter your email to resend the verification link.' : 'Zadej svůj e-mail pro opětovné odeslání ověřovacího odkazu.' ?>
    </p>

    <?php if ($message): ?>
        <div class="auth-success"><?= htmlspecialchars($message) ?></div>
    <?php endif; ?>

    <?php if ($error): ?>
        <div class="auth-error"><?= htmlspecialchars($error) ?></div>
    <?php endif; ?>

    <div class="row">
        <label><?= $language === 'en' ? 'E-mail' : 'E-mail' ?></label>
        <input type="email" name="email" value="<?= htmlspecialchars($_POST['email'] ?? $_GET['email'] ?? '') ?>" required>
    </div>

    <div class="auth-actions">
        <button type="submit"><?= $language === 'en' ? 'Resend' : 'Odeslat znovu' ?></button>
    </div>

    <p class="auth-links"><a href="login.php"><?= $language === 'en' ? 'Back to sign in' : 'Zpět na přihlášení' ?></a></p>
</form>

<?php include 'footer.php'; ?>
