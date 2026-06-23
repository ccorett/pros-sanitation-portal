export const INVOICE_EMAIL_CONFIG_WARNING =
  "Invoice reminders are disabled. Email configuration incomplete.";

export const INVOICE_RESEND_API_KEY_ENV = "RESEND_API_KEY";
export const INVOICE_EMAIL_FROM_ENV = "INVOICE_EMAIL_FROM";

export type InvoiceEmailConfigStatus = {
  configured: boolean;
  missing: string[];
};

export type InvoiceEmailConnectionDiagnostics = {
  resendApiKeyPresent: boolean;
  resendApiKeyStartsWithRe: boolean;
  invoiceEmailFromPresent: boolean;
  invoiceEmailFrom: string | null;
  activeRecipientCount: number;
  activeRecipients: Array<{ name: string; email: string }>;
  configured: boolean;
  missing: string[];
  checkedAt: string;
  runtime: "server";
  variableNames: {
    resendApiKey: typeof INVOICE_RESEND_API_KEY_ENV;
    invoiceEmailFrom: typeof INVOICE_EMAIL_FROM_ENV;
  };
};

/** Normalize env values pasted from Vercel (trim whitespace and wrapping quotes). */
export function readServerEnv(name: string): string {
  const raw = process.env[name];
  if (typeof raw !== "string") {
    return "";
  }

  let value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }

  return value;
}

export function getResendApiKey(): string {
  return readServerEnv(INVOICE_RESEND_API_KEY_ENV);
}

export function getInvoiceEmailFrom(): string {
  return readServerEnv(INVOICE_EMAIL_FROM_ENV);
}

export function getInvoiceEmailConfigStatus(): InvoiceEmailConfigStatus {
  const missing: string[] = [];

  if (!getResendApiKey()) {
    missing.push(INVOICE_RESEND_API_KEY_ENV);
  }

  if (!getInvoiceEmailFrom()) {
    missing.push(INVOICE_EMAIL_FROM_ENV);
  }

  return {
    configured: missing.length === 0,
    missing,
  };
}

export function assertInvoiceEmailConfigured(): void {
  const status = getInvoiceEmailConfigStatus();
  if (!status.configured) {
    throw new Error(
      `${INVOICE_EMAIL_CONFIG_WARNING} Missing: ${status.missing.join(", ")}.`,
    );
  }
}

export function getInvoiceEmailFromAddress(): string {
  const from = getInvoiceEmailFrom();
  if (!from) {
    throw new Error(`${INVOICE_EMAIL_CONFIG_WARNING} INVOICE_EMAIL_FROM is not set.`);
  }
  return from;
}

export function buildInvoiceEmailConnectionDiagnostics(input: {
  activeRecipientCount: number;
  activeRecipients: Array<{ name: string; email: string }>;
}): InvoiceEmailConnectionDiagnostics {
  const resendApiKey = getResendApiKey();
  const invoiceEmailFrom = getInvoiceEmailFrom();
  const missing: string[] = [];

  if (!resendApiKey) {
    missing.push(INVOICE_RESEND_API_KEY_ENV);
  }

  if (!invoiceEmailFrom) {
    missing.push(INVOICE_EMAIL_FROM_ENV);
  }

  return {
    resendApiKeyPresent: Boolean(resendApiKey),
    resendApiKeyStartsWithRe: resendApiKey.startsWith("re_"),
    invoiceEmailFromPresent: Boolean(invoiceEmailFrom),
    invoiceEmailFrom: invoiceEmailFrom || null,
    activeRecipientCount: input.activeRecipientCount,
    activeRecipients: input.activeRecipients,
    configured: missing.length === 0,
    missing,
    checkedAt: new Date().toISOString(),
    runtime: "server",
    variableNames: {
      resendApiKey: INVOICE_RESEND_API_KEY_ENV,
      invoiceEmailFrom: INVOICE_EMAIL_FROM_ENV,
    },
  };
}
