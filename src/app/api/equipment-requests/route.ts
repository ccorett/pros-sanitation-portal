import {
  createEquipmentRequest,
  listEquipmentRequestsForActor,
  mapUiUrgencyToRequestUrgency,
} from "@/lib/equipment-request-service";
import { requireInventoryReadActor } from "@/lib/require-inventory-read-api";
import { requirePortalStaffActor } from "@/lib/require-portal-staff-api";
import type { RequestUrgency } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const authResult = await requirePortalStaffActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const requests = await listEquipmentRequestsForActor(authResult.actor);

  return NextResponse.json({ requests });
}

export async function POST(request: NextRequest) {
  const authResult = await requireInventoryReadActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const body = (await request.json()) as {
    inventoryItemId?: string;
    quantityRequested?: number;
    reason?: string;
    urgency?: string | RequestUrgency;
  };

  if (!body.inventoryItemId || !body.quantityRequested || !body.reason || !body.urgency) {
    return NextResponse.json(
      { error: "inventoryItemId, quantityRequested, reason, and urgency are required." },
      { status: 400 },
    );
  }

  const urgency =
    typeof body.urgency === "string" &&
    ["LOW", "NORMAL", "HIGH", "URGENT"].includes(body.urgency)
      ? (body.urgency as RequestUrgency)
      : mapUiUrgencyToRequestUrgency(body.urgency);

  try {
    const created = await createEquipmentRequest({
      inventoryItemId: body.inventoryItemId,
      quantityRequested: body.quantityRequested,
      reason: body.reason,
      urgency,
      requester: authResult.actor,
    });

    return NextResponse.json({ request: created }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create equipment request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
