const FROM_ADDRESS: EmailAddress = {
  email: "noreply@shippingbinaries.com",
  name: "Shipping Binaries",
};

export const sendSubscriberConfirmationEmail = async (
  email: SendEmail,
  input: { accountUrl: string; to: string },
): Promise<void> => {
  await email.send({
    from: FROM_ADDRESS,
    to: input.to,
    subject: "Thank you for subscribing to Shipping Binaries",
    html: `<!doctype html>
<html lang="en">
  <body style="background:#fffbeb;color:#465457;font-family:Arial,sans-serif;margin:0;padding:32px">
    <main style="margin:0 auto;max-width:560px">
      <h1>Thank you for subscribing</h1>
      <p>Your email subscription to Shipping Binaries is confirmed.</p>
      <p>Create an account to manage your subscription and join the conversation.</p>
      <p style="margin:28px 0">
        <a href="${input.accountUrl}" style="background:#7c2d12;border-radius:6px;color:#fef3c7;display:inline-block;font-weight:700;padding:12px 18px;text-decoration:none">Create an account</a>
      </p>
      <p>You can also create an account at <a href="${input.accountUrl}">${input.accountUrl}</a>.</p>
    </main>
  </body>
</html>`,
    text:
      `Thank you for subscribing.\n\nYour email subscription to Shipping Binaries is confirmed.\n\nCreate an account to manage your subscription and join the conversation: ${input.accountUrl}`,
  });
};
