import {
  createInvoiceAlertRecipient,
  listInvoiceAlertRecipients,
} from "@/lib/invoice-service";
import { requireInvoiceRecipientAdminApiActor } from "@/lib/require-invoice-api";
import { NextResponse } from "next/server";

export async function GET() {
  const access = await requireInvoiceRecipientAdminApiActor();
  if ("error" in access) {
    return access.error;
  }

  const recipients = await listInvoiceAlertRecipients();
  return NextResponse.json({ recipients });
}

export async function POST(request: Request) {
  const access = await requireInvoiceRecipientAdminApiActor();
  if ("error" in access) {
    return access.error;
  }

  const body = (await request.json()) as {
    name?: string;
    email?: string;
    roleLabel?: string | null;
  };

  if (!body.name?.trim() || !body.email?.trim()) {
    return NextResponse.json(
      { error: "Name and email are required." },
      { status: 400 },
    );
  }

  try {
    const recipients = await createInvoiceAlertRecipient({
      name: body.name,
      email: body.email,
      roleLabel: body.roleLabel,
    });
    return NextResponse.json({ recipients });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to add alert recipient.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
