import { COMPANY } from "@/lib/constants";
import {
  getInvoiceEmailFrom,
  getInvoiceEmailFromAddress,
  getResendApiKey,
} from "@/lib/invoice-email-config";

type SendEmailInput = {
  to: string[];
  subject: string;
  text: string;
};

export type ResendErrorPayload = {
  statusCode?: number;
  name?: string;
  message?: string;
};

export class ResendSendError extends Error {
  readonly statusCode?: number;
  readonly errorName?: string;
  readonly errorMessage?: string;

  constructor(safeMessage: string, payload: ResendErrorPayload = {}) {
    super(safeMessage);
    this.name = "ResendSendError";
    this.statusCode = payload.statusCode;
    this.errorName = payload.name;
    this.errorMessage = payload.message;
  }
}

export function toSafeResendErrorMessage(payload: ResendErrorPayload): string {
  const message = (payload.message ?? "").trim();
  const lower = message.toLowerCase();

  if (lower.includes("api key is invalid")) {
    return "API key is invalid";
  }

  if (
    lower.includes("not verified") ||
    lower.includes("domain is not") ||
    lower.includes("verify your domain") ||
    lower.includes("verify a domain") ||
    (lower.includes("from") && lower.includes("domain"))
  ) {
    return "Sender email is not verified";
  }

  if (lower.includes("missing") && lower.includes("from")) {
    return "Missing sender";
  }

  if (
    lower.includes("recipient") ||
    lower.includes("to field") ||
    lower.includes("at least one recipient")
  ) {
    return "No recipients";
  }

  if (payload.name === "validation_error" || lower.includes("validation")) {
    return "Resend validation error";
  }

  if (message) {
    return message;
  }

  return "Resend validation error";
}

export function logInvoiceStatusSendDiagnostics(input: {
  recipientCount: number;
  resendStatusCode?: number | null;
  resendErrorName?: string | null;
  resendErrorMessage?: string | null;
  safeError?: string | null;
  outcome: "precheck_failed" | "resend_failed" | "unexpected_error";
}) {
  console.error("[invoice-send-status]", {
    outcome: input.outcome,
    safeError: input.safeError ?? null,
    resendApiKeyPresent: Boolean(getResendApiKey()),
    invoiceEmailFromPresent: Boolean(getInvoiceEmailFrom()),
    invoiceEmailFrom: getInvoiceEmailFrom() || null,
    recipientCount: input.recipientCount,
    resendStatusCode: input.resendStatusCode ?? null,
    resendErrorName: input.resendErrorName ?? null,
    resendErrorMessage: input.resendErrorMessage ?? null,
  });
}

async function parseResendErrorResponse(
  response: Response,
): Promise<ResendSendError> {
  const detail = await response.text();
  let payload: ResendErrorPayload = { statusCode: response.status };

  try {
    const parsed = JSON.parse(detail) as ResendErrorPayload;
    payload = {
      statusCode: parsed.statusCode ?? response.status,
      name: parsed.name,
      message: parsed.message,
    };
  } catch {
    payload.message = detail.trim() || undefined;
  }

  const safeMessage = toSafeResendErrorMessage(payload);
  return new ResendSendError(safeMessage, payload);
}

export async function sendPlainEmail({
  to,
  subject,
  text,
}: SendEmailInput): Promise<void> {
  const recipients = [...new Set(to.map((email) => email.trim()).filter(Boolean))];
  if (recipients.length === 0) {
    throw new ResendSendError("No recipients");
  }

  if (!getResendApiKey()) {
    throw new ResendSendError("Missing RESEND_API_KEY");
  }

  if (!getInvoiceEmailFrom()) {
    throw new ResendSendError("Missing INVOICE_EMAIL_FROM");
  }

  const resendApiKey = getResendApiKey();
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
    throw await parseResendErrorResponse(response);
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

export function buildManualStatusUpdateEmailBody(input: {
  sentAt: string;
  sentBy: string;
  summary: {
    dueSoon: number;
    dueToday: number;
    overdue: number;
    generated: number;
    submitted: number;
    snoozed: number;
  };
  schedules: Array<{
    clientName: string;
    serviceTypeLabel: string;
    billingCycleLabel: string;
    dueDate: string;
    statusLabel: string;
    remarks: string | null;
  }>;
}): string {
  const tableHeader =
    "Client Name | Service Type | Billing Cycle | Due Date | Status | Remarks";
  const tableRows = input.schedules.map((schedule) =>
    [
      schedule.clientName,
      schedule.serviceTypeLabel,
      schedule.billingCycleLabel,
      schedule.dueDate,
      schedule.statusLabel,
      schedule.remarks?.trim() || "—",
    ].join(" | "),
  );

  return [
    "Invoice Status Update",
    "",
    `Date sent: ${input.sentAt}`,
    `Sent by: ${input.sentBy}`,
    "",
    "Summary counts:",
    `- Due Soon: ${input.summary.dueSoon}`,
    `- Due Today: ${input.summary.dueToday}`,
    `- Overdue: ${input.summary.overdue}`,
    `- Generated: ${input.summary.generated}`,
    `- Submitted: ${input.summary.submitted}`,
    `- Snoozed: ${input.summary.snoozed}`,
    "",
    tableHeader,
    ...tableRows,
    "",
    `Log in to the ${COMPANY.shortName} portal to review invoice schedules.`,
  ].join("\n");
}