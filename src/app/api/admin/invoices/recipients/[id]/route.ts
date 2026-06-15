import {
  deleteInvoiceAlertRecipient,
  updateInvoiceAlertRecipient,
} from "@/lib/invoice-service";
import { requireInvoiceRecipientAdminApiActor } from "@/lib/require-invoice-api";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireInvoiceRecipientAdminApiActor();
  if ("error" in access) {
    return access.error;
  }

  const { id } = await context.params;
  const body = (await request.json()) as { isActive?: boolean };

  try {
    const recipients = await updateInvoiceAlertRecipient(id, body);
    return NextResponse.json({ recipients });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update alert recipient.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const access = await requireInvoiceRecipientAdminApiActor();
  if ("error" in access) {
    return access.error;
  }

  const { id } = await context.params;

  try {
    const recipients = await deleteInvoiceAlertRecipient(id);
    return NextResponse.json({ recipients });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to remove alert recipient.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
