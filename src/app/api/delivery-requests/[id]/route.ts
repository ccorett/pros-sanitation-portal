import { updateDeliveryRequest } from "@/lib/delivery-request-service";
import { requirePortalStaffActor } from "@/lib/require-portal-staff-api";
import type { DeliveryRequestStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const authResult = await requirePortalStaffActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await params;
  const body = (await request.json()) as {
    action?: "assignDriver" | "updateStatus" | "addNote" | "close";
    assignedDriverId?: string;
    status?: DeliveryRequestStatus;
    notes?: string;
  };

  if (
    !body.action ||
    !["assignDriver", "updateStatus", "addNote", "close"].includes(body.action)
  ) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  try {
    const updated = await updateDeliveryRequest(authResult.actor, id, {
      action: body.action,
      assignedDriverId: body.assignedDriverId,
      status: body.status,
      notes: body.notes,
    });

    return NextResponse.json({ request: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update delivery request.";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
