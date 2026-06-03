import {
  getCleaningClientLocationById,
  updateCleaningClientLocation,
} from "@/lib/job-management-service";
import { canAccessCleaningLocation } from "@/lib/job-assignment-access";
import { toEmployeeAccessContext } from "@/lib/portal-route-access";
import { requireManagerApiActor } from "@/lib/require-manager-api";
import { requirePortalStaffActor } from "@/lib/require-portal-staff-api";
import { ClientLocationStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const authResult = await requirePortalStaffActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;
  const location = await getCleaningClientLocationById(id);

  if (!location) {
    return NextResponse.json({ error: "Location not found." }, { status: 404 });
  }

  const accessContext = await toEmployeeAccessContext(authResult.actor);

  if (!canAccessCleaningLocation(accessContext, location.slug)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  return NextResponse.json({ location });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const authResult = await requireManagerApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    locationName?: string;
    clientName?: string;
    serviceType?: string;
    area?: string;
    address?: string;
    assignedTechnician?: string;
    serviceDay?: string;
    status?: ClientLocationStatus;
    lastServiceDate?: string | null;
    nextServiceDate?: string | null;
    notes?: string | null;
  };

  try {
    const location = await updateCleaningClientLocation(id, body);
    return NextResponse.json({ location });
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "Unable to update location.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
