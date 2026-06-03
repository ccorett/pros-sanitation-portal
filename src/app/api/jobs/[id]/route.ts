import {
  canActorAccessCleaningJob,
  getCleaningJobById,
  updateCleaningJob,
} from "@/lib/cleaning-jobs-service";
import { CleaningJobStatus, JobPriority } from "@prisma/client";
import { toEmployeeAccessContext } from "@/lib/portal-route-access";
import { isManagerOrAbove } from "@/lib/operational-access";
import { requirePortalStaffActor } from "@/lib/require-portal-staff-api";
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
  const job = await getCleaningJobById(id);

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const ctx = await toEmployeeAccessContext(authResult.actor);
  const allowed = await canActorAccessCleaningJob(authResult.actor, ctx, job);

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  return NextResponse.json({ job });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const authResult = await requirePortalStaffActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;
  const existing = await getCleaningJobById(id);

  if (!existing) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const ctx = await toEmployeeAccessContext(authResult.actor);
  const canAccess = await canActorAccessCleaningJob(authResult.actor, ctx, existing);

  if (!canAccess) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json()) as {
    title?: string;
    serviceType?: string;
    assignedEmployeeId?: string | null;
    scheduledDate?: string;
    dueDate?: string;
    priority?: JobPriority;
    status?: CleaningJobStatus;
    notes?: string | null;
    action?: string;
  };

  const isManager = isManagerOrAbove(authResult.actor.accessLevel);

  if (body.action) {
    return NextResponse.json(
      { error: "Use POST /api/jobs/[id]/start, /complete, or /issue." },
      { status: 400 },
    );
  }

  try {
    if (!isManager) {
      return NextResponse.json(
        { error: "Only managers can update job details." },
        { status: 403 },
      );
    }

    const job = await updateCleaningJob(id, body);
    return NextResponse.json({ job });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Unable to update job.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
