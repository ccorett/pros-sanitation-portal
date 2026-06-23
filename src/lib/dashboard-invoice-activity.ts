export type DashboardInvoiceActivityKey =
  | "invoiceAlerts"
  | "invoicesDueSoon"
  | "invoicesDueToday"
  | "overdueInvoices";

export type DashboardInvoiceActivityItem = {
  key: DashboardInvoiceActivityKey;
  label: string;
  href: string;
  count: number;
};

export const DASHBOARD_INVOICE_ACTIVITY_LINKS: Array<{
  key: DashboardInvoiceActivityKey;
  label: string;
  href: string;
}> = [
  {
    key: "invoiceAlerts",
    label: "Invoice Alerts",
    href: "/admin/invoices?tab=notifications",
  },
  {
    key: "invoicesDueSoon",
    label: "Invoices Due Soon",
    href: "/admin/invoices",
  },
  {
    key: "invoicesDueToday",
    label: "Invoices Due Today",
    href: "/admin/invoices",
  },
  {
    key: "overdueInvoices",
    label: "Overdue Invoices",
    href: "/admin/invoices",
  },
];
