import { reviewEquipmentRequest } from "@/lib/equipment-request-service";
import { requireManagerApiActor } from "@/lib/require-manager-api";
import type { EquipmentRequestStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

const ALLOWED_STATUSES: EquipmentRequestStatus[] = [
  "APPROVED",
  "REJECTED",
  "FULFILLED",
  "CANCELLED",
];

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireManagerApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await params;
  const body = (await request.json()) as {
    status?: EquipmentRequestStatus;
    decisionNotes?: string | null;
  };

  if (!body.status || !ALLOWED_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  try {
    const updated = await reviewEquipmentRequest({
      requestId: id,
      status: body.status,
      reviewer: authResult.actor,
      decisionNotes: body.decisionNotes,
    });

    return NextResponse.json({ request: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update equipment request.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
