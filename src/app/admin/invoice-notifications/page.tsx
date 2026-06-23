import { redirect } from "next/navigation";

export default function AdminInvoiceNotificationsRedirectPage() {
  redirect("/admin/invoices?tab=notifications");
}
