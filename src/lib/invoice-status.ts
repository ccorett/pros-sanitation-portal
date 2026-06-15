import type { InvoiceScheduleStatus } from "@prisma/client";

export type InvoiceStatusColor = "green" | "yellow" | "red" | "blue" | "neutral";

export function getInvoiceStatusColor(status: InvoiceScheduleStatus): InvoiceStatusColor {
  switch (status) {
    case "SUBMITTED":
      return "green";
    case "DUE_SOON":
      return "yellow";
    case "DUE":
    case "OVERDUE":
      return "red";
    case "SNOOZED":
      return "blue";
    case "GENERATED":
      return "neutral";
    case "UPCOMING":
    default:
      return "green";
  }
}

export function invoiceStatusBadgeClass(status: InvoiceScheduleStatus): string {
  const color = getInvoiceStatusColor(status);
  switch (color) {
    case "green":
      return "border-[#6cc801]/30 bg-[#6cc801]/10 text-[#6cc801]";
    case "yellow":
      return "border-[#f5c542]/30 bg-[#f5c542]/10 text-[#f5c542]";
    case "red":
      return "border-[#ff4d4f]/30 bg-[#ff4d4f]/10 text-[#ff4d4f]";
    case "blue":
      return "border-[#00c6ff]/30 bg-[#00c6ff]/10 text-[#00c6ff]";
    default:
      return "border-[#ebfbff]/20 bg-[#ebfbff]/5 text-[#ebfbff]/70";
  }
}

export function invoiceStatusLabel(status: InvoiceScheduleStatus): string {
  return status
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

export function invoiceRowBorderClass(status: InvoiceScheduleStatus): string {
  const color = getInvoiceStatusColor(status);
  switch (color) {
    case "yellow":
      return "border-l-[#f5c542]";
    case "red":
      return "border-l-[#ff4d4f]";
    case "blue":
      return "border-l-[#00c6ff]";
    case "green":
      return "border-l-[#6cc801]";
    default:
      return "border-l-[#ebfbff]/20";
  }
}
