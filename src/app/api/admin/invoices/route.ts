import {
  listInvoiceAlertRecipients,
  listInvoiceClients,
  listInvoiceSchedules,
} from "@/lib/invoice-service";
import {
  buildInvoiceAccessContext,
  canManageInvoiceAlertRecipients,
  canManageInvoiceClients,
  resolveEmployeeResponsibilitiesForActor,
} from "@/lib/invoice-access";
import { requireInvoiceApiActor } from "@/lib/require-invoice-api";
import { NextResponse } from "next/server";

export async function GET() {
  const access = await requireInvoiceApiActor();
  if ("error" in access) {
    return access.error;
  }

  const responsibilities = await resolveEmployeeResponsibilitiesForActor(
    access.actor,
  );
  const accessContext = buildInvoiceAccessContext(access.actor, responsibilities);

  const [clients, schedules, recipients] = await Promise.all([
    listInvoiceClients(),
    listInvoiceSchedules({ includeSubmitted: true }),
    listInvoiceAlertRecipients(),
  ]);

  return NextResponse.json({
    clients,
    schedules,
    recipients,
    permissions: {
      canManageClients: canManageInvoiceClients(accessContext),
      canManageRecipients: canManageInvoiceAlertRecipients(accessContext),
      canProcessSchedules: true,
    },
  });
}
