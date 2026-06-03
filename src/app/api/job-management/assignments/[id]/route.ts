import { updateJobAssignment } from "@/lib/job-assignment-service";
import { requireManagerApiActor } from "@/lib/require-manager-api";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const authResult = await requireManagerApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    assignedRole?: string;
    assignedBy?: string;
    isActive?: boolean;
  };

  try {
    const assignment = await updateJobAssignment(id, {
      assignedRole: body.assignedRole,
      assignedBy: body.assignedBy,
      isActive: body.isActive,
    });

    return NextResponse.json({ assignment });
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "Unable to update assignment.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
