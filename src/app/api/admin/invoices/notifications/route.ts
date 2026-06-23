import type { InvoiceNotificationFilter } from "@/lib/invoice-notification-service";
import { listInvoiceNotifications } from "@/lib/invoice-notification-service";
import { requireInvoiceApiActor } from "@/lib/require-invoice-api";
import { NextResponse } from "next/server";

function parseFilter(value: string | null): InvoiceNotificationFilter {
  switch (value) {
    case "unread":
    case "read":
    case "due_soon":
    case "due_today":
    case "overdue":
    case "generated":
    case "submitted":
      return value;
    default:
      return "all";
  }
}

export async function GET(request: Request) {
  const access = await requireInvoiceApiActor();
  if ("error" in access) {
    return access.error;
  }

  const { searchParams } = new URL(request.url);
  const filter = parseFilter(searchParams.get("filter"));

  const notifications = await listInvoiceNotifications(filter);
  return NextResponse.json({ notifications, filter });
}
