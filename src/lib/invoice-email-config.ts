export const INVOICE_EMAIL_CONFIG_WARNING =
  "Invoice reminders are disabled. Email configuration incomplete.";

export type InvoiceEmailConfigStatus = {
  configured: boolean;
  missing: string[];
};

export function getInvoiceEmailConfigStatus(): InvoiceEmailConfigStatus {
  const missing: string[] = [];

  if (!process.env.RESEND_API_KEY?.trim()) {
    missing.push("RESEND_API_KEY");
  }

  if (!process.env.INVOICE_EMAIL_FROM?.trim()) {
    missing.push("INVOICE_EMAIL_FROM");
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
  const from = process.env.INVOICE_EMAIL_FROM?.trim();
  if (!from) {
    throw new Error(`${INVOICE_EMAIL_CONFIG_WARNING} INVOICE_EMAIL_FROM is not set.`);
  }
  return from;
}
