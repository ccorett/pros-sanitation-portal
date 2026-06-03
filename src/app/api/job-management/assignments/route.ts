import {
  createJobAssignment,
  listJobAssignmentsForActor,
} from "@/lib/job-assignment-service";
import { requireManagerApiActor } from "@/lib/require-manager-api";
import { requirePortalStaffActor } from "@/lib/require-portal-staff-api";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const authResult = await requirePortalStaffActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const assignments = await listJobAssignmentsForActor(authResult.actor);

  return NextResponse.json({ assignments });
}

export async function POST(request: NextRequest) {
  const authResult = await requireManagerApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const body = (await request.json()) as {
    employeeId?: string;
    clientLocationId?: string;
    assignedRole?: string;
  };

  if (!body.employeeId || !body.clientLocationId || !body.assignedRole?.trim()) {
    return NextResponse.json(
      { error: "employeeId, clientLocationId, and assignedRole are required." },
      { status: 400 },
    );
  }

  const assignedBy = `${authResult.actor.firstName} ${authResult.actor.lastName}`.trim();

  try {
    const assignment = await createJobAssignment({
      employeeId: body.employeeId,
      clientLocationId: body.clientLocationId,
      assignedRole: body.assignedRole,
      assignedBy,
    });

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "Unable to create assignment.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
