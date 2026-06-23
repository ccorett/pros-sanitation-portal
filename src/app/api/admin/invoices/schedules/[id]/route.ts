import {
  markInvoiceScheduleGenerated,
  markInvoiceScheduleSubmitted,
  snoozeInvoiceSchedule,
  updateInvoiceScheduleRemarks,
} from "@/lib/invoice-service";
import { requireInvoiceProcessApiActor } from "@/lib/require-invoice-api";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireInvoiceProcessApiActor();
  if ("error" in access) {
    return access.error;
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    action?: "snooze" | "generated" | "submitted" | "remarks";
    snoozedUntil?: string;
    snoozeDays?: number;
    remarks?: string | null;
  };

  try {
    let schedules;
    switch (body.action) {
      case "snooze":
        schedules = await snoozeInvoiceSchedule(id, {
          snoozedUntil: body.snoozedUntil,
          snoozeDays: body.snoozeDays,
          remarks: body.remarks,
        });
        break;
      case "generated":
        schedules = await markInvoiceScheduleGenerated(
          id,
          `${access.actor.firstName} ${access.actor.lastName}`.trim() ||
            access.actor.companyEmail,
        );
        break;
      case "submitted":
        schedules = await markInvoiceScheduleSubmitted(
          id,
          `${access.actor.firstName} ${access.actor.lastName}`.trim() ||
            access.actor.companyEmail,
        );
        break;
      case "remarks":
        schedules = await updateInvoiceScheduleRemarks(id, body.remarks ?? null);
        break;
      default:
        return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    return NextResponse.json({ schedules });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update invoice schedule.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
