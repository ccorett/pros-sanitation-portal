import { COMPANY } from "@/lib/constants";
import {
  assertInvoiceEmailConfigured,
  getInvoiceEmailFromAddress,
} from "@/lib/invoice-email-config";

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

  assertInvoiceEmailConfigured();

  const resendApiKey = process.env.RESEND_API_KEY!.trim();
  const from = getInvoiceEmailFromAddress();

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

export function buildOverdueReminderEmailBody(
  invoices: Array<{
    clientName: string;
    serviceTypeLabel: string;
    dueDate: string;
    invoiceCount: number;
  }>,
): string {
  const lines = invoices.map(
    (item) =>
      `- ${item.clientName} (${item.serviceTypeLabel}): ${item.invoiceCount} invoice(s) overdue since ${item.dueDate}`,
  );

  return [
    "The following client invoices are overdue and have not been submitted:",
    "",
    ...lines,
    "",
    `Log in to the ${COMPANY.shortName} portal to update invoice status.`,
  ].join("\n");
}
