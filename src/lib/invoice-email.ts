import { COMPANY } from "@/lib/constants";

type SendEmailInput = {
  to: string[];
  subject: string;
  text: string;
};

export async function sendPlainEmail({
  to,
  subject,
  text,
}: SendEmailInput): Promise<void> {
  const recipients = [...new Set(to.map((email) => email.trim()).filter(Boolean))];
  if (recipients.length === 0) {
    return;
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.INVOICE_EMAIL_FROM ??
    process.env.PASSWORD_RESET_EMAIL_FROM ??
    `${COMPANY.shortName} Portal <noreply@prossanitation.com>`;

  if (resendApiKey) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject,
        text,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Failed to send email: ${detail}`);
    }
    return;
  }

  if (process.env.NODE_ENV === "development") {
    console.info(`[email] To: ${recipients.join(", ")}\nSubject: ${subject}\n${text}`);
    return;
  }

  console.warn(
    `[email] RESEND_API_KEY is not set. Would send "${subject}" to ${recipients.join(", ")}`,
  );
}

export function buildFiveDayReminderEmailBody(
  invoices: Array<{
    clientName: string;
    serviceTypeLabel: string;
    dueDate: string;
    invoiceCount: number;
  }>,
): string {
  const lines = invoices.map(
    (item) =>
      `- ${item.clientName} (${item.serviceTypeLabel}): ${item.invoiceCount} invoice(s) due ${item.dueDate}`,
  );

  return [
    "The following client invoices are due in 5 days:",
    "",
    ...lines,
    "",
    `Log in to the ${COMPANY.shortName} portal to review and update invoice status.`,
  ].join("\n");
}

export function buildDueDateReminderEmailBody(
  invoices: Array<{
    clientName: string;
    serviceTypeLabel: string;
    dueDate: string;
    invoiceCount: number;
  }>,
): string {
  const lines = invoices.map(
    (item) =>
      `- ${item.clientName} (${item.serviceTypeLabel}): ${item.invoiceCount} invoice(s) due today (${item.dueDate})`,
  );

  return [
    "The following client invoices are due today and have not been submitted:",
    "",
    ...lines,
    "",
    `Log in to the ${COMPANY.shortName} portal to mark generated/submitted status.`,
  ].join("\n");
}
