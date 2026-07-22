const FROM_ADDRESS: EmailAddress = {
  email: "noreply@shippingbinaries.com",
  name: "Shipping Binaries",
};

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);

const actionEmailHtml = (
  heading: string,
  greeting: string,
  message: string,
  actionLabel: string,
  actionUrl: string,
  expiration: string,
): string => `<!doctype html>
<html lang="en">
  <body style="background:#fffbeb;color:#465457;font-family:Arial,sans-serif;margin:0;padding:32px">
    <main style="margin:0 auto;max-width:560px">
      <h1>${escapeHtml(heading)}</h1>
      <p>${escapeHtml(greeting)}</p>
      <p>${escapeHtml(message)}</p>
      <p style="margin:28px 0">
        <a href="${escapeHtml(actionUrl)}" style="background:#7c2d12;border-radius:6px;color:#fef3c7;display:inline-block;font-weight:700;padding:12px 18px;text-decoration:none">${escapeHtml(actionLabel)}</a>
      </p>
      <p>${escapeHtml(expiration)}</p>
      <p>If you did not expect this email, you can safely ignore it.</p>
    </main>
  </body>
</html>`;

const actionEmailText = (
  greeting: string,
  message: string,
  actionLabel: string,
  actionUrl: string,
  expiration: string,
): string =>
  `${greeting}\n\n${message}\n\n${actionLabel}: ${actionUrl}\n\n${expiration}\n\nIf you did not expect this email, you can safely ignore it.`;

export const sendInvitationEmail = async (
  email: SendEmail,
  input: { actionUrl: string; displayName: string; to: string },
): Promise<void> => {
  const greeting = `Hello ${input.displayName},`;
  const message =
    "You have been invited to write and manage content on Shipping Binaries. Set a password to activate your account.";
  const expiration = "This invitation expires in seven days.";

  await email.send({
    from: FROM_ADDRESS,
    to: input.to,
    subject: "You are invited to Shipping Binaries",
    html: actionEmailHtml(
      "Join Shipping Binaries",
      greeting,
      message,
      "Accept invitation",
      input.actionUrl,
      expiration,
    ),
    text: actionEmailText(
      greeting,
      message,
      "Accept invitation",
      input.actionUrl,
      expiration,
    ),
  });
};

export const sendPasswordResetEmail = async (
  email: SendEmail,
  input: { actionUrl: string; displayName: string; to: string },
): Promise<void> => {
  const greeting = `Hello ${input.displayName},`;
  const message =
    "We received a request to reset the password for your Shipping Binaries account.";
  const expiration = "This password reset link expires in one hour.";

  await email.send({
    from: FROM_ADDRESS,
    to: input.to,
    subject: "Reset your Shipping Binaries password",
    html: actionEmailHtml(
      "Reset your password",
      greeting,
      message,
      "Reset password",
      input.actionUrl,
      expiration,
    ),
    text: actionEmailText(
      greeting,
      message,
      "Reset password",
      input.actionUrl,
      expiration,
    ),
  });
};
