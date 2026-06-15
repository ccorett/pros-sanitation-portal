import type { InvoiceBillingCycle, InvoiceServiceType } from "@prisma/client";

export const INVOICE_SERVICE_TYPE_OPTIONS: Array<{
  value: InvoiceServiceType;
  label: string;
}> = [
  { value: "CLEANING_SERVICES", label: "Cleaning Services" },
  { value: "BIN_SERVICES", label: "Bin Services" },
  { value: "OTHER", label: "Other" },
];

export function invoiceServiceTypeLabel(serviceType: InvoiceServiceType): string {
  return (
    INVOICE_SERVICE_TYPE_OPTIONS.find((option) => option.value === serviceType)?.label ??
    serviceType
  );
}

export function invoiceBillingCycleLabel(cycle: InvoiceBillingCycle): string {
  switch (cycle) {
    case "MONTHLY":
      return "Monthly";
    case "ANNUALLY":
      return "Annually";
    default:
      return cycle;
  }
}

export function formatInvoiceClientKey(input: {
  clientName: string;
  serviceType: InvoiceServiceType;
  billingCycle: InvoiceBillingCycle;
}): string {
  return `${input.clientName.trim()} · ${invoiceServiceTypeLabel(input.serviceType)} · ${invoiceBillingCycleLabel(input.billingCycle)}`;
}
