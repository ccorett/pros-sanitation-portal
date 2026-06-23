import {
  getInvoiceAlertSummary,
  listInvoiceClients,
  listInvoiceSchedules,
} from "@/lib/invoice-service";
import {
  buildInvoiceAccessContext,
  canManageInvoiceClients,
  canProcessInvoiceSchedules,
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

  const [clients, schedules, alertSummary] = await Promise.all([
    listInvoiceClients(),
    listInvoiceSchedules({ includeSubmitted: true }),
    getInvoiceAlertSummary(),
  ]);

  return NextResponse.json({
    clients,
    schedules,
    alertSummary,
    permissions: {
      canManageClients: canManageInvoiceClients(accessContext),
      canProcessSchedules: canProcessInvoiceSchedules(accessContext),
    },
  });
}
