import { COMPANY } from "@/lib/constants";

type SendPasswordResetEmailInput = {
  to: string;
  url: string;
};

export async function sendPasswordResetEmail({
  to,
  url,
}: SendPasswordResetEmailInput): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.PASSWORD_RESET_EMAIL_FROM ??
    `${COMPANY.shortName} Portal <noreply@prossanitation.com>`;

  const subject = `Reset your ${COMPANY.shortName} company PIN`;
  const text = [
    `You requested a PIN reset for your ${COMPANY.name} employee account.`,
    "",
    "Reset your PIN using this link (expires in 1 hour):",
    url,
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  if (resendApiKey) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Failed to send password reset email: ${detail}`);
    }
    return;
  }

  if (process.env.NODE_ENV === "development") {
    console.info(`[password-reset] To: ${to}\n${text}`);
    return;
  }

  console.warn(
    `[password-reset] RESEND_API_KEY is not set. Reset link for ${to}: ${url}`,
  );
}
