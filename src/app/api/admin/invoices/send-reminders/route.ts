import { sendInvoiceReminders } from "@/lib/invoice-service";
import { verifyInvoiceCronSecret } from "@/lib/require-invoice-api";
import { NextResponse } from "next/server";

/**
 * Cron entry point for grouped invoice reminder emails.
 *
 * Vercel Cron example (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/admin/invoices/send-reminders",
 *     "schedule": "0 12 * * *"
 *   }]
 * }
 *
 * Protect with Authorization: Bearer $ADMIN_API_SECRET
 * or ?secret=$ADMIN_API_SECRET when invoking manually.
 */
export async function GET(request: Request) {
  return POST(request);
}

export async function POST(request: Request) {
  if (!verifyInvoiceCronSecret(request)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const results = await sendInvoiceReminders();
    return NextResponse.json({ ok: true, results });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to send invoice reminders.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
