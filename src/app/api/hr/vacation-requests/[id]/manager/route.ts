import { requireManagerApiActor } from "@/lib/require-manager-api";
import { managerReviewVacationRequest } from "@/lib/vacation-request-service";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const authResult = await requireManagerApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    action?: "APPROVED" | "REJECTED";
    managerNotes?: string;
  };

  if (body.action !== "APPROVED" && body.action !== "REJECTED") {
    return NextResponse.json(
      { error: "action must be APPROVED or REJECTED." },
      { status: 400 },
    );
  }

  try {
    const updated = await managerReviewVacationRequest({
      requestId: id,
      action: body.action,
      managerNotes: body.managerNotes,
      reviewer: authResult.actor,
    });

    return NextResponse.json({ request: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update vacation request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
