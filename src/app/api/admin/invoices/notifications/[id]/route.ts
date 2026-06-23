import {
  markInvoiceNotificationRead,
  markInvoiceNotificationUnread,
} from "@/lib/invoice-notification-service";
import { requireInvoiceApiActor } from "@/lib/require-invoice-api";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireInvoiceApiActor();
  if ("error" in access) {
    return access.error;
  }

  const { id } = await context.params;
  const body = (await request.json()) as { action?: "read" | "unread" };

  const actor = {
    name: `${access.actor.firstName} ${access.actor.lastName}`.trim() || access.actor.companyEmail,
    email: access.actor.companyEmail,
  };

  try {
    const notification =
      body.action === "unread"
        ? await markInvoiceNotificationUnread(id, actor)
        : await markInvoiceNotificationRead(id, actor);

    return NextResponse.json({ notification });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update notification.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
