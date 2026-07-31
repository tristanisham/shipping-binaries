const FROM_ADDRESS: EmailAddress = {
  email: "noreply@shippingbinaries.com",
  name: "Shipping Binaries",
};

export const sendSubscriberConfirmationEmail = async (
  email: SendEmail,
  input: { accountUrl: string; confirmationUrl: string; to: string },
): Promise<void> => {
  await email.send({
    from: FROM_ADDRESS,
    to: input.to,
    subject: "Confirm your Shipping Binaries subscription",
    html: `<!doctype html>
<html lang="en">
  <body style="background:#fffbeb;color:#465457;font-family:Arial,sans-serif;margin:0;padding:32px">
    <main style="margin:0 auto;max-width:560px">
      <h1>Confirm your subscription</h1>
      <p>Confirm that you want to receive new Shipping Binaries posts at this address.</p>
      <p style="margin:28px 0">
        <a href="${input.confirmationUrl}" style="background:#7c2d12;border-radius:6px;color:#fef3c7;display:inline-block;font-weight:700;padding:12px 18px;text-decoration:none">Confirm subscription</a>
      </p>
      <p>After confirming, you can <a href="${input.accountUrl}">create an account</a> to manage your subscription and join the conversation.</p>
      <p>If you did not request this message, you can safely ignore it.</p>
    </main>
  </body>
</html>`,
    text:
      `Confirm your subscription to Shipping Binaries: ${input.confirmationUrl}\n\nAfter confirming, create an account to manage your subscription and join the conversation: ${input.accountUrl}\n\nIf you did not request this message, you can safely ignore it.`,
  });
};
