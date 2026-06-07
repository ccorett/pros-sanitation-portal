import {
  canActorAccessCleaningJob,
  getCleaningJobById,
  listCleaningJobAssignees,
} from "@/lib/cleaning-jobs-service";
import { isManagerOrAbove } from "@/lib/operational-access";
import { toEmployeeAccessContext } from "@/lib/portal-route-access";
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

  if (!isManagerOrAbove(authResult.actor.accessLevel)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
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

  const assignees = await listCleaningJobAssignees(job.clientLocation);
  return NextResponse.json({ assignees });
}
