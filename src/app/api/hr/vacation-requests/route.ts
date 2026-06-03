import {
  createVacationRequest,
  listVacationRequestsForActor,
} from "@/lib/vacation-request-service";
import { requirePortalStaffActor } from "@/lib/require-portal-staff-api";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const authResult = await requirePortalStaffActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const requests = await listVacationRequestsForActor(authResult.actor);

  return NextResponse.json({ requests });
}

export async function POST(request: NextRequest) {
  const authResult = await requirePortalStaffActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const body = (await request.json()) as {
    startDate?: string;
    endDate?: string;
    reason?: string;
  };

  if (!body.startDate || !body.endDate || !body.reason) {
    return NextResponse.json(
      { error: "startDate, endDate, and reason are required." },
      { status: 400 },
    );
  }

  try {
    const created = await createVacationRequest({
      startDate: body.startDate,
      endDate: body.endDate,
      reason: body.reason,
      requester: authResult.actor,
    });

    return NextResponse.json({ request: created }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create vacation request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
