import {
  createDeliveryRequest,
  listDeliveryDrivers,
  listDeliveryRequestsForActor,
} from "@/lib/delivery-request-service";
import { resolveDeliveryActorContext } from "@/lib/delivery-access";
import { requirePortalStaffActor } from "@/lib/require-portal-staff-api";
import type { DeliveryPriority } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const authResult = await requirePortalStaffActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const deliveryContext = await resolveDeliveryActorContext(authResult.actor);
  if (!deliveryContext.canAccess) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const includeDrivers =
    request.nextUrl.searchParams.get("includeDrivers") === "1";

  try {
    const requests = await listDeliveryRequestsForActor(authResult.actor);
    const drivers =
      includeDrivers &&
      (deliveryContext.isManager || deliveryContext.isCoordinator)
        ? await listDeliveryDrivers()
        : undefined;

    return NextResponse.json({
      requests,
      drivers,
      role: {
        isManager: deliveryContext.isManager,
        isCoordinator: deliveryContext.isCoordinator,
        isDriver: deliveryContext.isDriver,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load delivery requests.";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requirePortalStaffActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const body = (await request.json()) as {
    items?: { itemName?: string; quantity?: number; inventoryItemId?: string }[];
    requestedByName?: string;
    requestedByEmail?: string;
    requestingLocation?: string;
    responsibleSupervisorName?: string;
    responsibleSupervisorId?: string;
    priority?: DeliveryPriority;
    requestedDate?: string;
    notes?: string;
    equipmentRequestId?: string;
  };

  try {
    const created = await createDeliveryRequest(authResult.actor, {
      items: (body.items ?? []).map((item) => ({
        itemName: item.itemName?.trim() ?? "",
        quantity: Number(item.quantity ?? 0),
        inventoryItemId: item.inventoryItemId,
      })),
      requestedByName: body.requestedByName?.trim() ?? "",
      requestedByEmail: body.requestedByEmail?.trim() ?? "",
      requestingLocation: body.requestingLocation?.trim() ?? "",
      responsibleSupervisorName: body.responsibleSupervisorName,
      responsibleSupervisorId: body.responsibleSupervisorId,
      priority: body.priority,
      requestedDate: body.requestedDate,
      notes: body.notes,
      equipmentRequestId: body.equipmentRequestId,
    });

    return NextResponse.json({ request: created });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create delivery request.";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
