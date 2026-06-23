import {
  countUnreadInvoiceNotifications,
  listInvoiceNotifications,
  type InvoiceNotificationFilter,
} from "@/lib/invoice-notification-service";
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

function parseLimit(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return undefined;
  }

  return Math.min(parsed, 50);
}

export async function GET(request: Request) {
  const access = await requireInvoiceApiActor();
  if ("error" in access) {
    return access.error;
  }

  const { searchParams } = new URL(request.url);
  const filter = parseFilter(searchParams.get("filter"));
  const limit = parseLimit(searchParams.get("limit"));

  const [notifications, unreadCount] = await Promise.all([
    listInvoiceNotifications(filter, { limit }),
    countUnreadInvoiceNotifications(),
  ]);

  return NextResponse.json({ notifications, filter, unreadCount });
}
