import { AccessLevel } from "@prisma/client";
import { requirePortalStaffActor } from "@/lib/require-portal-staff-api";
import { supervisorReviewVacationRequest } from "@/lib/vacation-request-service";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const authResult = await requirePortalStaffActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  if (authResult.actor.accessLevel !== AccessLevel.SUPERVISOR) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    action?: "AWARE" | "UNAWARE";
    supervisorNotes?: string;
  };

  if (body.action !== "AWARE" && body.action !== "UNAWARE") {
    return NextResponse.json(
      { error: "action must be AWARE or UNAWARE." },
      { status: 400 },
    );
  }

  try {
    const updated = await supervisorReviewVacationRequest({
      requestId: id,
      action: body.action,
      supervisorNotes: body.supervisorNotes,
      supervisor: authResult.actor,
    });

    return NextResponse.json({ request: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update vacation request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
