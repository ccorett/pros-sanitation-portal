import { InvoiceNotificationType } from "@prisma/client";

export function invoiceNotificationTypeBadgeClass(
  type: InvoiceNotificationType,
): string {
  switch (type) {
    case InvoiceNotificationType.DUE_SOON:
      return "border-[#faad14]/35 bg-[#faad14]/15 text-[#faad14]";
    case InvoiceNotificationType.DUE_TODAY:
    case InvoiceNotificationType.OVERDUE:
      return "border-[#ff4d4f]/35 bg-[#ff4d4f]/15 text-[#ff4d4f]";
    case InvoiceNotificationType.GENERATED:
      return "border-[#00c6ff]/35 bg-[#00c6ff]/15 text-[#00c6ff]";
    case InvoiceNotificationType.SUBMITTED:
      return "border-[#6cc801]/35 bg-[#6cc801]/15 text-[#6cc801]";
    default:
      return "border-[#ebfbff]/20 bg-[#ebfbff]/10 text-[#ebfbff]/70";
  }
}

export function invoiceNotificationStatusBadgeClass(status: "UNREAD" | "READ"): string {
  if (status === "UNREAD") {
    return "border-[#faad14]/35 bg-[#faad14]/15 text-[#faad14]";
  }
  return "border-[#ebfbff]/20 bg-[#ebfbff]/10 text-[#ebfbff]/60";
}

export const INVOICE_NOTIFICATION_FILTERS = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
  { value: "due_soon", label: "Due Soon" },
  { value: "due_today", label: "Due Today" },
  { value: "overdue", label: "Overdue" },
  { value: "generated", label: "Generated" },
  { value: "submitted", label: "Submitted" },
] as const;
