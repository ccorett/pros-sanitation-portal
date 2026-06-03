import {
  createCleaningJob,
  listCleaningJobsForActor,
} from "@/lib/cleaning-jobs-service";
import { JobPriority } from "@prisma/client";
import { toEmployeeAccessContext } from "@/lib/portal-route-access";
import { requireManagerApiActor } from "@/lib/require-manager-api";
import { requirePortalStaffActor } from "@/lib/require-portal-staff-api";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const authResult = await requirePortalStaffActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const ctx = await toEmployeeAccessContext(authResult.actor);
  const jobs = await listCleaningJobsForActor(authResult.actor, ctx);

  return NextResponse.json({ jobs });
}

export async function POST(request: NextRequest) {
  const authResult = await requireManagerApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const body = (await request.json()) as {
    title?: string;
    clientLocationId?: string;
    serviceType?: string;
    assignedEmployeeId?: string | null;
    scheduledDate?: string;
    dueDate?: string;
    priority?: JobPriority;
    notes?: string | null;
  };

  if (
    !body.title?.trim() ||
    !body.clientLocationId ||
    !body.serviceType?.trim() ||
    !body.scheduledDate ||
    !body.dueDate
  ) {
    return NextResponse.json(
      {
        error:
          "title, clientLocationId, serviceType, scheduledDate, and dueDate are required.",
      },
      { status: 400 },
    );
  }

  const assignedBy = `${authResult.actor.firstName} ${authResult.actor.lastName}`.trim();

  try {
    const job = await createCleaningJob({
      title: body.title,
      clientLocationId: body.clientLocationId,
      serviceType: body.serviceType,
      assignedEmployeeId: body.assignedEmployeeId,
      assignedBy,
      scheduledDate: body.scheduledDate,
      dueDate: body.dueDate,
      priority: body.priority,
      notes: body.notes,
    });

    return NextResponse.json({ job }, { status: 201 });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Unable to create job.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
