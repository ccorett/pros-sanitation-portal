import {
  canActorAccessCleaningJob,
  canActorActOnCleaningJob,
  getCleaningJobById,
} from "@/lib/cleaning-jobs-service";
import { toEmployeeAccessContext } from "@/lib/portal-route-access";
import { requirePortalStaffActor } from "@/lib/require-portal-staff-api";
import { NextResponse } from "next/server";

export async function requireCleaningJobAccess(jobId: string) {
  const authResult = await requirePortalStaffActor();
  if ("error" in authResult) {
    return { error: authResult.error } as const;
  }

  const job = await getCleaningJobById(jobId);
  if (!job) {
    return {
      error: NextResponse.json({ error: "Job not found." }, { status: 404 }),
    } as const;
  }

  const ctx = await toEmployeeAccessContext(authResult.actor);
  const allowed = await canActorAccessCleaningJob(authResult.actor, ctx, job);

  if (!allowed) {
    return {
      error: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    } as const;
  }

  return { actor: authResult.actor, ctx, job } as const;
}

export async function requireCleaningJobAction(jobId: string) {
  const access = await requireCleaningJobAccess(jobId);
  if ("error" in access) {
    return access;
  }

  if (!canActorActOnCleaningJob(access.actor, access.job)) {
    return {
      error: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    } as const;
  }

  return access;
}
